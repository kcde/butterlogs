// Units an ingredient is measured and bought in (PRD F3, §4). Each ingredient
// row stores the codes as text (`unit`, `pack_size_unit`); the list, kinds and
// conversions live only here. Conversion is within a kind: never cups ↔ grams.

export type UnitKind = "weight" | "volume" | "count";

// Codes as in the design system's `Unit` type. `toBase` is the size in the
// kind's base unit (g, ml or pcs), from PRD §4.
const UNIT_TABLE = {
  g: { kind: "weight", toBase: 1, label: "g" },
  kg: { kind: "weight", toBase: 1000, label: "kg" },
  oz: { kind: "weight", toBase: 28.3495, label: "oz" },
  lb: { kind: "weight", toBase: 453.592, label: "lb" },
  ml: { kind: "volume", toBase: 1, label: "ml" },
  l: { kind: "volume", toBase: 1000, label: "L" },
  fl_oz: { kind: "volume", toBase: 29.5735, label: "fl oz" },
  tsp: { kind: "volume", toBase: 4.929, label: "tsp" },
  tbsp: { kind: "volume", toBase: 14.787, label: "tbsp" },
  cup: { kind: "volume", toBase: 236.588, label: "cup" },
  pcs: { kind: "count", toBase: 1, label: "pcs" },
} as const satisfies Record<string, { kind: UnitKind; toBase: number; label: string }>;

export type Unit = keyof typeof UNIT_TABLE;

/** Every unit, weights first, then volumes, then pieces. */
export const UNITS = Object.keys(UNIT_TABLE) as Unit[];

/** True for a code this app knows (rows from the server are plain text). */
export function isUnit(code: string | null | undefined): code is Unit {
  return code != null && Object.hasOwn(UNIT_TABLE, code);
}

export function unitKind(unit: Unit): UnitKind {
  return UNIT_TABLE[unit].kind;
}

/** The units of one kind, in list order: what a pack-size picker may offer. */
export function unitsOfKind(kind: UnitKind): Unit[] {
  return UNITS.filter((unit) => UNIT_TABLE[unit].kind === kind);
}

/** How many of the kind's base unit (g, ml or pcs) one of this unit is: kg → 1000. */
export function baseSize(unit: Unit) {
  return UNIT_TABLE[unit].toBase;
}

/** An amount in another unit of the same kind; null across kinds. Full precision. */
export function convert(amount: number, from: Unit, to: Unit): number | null {
  if (unitKind(from) !== unitKind(to)) return null;
  return (amount * baseSize(from)) / baseSize(to);
}

/** What the screen shows: "L" for litres, "fl oz", and "pc" for exactly one piece. */
export function unitLabel(unit: Unit, amount?: number) {
  if (unit === "pcs" && amount === 1) return "pc";
  return UNIT_TABLE[unit].label;
}
