// Vault notes (ADR-0003): YAML frontmatter between `---` lines, then a free Markdown body.
// Core has no YAML parser, so the caller injects one (tools/vault-build uses the `yaml` package).
import { type Breeder, BreederSchema } from "../schema/breeder";
import { type GeneticNode, GeneticNodeSchema } from "../schema/genetic-node";
import { fail, issuesFromZod, ok, type Result } from "./issues";

/** Parses YAML text into plain data. Throws on a syntax error (the message is reported as is). */
export type YamlParser = (text: string) => unknown;

/** The raw parts of a note. */
export interface NoteParts {
  /** The YAML between the fences, lines joined with `\n`. */
  readonly frontmatter: string;
  /** Everything after the closing fence, lines joined with `\n`. */
  readonly body: string;
  /** 1-based line number of the body's first line in the original file. */
  readonly bodyLine: number;
}

/** Any note in the vault: a genetic node (`landrace`, `strain`, `cross`) or a `breeder`. */
export type VaultNote = GeneticNode | Breeder;

export interface ParsedNote {
  readonly frontmatter: VaultNote;
  readonly body: string;
  readonly bodyLine: number;
}

/** Every `kind` a vault note can have. */
export const NOTE_KINDS = ["landrace", "strain", "cross", "breeder"] as const;

const OPEN_FENCE = /^---[ \t]*$/;
const CLOSE_FENCE = /^(?:---|\.\.\.)[ \t]*$/;

/**
 * Splits a note into frontmatter and body. The note must start with a `---` line (a leading BOM is
 * ignored) and the frontmatter ends at the next `---` or `...` line. CRLF and LF both work.
 */
export function splitFrontmatter(markdown: string): Result<NoteParts> {
  const lines = markdown.replace(/^﻿/, "").split(/\r?\n/);
  if (!OPEN_FENCE.test(lines[0] ?? "")) {
    return fail([
      { field: "frontmatter", message: "missing frontmatter: the note must start with a --- line" },
    ]);
  }
  const close = lines.findIndex((line, index) => index > 0 && CLOSE_FENCE.test(line));
  if (close === -1) {
    return fail([
      { field: "frontmatter", message: "unclosed frontmatter: no closing --- line after line 1" },
    ]);
  }
  return ok({
    frontmatter: lines.slice(1, close).join("\n"),
    body: lines.slice(close + 1).join("\n"),
    bodyLine: close + 2,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses and validates one vault note against the docs/04 schemas (`GeneticNodeSchema` or
 * `BreederSchema`, picked by `kind`). Returns the typed frontmatter and the body, or structured
 * issues naming the field. Values are never trimmed or rewritten.
 */
export function parseNote(markdown: string, parseYaml: YamlParser): Result<ParsedNote> {
  const parts = splitFrontmatter(markdown);
  if (!parts.ok) return parts;
  const { frontmatter, body, bodyLine } = parts.value;

  let data: unknown;
  try {
    data = parseYaml(frontmatter);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return fail([{ field: "frontmatter", message: `invalid YAML: ${detail}` }]);
  }
  if (!isRecord(data)) {
    return fail([
      { field: "frontmatter", message: "frontmatter must be a YAML mapping of field: value" },
    ]);
  }

  const kind = data.kind;
  if (typeof kind !== "string" || !(NOTE_KINDS as readonly string[]).includes(kind)) {
    return fail([{ field: "kind", message: `kind must be one of ${NOTE_KINDS.join(", ")}` }]);
  }

  const schema = kind === "breeder" ? BreederSchema : GeneticNodeSchema;
  const parsed = schema.safeParse(data);
  if (!parsed.success) return fail(issuesFromZod(parsed.error));
  return ok({ frontmatter: parsed.data, body, bodyLine });
}

/** The parts of a `[[Target]]` or `[[Target|Display]]` link. */
export interface Wikilink {
  /** The link target, trimmed, with a trailing `.md` removed. */
  readonly target: string;
  readonly display: string | null;
}

const WIKILINK = /^\[\[([^[\]|]+)(?:\|([^[\]]*))?\]\]$/;

/** Splits a wikilink. Returns null for anything that isn't one, or has a blank target. */
export function parseWikilink(link: string): Wikilink | null {
  const found = WIKILINK.exec(link);
  if (found === null) return null;
  const target = (found[1] ?? "").trim().replace(/\.md$/i, "").trim();
  if (target === "") return null;
  return { target, display: found[2] ?? null };
}
