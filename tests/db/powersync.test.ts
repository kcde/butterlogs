import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PowerSyncDatabase } from "@powersync/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupabaseConnector } from "@/lib/db/connector";
import { AppSchema } from "@/lib/db/schema";
import { admin, BUSINESS_TABLES, createTestUser, must, seed, type TestUser } from "./helpers";

// The same two-business check, through the real PowerSync instance: what each
// phone downloads, and what its uploads may change. Needs the sync config in
// powersync/sync-config.yaml deployed.

type Phone = { user: TestUser; db: PowerSyncDatabase };

let folder: string;
let a: Phone;
let b: Phone;

async function openPhone(user: TestUser, name: string): Promise<Phone> {
  const db = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: `${name}.db`, dbLocation: folder },
  });
  await db.connect(new SupabaseConnector(user.client));
  await db.waitForFirstSync();
  return { user, db };
}

async function waitFor(check: () => Promise<boolean>, what: string, timeoutMs = 30_000) {
  const end = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function waitForUpload({ db }: Phone) {
  await waitFor(async () => (await db.getUploadQueueStats()).count === 0, "the upload queue to empty");
}

// Waits for a checkpoint that started after now, so the phone's copy reflects
// the server as it is now. Writing a row makes the server send one.
async function waitForFreshCheckpoint(phone: Phone) {
  const before = phone.db.currentStatus.lastSyncedAt?.getTime() ?? 0;
  await phone.db.execute(
    "INSERT INTO categories (id, business_id, name, position) VALUES (uuid(), ?, 'Checkpoint', 99)",
    [phone.user.businessId],
  );
  await waitForUpload(phone);
  await waitFor(
    async () => (phone.db.currentStatus.lastSyncedAt?.getTime() ?? 0) > before,
    "a new checkpoint",
  );
}

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), "butterlogs-powersync-"));
  const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);
  await Promise.all([seed(userA), seed(userB)]);
  [a, b] = await Promise.all([openPhone(userA, "a"), openPhone(userB, "b")]);
});

afterAll(async () => {
  await Promise.all([a?.db.disconnectAndClear(), b?.db.disconnectAndClear()]);
  await Promise.all([a?.db.close(), b?.db.close()]);
  await rm(folder, { recursive: true, force: true });
});

describe("download", () => {
  it.each(BUSINESS_TABLES)("%s: each phone holds only its own business's rows", async (table) => {
    for (const { db, user } of [a, b]) {
      const rows = await db.getAll<{ business_id: string }>(`SELECT business_id FROM ${table}`);
      // seed() writes one row per table; create_business adds five overhead items.
      expect(rows).toHaveLength(table === "overhead_items" ? 5 : 1);
      expect(rows.every((row) => row.business_id === user.businessId)).toBe(true);
    }
  });

  it("each phone holds only its own business and membership", async () => {
    for (const { db, user } of [a, b]) {
      expect(await db.getAll("SELECT id FROM businesses")).toEqual([{ id: user.businessId }]);
      expect(await db.getAll("SELECT user_id, business_id FROM business_members")).toEqual([
        { user_id: user.userId, business_id: user.businessId },
      ]);
    }
  });
});

describe("upload", () => {
  it("a change made on one phone reaches the server but not the other business", async () => {
    const id = randomUUID();
    await a.db.execute(
      "INSERT INTO ingredients (id, business_id, name, unit) VALUES (?, ?, 'Butter', 'g')",
      [id, a.user.businessId],
    );
    await waitForUpload(a);

    const onServer = must(await admin().from("ingredients").select("business_id").eq("id", id));
    expect(onServer).toEqual([{ business_id: a.user.businessId }]);

    await waitForFreshCheckpoint(b);
    expect(await b.db.getAll("SELECT id FROM ingredients WHERE id = ?", [id])).toEqual([]);
  });

  it("a write into another business is rejected and dropped, and the queue moves on", async () => {
    const id = randomUUID();
    await a.db.execute(
      "INSERT INTO ingredients (id, business_id, name, unit) VALUES (?, ?, 'Intruder', 'g')",
      [id, b.user.businessId],
    );
    await waitForUpload(a);

    expect(must(await admin().from("ingredients").select("id").eq("id", id))).toEqual([]);

    // The phone falls back to the server's copy, so the rejected row disappears.
    await waitForFreshCheckpoint(a);
    expect(await a.db.getAll("SELECT id FROM ingredients WHERE id = ?", [id])).toEqual([]);
  });
});
