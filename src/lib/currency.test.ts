import { afterEach, describe, expect, it, vi } from "vitest";
import { currencyOptions, currencySymbol, likelyCurrency, phoneLocale } from "./currency";

describe("likelyCurrency", () => {
  it.each([
    ["Africa/Lagos", "NGN"],
    ["Europe/London", "GBP"],
    ["Europe/Jersey", "GBP"],
    ["America/New_York", "USD"],
    ["America/Indiana/Indianapolis", "USD"],
    ["Pacific/Honolulu", "USD"],
    ["US/Eastern", "USD"],
    ["Europe/Paris", "EUR"],
    ["Europe/Dublin", "EUR"],
    ["Atlantic/Canary", "EUR"],
  ])("time zone %s → %s", (timeZone, currency) => {
    expect(likelyCurrency({ timeZone, language: "en-US" })).toBe(currency);
  });

  it("falls back to the language's region when the time zone says nothing", () => {
    expect(likelyCurrency({ timeZone: "Asia/Tokyo", language: "en-GB" })).toBe("GBP");
    expect(likelyCurrency({ timeZone: "UTC", language: "en-NG" })).toBe("NGN");
    expect(likelyCurrency({ timeZone: "UTC", language: "en-US" })).toBe("USD");
    expect(likelyCurrency({ language: "de-DE" })).toBe("EUR");
  });

  it("doesn't treat Canada or Mexico as the US", () => {
    expect(likelyCurrency({ timeZone: "America/Toronto", language: "en" })).toBe("NGN");
    expect(likelyCurrency({ timeZone: "America/Mexico_City" })).toBe("NGN");
  });

  it("starts on Naira otherwise", () => {
    expect(likelyCurrency({})).toBe("NGN");
    expect(likelyCurrency({ timeZone: "Asia/Tokyo", language: "ja-JP" })).toBe("NGN");
    expect(likelyCurrency({ language: "en" })).toBe("NGN");
    expect(likelyCurrency({ language: "not a language" })).toBe("NGN");
  });
});

describe("currencyOptions", () => {
  it("puts the likely currency first and keeps the rest in order", () => {
    expect(currencyOptions("GBP")).toEqual([
      { value: "GBP", label: "British Pound (£)" },
      { value: "NGN", label: "Nigerian Naira (₦)" },
      { value: "USD", label: "US Dollar ($)" },
      { value: "EUR", label: "Euro (€)" },
    ]);
    expect(currencyOptions("NGN").map((option) => option.value)).toEqual(["NGN", "USD", "GBP", "EUR"]);
  });
});

describe("currencySymbol", () => {
  it("returns each currency's symbol", () => {
    expect(["NGN", "USD", "GBP", "EUR"].map((code) => currencySymbol(code as never))).toEqual([
      "₦",
      "$",
      "£",
      "€",
    ]);
  });
});

describe("phoneLocale", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the phone's time zone and language", () => {
    vi.stubGlobal("navigator", { language: "en-NG" });
    expect(phoneLocale()).toEqual({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: "en-NG",
    });
  });

  it("has no language outside a browser", () => {
    vi.stubGlobal("navigator", undefined);
    expect(phoneLocale().language).toBeUndefined();
  });
});
