import { column, Schema, Table } from "@powersync/web";

// Client copy of the synced tables (PRD §6). `id` is implicit.
// Types: uuid/text/timestamptz → text, bigint → integer, double precision → real.
// ingredient_price_history is server only and not here.

const businesses = new Table({
  name: column.text,
  currency_code: column.text,
  default_pricing_method: column.text,
  default_pricing_percent: column.real,
  default_pricing_amount_minor: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const business_members = new Table({
  business_id: column.text,
  user_id: column.text,
  role: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const categories = new Table({
  business_id: column.text,
  name: column.text,
  position: column.real,
  created_at: column.text,
  updated_at: column.text,
});

const overhead_items = new Table({
  business_id: column.text,
  name: column.text,
  position: column.real,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const ingredients = new Table({
  business_id: column.text,
  name: column.text,
  unit: column.text,
  pack_price_minor: column.integer,
  pack_size: column.real,
  pack_size_unit: column.text,
  notes: column.text,
  price_updated_at: column.text,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const recipes = new Table({
  business_id: column.text,
  name: column.text,
  category_id: column.text,
  notes: column.text,
  yield_type: column.text,
  yield_weight_g: column.real,
  yield_count: column.real,
  pricing_method: column.text,
  pricing_percent: column.real,
  pricing_amount_minor: column.integer,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const recipe_sections = new Table({
  business_id: column.text,
  recipe_id: column.text,
  name: column.text,
  position: column.real,
  created_at: column.text,
  updated_at: column.text,
});

const recipe_lines = new Table({
  business_id: column.text,
  recipe_id: column.text,
  section_id: column.text,
  position: column.real,
  ingredient_id: column.text,
  sub_recipe_id: column.text,
  amount: column.real,
  created_at: column.text,
  updated_at: column.text,
});

const recipe_overhead_lines = new Table({
  business_id: column.text,
  recipe_id: column.text,
  overhead_item_id: column.text,
  amount_minor: column.integer,
  position: column.real,
  created_at: column.text,
  updated_at: column.text,
});

export const AppSchema = new Schema({
  businesses,
  business_members,
  categories,
  overhead_items,
  ingredients,
  recipes,
  recipe_sections,
  recipe_lines,
  recipe_overhead_lines,
});

export type Database = (typeof AppSchema)["types"];
export type Business = Database["businesses"];
export type BusinessMember = Database["business_members"];
export type Category = Database["categories"];
export type OverheadItem = Database["overhead_items"];
export type Ingredient = Database["ingredients"];
export type Recipe = Database["recipes"];
export type RecipeSection = Database["recipe_sections"];
export type RecipeLine = Database["recipe_lines"];
export type RecipeOverheadLine = Database["recipe_overhead_lines"];
