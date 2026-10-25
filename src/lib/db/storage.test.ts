import { afterEach, describe, expect, it, vi } from "vitest";
import { opfsAvailable, openPreferringOpfs, type PhoneStorage } from "./storage";

function phoneWithOpfs(getDirectory: () => Promise<unknown>) {
  vi.stubGlobal("navigator", { storage: { getDirectory } });
}

// A stand-in database that records what happened to it.
function fakeDatabases({ failOpfs = false } = {}) {
  const made: { storage: PhoneStorage; closed: boolean }[] = [];
  return {
    made,
    create: (storage: PhoneStorage) => {
      const db = { storage, closed: false };
      made.push(db);
      return db;
    },
    init: async (db: { storage: PhoneStorage }) => {
      if (failOpfs && db.storage === "opfs") throw new Error("no sync access handles");
    },
    close: async (db: { closed: boolean }) => {
      db.closed = true;
    },
  };
}

describe("opfsAvailable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is true when the page can open OPFS", async () => {
    phoneWithOpfs(async () => ({}));
    expect(await opfsAvailable()).toBe(true);
  });

  it("is false when OPFS refuses (Safari private browsing, Playwright's WebKit)", async () => {
    phoneWithOpfs(async () => {
      throw new DOMException("The operation failed for an unknown transient reason", "UnknownError");
    });
    expect(await opfsAvailable()).toBe(false);
  });

  it("is false when the browser has no OPFS at all", async () => {
    vi.stubGlobal("navigator", {});
    expect(await opfsAvailable()).toBe(false);
  });
});

describe("openPreferringOpfs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses OPFS when it's available", async () => {
    phoneWithOpfs(async () => ({}));
    const dbs = fakeDatabases();
    const onFallback = vi.fn();
    const { db, storage } = await openPreferringOpfs({ ...dbs, onFallback });
    expect(storage).toBe("opfs");
    expect(db).toBe(dbs.made[0]);
    expect(dbs.made).toEqual([{ storage: "opfs", closed: false }]);
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("goes straight to IndexedDB when OPFS isn't available, without trying it", async () => {
    phoneWithOpfs(async () => {
      throw new Error("refused");
    });
    const dbs = fakeDatabases();
    const onFallback = vi.fn();
    const { storage } = await openPreferringOpfs({ ...dbs, onFallback });
    expect(storage).toBe("indexeddb");
    expect(dbs.made).toEqual([{ storage: "indexeddb", closed: false }]);
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("closes a failed OPFS open, reports it, and uses IndexedDB", async () => {
    phoneWithOpfs(async () => ({}));
    const dbs = fakeDatabases({ failOpfs: true });
    const onFallback = vi.fn();
    const { db, storage } = await openPreferringOpfs({ ...dbs, onFallback });
    expect(storage).toBe("indexeddb");
    expect(db).toBe(dbs.made[1]);
    expect(dbs.made).toEqual([
      { storage: "opfs", closed: true },
      { storage: "indexeddb", closed: false },
    ]);
    expect(onFallback).toHaveBeenCalledWith(new Error("no sync access handles"));
  });

  it("still uses IndexedDB if closing the failed OPFS attempt fails too", async () => {
    phoneWithOpfs(async () => ({}));
    const dbs = fakeDatabases({ failOpfs: true });
    const { storage } = await openPreferringOpfs({
      ...dbs,
      close: async () => {
        throw new Error("already gone");
      },
      onFallback: () => {},
    });
    expect(storage).toBe("indexeddb");
  });
});
