import { randomUUID } from "node:crypto";
import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";

// Throwaway users on the live project. global-setup.ts removes every user with
// this prefix (and their business) before and after each run.
const EMAIL_PREFIX = "butterlogs-test+";

const NO_SESSION_STORAGE = { auth: { persistSession: false, autoRefreshToken: false } };

export const BUSINESS_TABLES = [
  "categories",
  "overhead_items",
  "ingredients",
  "recipes",
  "recipe_sections",
  "recipe_lines",
  "recipe_overhead_lines",
] as const;
export type BusinessTable = (typeof BUSINESS_TABLES)[number];

export type TestUser = { client: SupabaseClient; userId: string; email: string; businessId: string };

// One row id per business table, from seed().
export type Seed = Record<BusinessTable, string>;

let adminClient: SupabaseClient | null = null;

// Bypasses RLS. Only for setting up, checking and cleaning up.
export function admin() {
  adminClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    NO_SESSION_STORAGE,
  );
  return adminClient;
}

export function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    NO_SESSION_STORAGE,
  );
}

// Throws on a Supabase error so setup steps fail loudly.
export function must<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data as T;
}

/** A throwaway address that removeTestUsers() cleans up. */
export function testEmail() {
  return `${EMAIL_PREFIX}${randomUUID()}@example.com`;
}

// A signed-in user with no business yet.
export async function createSignedInUser(): Promise<Omit<TestUser, "businessId">> {
  const email = testEmail();
  const password = randomUUID();
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  const client = anonClient();
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { client, userId: data.user.id, email };
}

export function createBusiness(client: SupabaseClient) {
  return client.rpc("create_business", {
    p_name: "Test Bakery",
    p_currency_code: "NGN",
    p_pricing_method: "markup",
    p_pricing_percent: 50,
    p_pricing_amount_minor: null,
  });
}

// A signed-in user with their own business (and its five overhead items).
export async function createTestUser(): Promise<TestUser> {
  const user = await createSignedInUser();
  const businessId = must(await createBusiness(user.client)) as string;
  return { ...user, businessId };
}

// One row in every business table, written as the user (so through RLS).
export async function seed({ client, businessId }: TestUser): Promise<Seed> {
  const ids = {
    categories: randomUUID(),
    ingredients: randomUUID(),
    recipes: randomUUID(),
    recipe_sections: randomUUID(),
    recipe_lines: randomUUID(),
    recipe_overhead_lines: randomUUID(),
  };
  const business_id = businessId;

  const [overhead] = must(
    await client.from("overhead_items").select("id").eq("business_id", businessId).limit(1),
  );
  must(await client.from("categories").insert({ id: ids.categories, business_id, name: "Cakes", position: 1 }));
  must(
    await client.from("ingredients").insert({
      id: ids.ingredients,
      business_id,
      name: "Flour",
      unit: "g",
      pack_price_minor: 1_500_000,
      pack_size: 12.5,
      pack_size_unit: "kg",
    }),
  );
  must(
    await client.from("recipes").insert({
      id: ids.recipes,
      business_id,
      name: "Vanilla Cake",
      category_id: ids.categories,
      yield_type: "weight",
      yield_weight_g: 1500,
    }),
  );
  must(
    await client
      .from("recipe_sections")
      .insert({ id: ids.recipe_sections, business_id, recipe_id: ids.recipes, position: 1 }),
  );
  must(
    await client.from("recipe_lines").insert({
      id: ids.recipe_lines,
      business_id,
      recipe_id: ids.recipes,
      section_id: ids.recipe_sections,
      position: 1,
      ingredient_id: ids.ingredients,
      amount: 500,
    }),
  );
  must(
    await client.from("recipe_overhead_lines").insert({
      id: ids.recipe_overhead_lines,
      business_id,
      recipe_id: ids.recipes,
      overhead_item_id: overhead.id,
      amount_minor: 100_000,
      position: 1,
    }),
  );
  return { ...ids, overhead_items: overhead.id };
}

// Deletes every test user and everything in their businesses, children first.
export async function removeTestUsers() {
  const userIds: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    userIds.push(
      ...data.users.filter((user) => user.email?.startsWith(EMAIL_PREFIX)).map((user) => user.id),
    );
    if (data.users.length < 1000) break;
  }
  if (userIds.length === 0) return;

  const members = must(
    await admin().from("business_members").select("business_id").in("user_id", userIds),
  );
  const businessIds = members.map((member) => member.business_id as string);
  if (businessIds.length > 0) {
    // Price history goes with its ingredients (ON DELETE CASCADE).
    for (const table of [
      "recipe_lines",
      "recipe_overhead_lines",
      "recipe_sections",
      "recipes",
      "ingredients",
      "overhead_items",
      "categories",
      "business_members",
    ]) {
      must(await admin().from(table).delete().in("business_id", businessIds));
    }
    must(await admin().from("businesses").delete().in("id", businessIds));
  }
  for (const id of userIds) {
    const { error } = await admin().auth.admin.deleteUser(id);
    if (error) throw error;
  }
}
