import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingSignIn,
  readPendingSignIn,
  resendWaitSeconds,
  savePendingSignIn,
} from "./pending-sign-in";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

const NOW = 1_800_000_000_000;

describe("pending sign-in", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and reads back a sign-up, with the name", () => {
    expect(savePendingSignIn({ email: "ada@example.com", intent: "signup", name: "Ada" }, NOW)).toEqual({
      email: "ada@example.com",
      intent: "signup",
      name: "Ada",
      sentAt: NOW,
    });
    expect(readPendingSignIn(NOW + 1000)).toEqual({
      email: "ada@example.com",
      intent: "signup",
      name: "Ada",
      sentAt: NOW,
    });
  });

  it("reads a log in without a name", () => {
    savePendingSignIn({ email: "ada@example.com", intent: "login" }, NOW);
    expect(readPendingSignIn(NOW)).toEqual({ email: "ada@example.com", intent: "login", sentAt: NOW });
  });

  it("stamps the time it was sent", () => {
    const before = Date.now();
    const saved = savePendingSignIn({ email: "ada@example.com", intent: "login" });
    expect(saved.sentAt).toBeGreaterThanOrEqual(before);
    expect(readPendingSignIn(saved.sentAt)).toEqual(saved);
  });

  it("forgets it once the code has expired (1 hour)", () => {
    savePendingSignIn({ email: "ada@example.com", intent: "login" }, NOW);
    expect(readPendingSignIn(NOW + 60 * 60 * 1000)).not.toBeNull();
    expect(readPendingSignIn(NOW + 60 * 60 * 1000 + 1)).toBeNull();
  });

  it("is gone after clearing", () => {
    savePendingSignIn({ email: "ada@example.com", intent: "login" }, NOW);
    clearPendingSignIn();
    expect(readPendingSignIn(NOW)).toBeNull();
  });

  it("ignores missing, broken or odd data", () => {
    expect(readPendingSignIn(NOW)).toBeNull();
    localStorage.setItem("butterlogs.pendingSignIn", "{not json");
    expect(readPendingSignIn(NOW)).toBeNull();
    localStorage.setItem("butterlogs.pendingSignIn", JSON.stringify({ email: "a@b.c", intent: "other", sentAt: NOW }));
    expect(readPendingSignIn(NOW)).toBeNull();
    localStorage.setItem("butterlogs.pendingSignIn", JSON.stringify({ email: "a@b.c", intent: "login" }));
    expect(readPendingSignIn(NOW)).toBeNull();
    localStorage.setItem("butterlogs.pendingSignIn", "null");
    expect(readPendingSignIn(NOW)).toBeNull();
  });

  it("does nothing when storage is unavailable or full", () => {
    vi.stubGlobal("localStorage", undefined);
    savePendingSignIn({ email: "ada@example.com", intent: "login" }, NOW);
    clearPendingSignIn();
    expect(readPendingSignIn(NOW)).toBeNull();

    const throwing = memoryStorage();
    throwing.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    throwing.removeItem = () => {
      throw new Error("SecurityError");
    };
    vi.stubGlobal("localStorage", throwing);
    expect(() => savePendingSignIn({ email: "a@b.c", intent: "login" })).not.toThrow();
    expect(() => clearPendingSignIn()).not.toThrow();
  });

  it("treats blocked storage as no storage", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError");
      },
    });
    expect(readPendingSignIn(NOW)).toBeNull();
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });
});

describe("resendWaitSeconds", () => {
  it("counts down the minute before a new code can be sent", () => {
    expect(resendWaitSeconds(NOW, NOW)).toBe(60);
    expect(resendWaitSeconds(NOW, NOW + 59_001)).toBe(1);
    expect(resendWaitSeconds(NOW, NOW + 60_000)).toBe(0);
    expect(resendWaitSeconds(NOW, NOW + 120_000)).toBe(0);
  });
});
