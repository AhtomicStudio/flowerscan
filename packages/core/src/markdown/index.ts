// Public API of the markdown module (vault notes). Re-exported from the package entry.
export { type Result, ROOT_FIELD, type ValidationIssue } from "./issues";
export {
  NOTE_KINDS,
  type NoteParts,
  type ParsedNote,
  parseNote,
  parseWikilink,
  splitFrontmatter,
  type VaultNote,
  type Wikilink,
  type YamlParser,
} from "./note";
