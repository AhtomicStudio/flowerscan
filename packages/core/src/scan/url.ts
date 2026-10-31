// A small http(s) URL reader. Core has no `URL` global (no DOM or Node lib, ADR-0002), and QR
// payloads only need scheme, host, port and path.

export interface ParsedUrl {
  readonly scheme: "http" | "https";
  /** Lowercase host name, without port or credentials. */
  readonly hostname: string;
  /** `hostname`, plus `:port` when it isn't the scheme's default. */
  readonly host: string;
  /** Path segments, percent-decoded where possible, empty segments dropped. */
  readonly segments: readonly string[];
  /** Raw query string without `?` (empty when none). */
  readonly query: string;
}

const URL_SHAPE = /^(https?):\/\/([^/?#\s]*)([^?#\s]*)(?:\?([^#\s]*))?(?:#\S*)?$/iu;
const HOST_SHAPE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/u;
const DEFAULT_PORTS = { http: "80", https: "443" } as const;

/** Parses an absolute http(s) URL (`www.` without a scheme reads as https). Null when malformed. */
export function parseHttpUrl(input: string): ParsedUrl | null {
  const text = /^www\./iu.test(input) ? `https://${input}` : input;
  const match = URL_SHAPE.exec(text);
  if (match === null) return null;
  const scheme = (match[1] ?? "").toLowerCase() === "https" ? "https" : "http";
  const authority = (match[2] ?? "").replace(/^[^@]*@/u, "");
  const hostPort = /^([^:]*)(?::(\d*))?$/u.exec(authority);
  const hostname = (hostPort?.[1] ?? "").toLowerCase().replace(/\.$/u, "");
  if (!HOST_SHAPE.test(hostname)) return null;
  const port = hostPort?.[2] ?? "";
  const host = port === "" || port === DEFAULT_PORTS[scheme] ? hostname : `${hostname}:${port}`;
  const segments = (match[3] ?? "")
    .split("/")
    .filter((segment) => segment !== "")
    .map(decodeSegment);
  return { scheme, hostname, host, segments, query: match[4] ?? "" };
}

/** The `host` (with non-default port) of an origin such as `https://localhost:4173`. */
export function originHost(origin: string): string | null {
  return parseHttpUrl(origin)?.host ?? null;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
