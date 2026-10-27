// Searching and ordering lists by name (SearchField README: by name, ignoring
// capitals and accents).

function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .trim();
}

/** True when the name contains what she typed, ignoring capitals and accents. An empty search matches everything. */
export function matchesName(name: string, query: string) {
  return fold(name).includes(fold(query));
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/** A to Z by name, ignoring capitals and accents (agreed 25 Oct). */
export function sortByName<T extends { name: string | null }>(items: readonly T[]): T[] {
  const name = (item: T) => item.name ?? "";
  return [...items].sort((a, b) => collator.compare(name(a), name(b)));
}
