// The currencies a business can choose at setup (PRD F1). Changing currency
// changes how amounts are shown; amounts are never converted.

export const CURRENCIES = [
  { code: "NGN", label: "Nigerian Naira (₦)", symbol: "₦" },
  { code: "USD", label: "US Dollar ($)", symbol: "$" },
  { code: "GBP", label: "British Pound (£)", symbol: "£" },
  { code: "EUR", label: "Euro (€)", symbol: "€" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function currencySymbol(code: CurrencyCode) {
  return CURRENCIES.find((currency) => currency.code === code)!.symbol;
}

// Eurozone countries (and the small states that use the euro).
const EURO_REGIONS = new Set([
  "AD", "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU",
  "LV", "MC", "ME", "MT", "NL", "PT", "SI", "SK", "SM", "VA",
]);

const EURO_TIME_ZONES = new Set([
  "Africa/Ceuta", "Asia/Nicosia", "Atlantic/Azores", "Atlantic/Canary", "Atlantic/Madeira",
  "Europe/Amsterdam", "Europe/Andorra", "Europe/Athens", "Europe/Berlin", "Europe/Bratislava",
  "Europe/Brussels", "Europe/Busingen", "Europe/Dublin", "Europe/Helsinki", "Europe/Lisbon",
  "Europe/Ljubljana", "Europe/Luxembourg", "Europe/Madrid", "Europe/Malta", "Europe/Monaco",
  "Europe/Nicosia", "Europe/Paris", "Europe/Podgorica", "Europe/Riga", "Europe/Rome",
  "Europe/San_Marino", "Europe/Tallinn", "Europe/Vatican", "Europe/Vienna", "Europe/Vilnius",
  "Europe/Zagreb",
]);

const UK_TIME_ZONES = new Set([
  "Europe/London", "Europe/Belfast", "Europe/Guernsey", "Europe/Isle_of_Man", "Europe/Jersey",
]);

const US_TIME_ZONE = new RegExp(
  "^(US/|Pacific/Honolulu$|America/(New_York|Detroit|Kentucky/|Indiana/|Chicago|Menominee|" +
    "North_Dakota/|Denver|Boise|Phoenix|Los_Angeles|Anchorage|Juneau|Sitka|Metlakatla|Yakutat|Nome|Adak))",
);

function fromTimeZone(timeZone: string): CurrencyCode | null {
  if (timeZone === "Africa/Lagos") return "NGN";
  if (UK_TIME_ZONES.has(timeZone)) return "GBP";
  if (EURO_TIME_ZONES.has(timeZone)) return "EUR";
  if (US_TIME_ZONE.test(timeZone)) return "USD";
  return null;
}

function fromRegion(region: string): CurrencyCode | null {
  if (region === "NG") return "NGN";
  if (region === "GB") return "GBP";
  if (region === "US") return "USD";
  if (EURO_REGIONS.has(region)) return "EUR";
  return null;
}

/**
 * The phone's likely currency: from its time zone first (iPhones report it
 * reliably), then the region in its language setting ("en-GB"), otherwise Naira.
 */
export function likelyCurrency(phone: { timeZone?: string; language?: string }): CurrencyCode {
  const byTimeZone = phone.timeZone ? fromTimeZone(phone.timeZone) : null;
  if (byTimeZone) return byTimeZone;

  let region: string | undefined;
  try {
    region = phone.language ? new Intl.Locale(phone.language).region : undefined;
  } catch {
    // Not a valid language tag.
  }
  return (region && fromRegion(region)) || "NGN";
}

/** This phone's time zone and language, for likelyCurrency(). */
export function phoneLocale() {
  return {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: typeof navigator === "undefined" ? undefined : navigator.language,
  };
}

/** The Setup list, with the likely currency first. */
export function currencyOptions(first: CurrencyCode) {
  const ordered = [...CURRENCIES].sort((a, b) => Number(b.code === first) - Number(a.code === first));
  return ordered.map(({ code, label }) => ({ value: code, label }));
}
