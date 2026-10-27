// YAML parsing lives in the tool, not in core (core stays dependency-light and pure; ADR-0002).
import type { YamlParser } from "@flowerscan/core";
import { parseDocument } from "yaml";

/**
 * Strict YAML 1.2 (core schema): dates like `2026-10-26` stay strings, `yes`/`no` are not booleans,
 * duplicate keys and parser warnings are errors. Throws a one-line message with the line and column,
 * shifted by `lineOffset` (a note's frontmatter starts on line 2 of the file).
 */
export function createYamlParser(lineOffset = 0): YamlParser {
  return (text) => {
    const document = parseDocument(text, { version: "1.2", schema: "core", uniqueKeys: true });
    const [problem] = [...document.errors, ...document.warnings];
    if (problem === undefined) return document.toJS();
    const summary = (problem.message.split("\n")[0] ?? "").replace(
      / at line \d+, column \d+:?$/,
      "",
    );
    const at = problem.linePos?.[0];
    throw new Error(
      at === undefined ? summary : `${summary} (line ${at.line + lineOffset}, column ${at.col})`,
    );
  };
}

/** For whole YAML files (taxonomy.yaml, banned.yaml). */
export const parseYaml: YamlParser = createYamlParser();

/** For note frontmatter: line numbers point into the note file. */
export const parseFrontmatterYaml: YamlParser = createYamlParser(1);
