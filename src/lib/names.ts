// Names she gives things are unique among the non-deleted ones, ignoring
// capitals (PRD §10): ingredients, recipes, categories and overhead items.
// Checked in the app, never by the server (PRD §6 rule 3).

const key = (name: string) => name.trim().toLocaleLowerCase("en");

/**
 * The existing item with this name, ignoring capitals and spaces at either
 * end, among the (non-deleted) ones given, leaving out the one being edited.
 * Done here, not in SQL: SQLite's lower() only folds ASCII.
 */
export function nameTaken<T extends { id: string; name: string | null }>(name: string, others: readonly T[], selfId?: string) {
  const wanted = key(name);
  return others.find((other) => other.id !== selfId && key(other.name ?? "") === wanted) ?? null;
}
