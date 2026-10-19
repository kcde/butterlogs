import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  anonClient,
  createBusiness,
  createSignedInUser,
  createTestUser,
  must,
  type TestUser,
} from "./helpers";

describe("create_business", () => {
  it("creates the business, the owner and five starter overhead items", async () => {
    const user = await createSignedInUser();
    const businessId = must(await createBusiness(user.client)) as string;

    const [business] = must(await user.client.from("businesses").select("*").eq("id", businessId));
    expect(business).toMatchObject({
      name: "Test Bakery",
      currency_code: "NGN",
      default_pricing_method: "markup",
      default_pricing_percent: 50,
      default_pricing_amount_minor: null,
    });

    const members = must(await user.client.from("business_members").select("user_id, role"));
    expect(members).toEqual([{ user_id: user.userId, role: "owner" }]);

    const items = must(
      await user.client.from("overhead_items").select("name").eq("business_id", businessId).order("position"),
    );
    expect(items.map((item) => item.name)).toEqual([
      "Gas",
      "Electricity",
      "Transport",
      "Labour",
      "Packaging",
    ]);
  });

  it("refuses a second business", async () => {
    const user = await createTestUser();
    const second = await createBusiness(user.client);
    expect(second.error?.message).toMatch(/already has a business/);

    const members = must(await user.client.from("business_members").select("business_id"));
    expect(members).toEqual([{ business_id: user.businessId }]);
  });

  it("refuses when signed out", async () => {
    const result = await createBusiness(anonClient());
    expect(result.error).not.toBeNull();
  });
});

describe("record_price_history", () => {
  let user: TestUser;
  const ingredientId = randomUUID();

  async function historyCount() {
    const rows = must(
      await admin().from("ingredient_price_history").select("id").eq("ingredient_id", ingredientId),
    );
    return rows.length;
  }

  beforeAll(async () => {
    user = await createTestUser();
  });

  it("records the first price", async () => {
    must(
      await user.client.from("ingredients").insert({
        id: ingredientId,
        business_id: user.businessId,
        name: "Sugar",
        unit: "g",
        pack_price_minor: 500_000,
        pack_size: 1,
        pack_size_unit: "kg",
      }),
    );
    expect(await historyCount()).toBe(1);
  });

  it("writes one row when the price changes", async () => {
    must(await user.client.from("ingredients").update({ pack_price_minor: 600_000 }).eq("id", ingredientId));
    expect(await historyCount()).toBe(2);

    const [latest] = must(
      await admin()
        .from("ingredient_price_history")
        .select("business_id, pack_price_minor, pack_size, pack_size_unit")
        .eq("ingredient_id", ingredientId)
        .order("recorded_at", { ascending: false })
        .limit(1),
    );
    expect(latest).toEqual({
      business_id: user.businessId,
      pack_price_minor: 600_000,
      pack_size: 1,
      pack_size_unit: "kg",
    });
  });

  it("writes nothing when only the notes change", async () => {
    must(await user.client.from("ingredients").update({ notes: "Dangote" }).eq("id", ingredientId));
    expect(await historyCount()).toBe(2);
  });

  it("writes nothing when the price is saved unchanged", async () => {
    must(await user.client.from("ingredients").update({ pack_price_minor: 600_000 }).eq("id", ingredientId));
    expect(await historyCount()).toBe(2);
  });
});
