import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  BUSINESS_TABLES,
  createTestUser,
  must,
  seed,
  type Seed,
  type TestUser,
} from "./helpers";

// PRD §6 Row Level Security, with two businesses.
let a: TestUser;
let b: TestUser;
let seedB: Seed;

beforeAll(async () => {
  [a, b] = await Promise.all([createTestUser(), createTestUser()]);
  [, seedB] = await Promise.all([seed(a), seed(b)]);
});

describe.each(BUSINESS_TABLES)("%s", (table) => {
  it("each user sees only their own business's rows", async () => {
    for (const user of [a, b]) {
      const rows = must(await user.client.from(table).select("business_id"));
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.business_id === user.businessId)).toBe(true);
    }
  });

  it("can't update or delete another business's rows", async () => {
    const id = seedB[table];
    const updated = must(
      await a.client.from(table).update({ updated_at: new Date().toISOString() }).eq("id", id).select(),
    );
    expect(updated).toEqual([]);
    const deleted = must(await a.client.from(table).delete().eq("id", id).select());
    expect(deleted).toEqual([]);

    const stillThere = must(await admin().from(table).select("id").eq("id", id));
    expect(stillThere).toHaveLength(1);
  });

  it("can't insert a row into another business", async () => {
    // A copy of B's row, so every reference is valid inside B's business.
    const [row] = must(await admin().from(table).select("*").eq("id", seedB[table]));
    const result = await a.client.from(table).insert({ ...row, id: randomUUID() });
    expect(result.error?.code).toBe("42501");
  });
});

describe("businesses", () => {
  it("each user sees only their own business", async () => {
    for (const user of [a, b]) {
      const rows = must(await user.client.from("businesses").select("id"));
      expect(rows).toEqual([{ id: user.businessId }]);
    }
  });

  it("can update their own business but not another", async () => {
    const own = must(
      await a.client.from("businesses").update({ name: "Renamed" }).eq("id", a.businessId).select("id"),
    );
    expect(own).toHaveLength(1);
    const other = must(
      await a.client.from("businesses").update({ name: "Taken" }).eq("id", b.businessId).select("id"),
    );
    expect(other).toEqual([]);
  });

  it("can't be inserted or deleted from the app", async () => {
    const inserted = await a.client
      .from("businesses")
      .insert({ id: randomUUID(), name: "Second", currency_code: "NGN" });
    expect(inserted.error?.code).toBe("42501");
    const deleted = await a.client.from("businesses").delete().eq("id", a.businessId);
    expect(deleted.error?.code).toBe("42501");
  });
});

describe("business_members", () => {
  it("each user sees only their own membership", async () => {
    const rows = must(await a.client.from("business_members").select("user_id, business_id, role"));
    expect(rows).toEqual([{ user_id: a.userId, business_id: a.businessId, role: "owner" }]);
  });

  it("can't be written from the app", async () => {
    const result = await a.client
      .from("business_members")
      .insert({ business_id: b.businessId, user_id: a.userId });
    expect(result.error?.code).toBe("42501");
  });
});

describe("ingredient_price_history", () => {
  it("can't be read from the app", async () => {
    const result = await a.client.from("ingredient_price_history").select("id");
    expect(result.error?.code).toBe("42501");
  });
});
