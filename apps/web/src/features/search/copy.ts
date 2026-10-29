// Search screen strings (docs/design/screens/search.md). "Request it" is cut from the MVP (D9).

export const SEARCH_COPY = {
  title: "Look up a strain",
  label: "Search strains",
  placeholder: "Search strains",
  clear: "Clear search",
  about: "About",
  tip: "Try a nickname or how it's spelled on the package.",
  count: (n: number) => (n === 1 ? "1 result" : `${n} results`),
  aliasPrefix: "Also called",
  landrace: "Landrace",
  noMatchTitle: "We don't have that strain yet.",
  noMatchBody: (query: string) =>
    `Nothing matches “${query}”. Check the spelling, or try fewer words.`,
  noResultsAnnounce: "No results",
} as const;

/** Search shows the top results from the matcher (docs/design/screens/search.md). */
export const SEARCH_LIMIT = 20;
