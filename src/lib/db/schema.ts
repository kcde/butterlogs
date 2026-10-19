import { column, Schema, Table } from "@powersync/web";

// M1 spike schema. M2 replaces it with the full data model (PRD §6).
// Types: uuid/text/timestamptz → text, bigint → integer, double precision → real.
const ingredients = new Table({
  owner_id: column.text,
  name: column.text,
  unit: column.text,
  pack_price_minor: column.integer,
  pack_size: column.real,
  pack_size_unit: column.text,
  created_at: column.text,
});

export const AppSchema = new Schema({ ingredients });

export type Database = (typeof AppSchema)["types"];
export type Ingredient = Database["ingredients"];
