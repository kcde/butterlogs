// Display formatting (PRD §4). Rounding happens only here; the maths keeps
// full precision. Components receive the formatted text.

import type { CurrencyCode } from "./currency";
import { type Unit, unitLabel } from "./units";

const moneyFormats = new Map<CurrencyCode, Intl.NumberFormat>();

/** Money in whole units of the business currency: 1500000 (minor units) → "₦15,000". */
export function formatMoney(minor: number, currency: CurrencyCode) {
  let format = moneyFormats.get(currency);
  if (!format) {
    format = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      // "₦", "$", "£", "€" rather than "NGN".
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      // Never "-₦0".
      signDisplay: "negative",
    });
    moneyFormats.set(currency, format);
  }
  return format.format(minor / 100);
}

const unitCostFormats = new Map<string, Intl.NumberFormat>();

function unitCostFormat(currency: CurrencyCode, decimals: 0 | 2) {
  const key = `${currency}:${decimals}`;
  let format = unitCostFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      signDisplay: "negative",
    });
    unitCostFormats.set(key, format);
  }
  return format;
}

/**
 * Cost per unit, 2 decimals, but a whole amount drops ".00" (agreed 25 Oct):
 * 120 → "₦1.20 / g", 4000 → "₦40 / g", 30000 per pc → "₦300 / pc". `per` gives
 * the ingredient sheet's "₦1.20 per g". A missing cost is never passed here.
 */
export function formatUnitCost(minorPerUnit: number, currency: CurrencyCode, unit: Unit, joiner: "/" | "per" = "/") {
  const minor = Math.round(minorPerUnit);
  const money = unitCostFormat(currency, minor % 100 === 0 ? 0 : 2).format(minor / 100);
  return `${money} ${joiner} ${unitLabel(unit, 1)}`;
}

/**
 * A recipe's cost per gram or per piece (Main.dc.html): "₦6.86/g" (2 decimals,
 * a whole amount drops ".00"), or "₦899 each" in whole money.
 */
export function formatRecipeUnitCost(minor: number, currency: CurrencyCode, per: "g" | "each") {
  if (per === "each") return `${formatMoney(minor, currency)} each`;
  const rounded = Math.round(minor);
  return `${unitCostFormat(currency, rounded % 100 === 0 ? 0 : 2).format(rounded / 100)}/g`;
}

const wholeFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const twoDecimalsFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

/**
 * A recipe amount (PRD §4): 10 or more → whole ("833 g", "1,500 g"); under 10
 * → up to 2 decimals ("2.67 g"); pieces always up to 2 ("1.6 pcs", "24 pcs").
 */
export function formatAmount(amount: number, unit: Unit) {
  const whole = unit !== "pcs" && Math.abs(amount) >= 10;
  const rounded = whole ? Math.round(amount) : Math.round(amount * 100) / 100;
  return `${(whole ? wholeFormat : twoDecimalsFormat).format(rounded)} ${unitLabel(unit, rounded)}`;
}

const packSizeFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

/** A pack size as she typed it, up to 2 decimals, with its unit: "12.5 kg", "1,000 g", "1 pc", "1 L". */
export function formatPackSize(size: number, unit: Unit) {
  const rounded = Math.round(size * 100) / 100;
  return `${packSizeFormat.format(rounded)} ${unitLabel(unit, rounded)}`;
}

const inputNumberFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 6 });

/** A stored number as it goes back into a field: 15000 → "15,000", 12.5 → "12.5". */
export function formatInputNumber(value: number) {
  return inputNumberFormat.format(value);
}

/**
 * A timestamp from the phone's database. PowerSync sends timestamptz as text
 * with a space ("2026-10-25 17:30:32.123Z"), which Safari's Date won't parse.
 */
export function parseTimestamp(text: string): Date | null {
  const iso = text.trim().replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00");
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"} ago`;

/** How long ago, in calendar days on this phone: "today", "yesterday", "3 days ago", "2 weeks ago", "1 month ago", "1 year ago". */
export function formatUpdated(timestamp: string, now: Date) {
  const then = parseTimestamp(timestamp);
  if (!then) return null;
  const days = Math.round((startOfDay(now) - startOfDay(then)) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return plural(days, "day");
  if (days < 30) return plural(Math.floor(days / 7), "week");
  if (days < 365) return plural(Math.floor(days / 30), "month");
  return plural(Math.floor(days / 365), "year");
}
