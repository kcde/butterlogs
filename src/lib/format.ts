// Display formatting (PRD §4). Rounding happens only here; the maths keeps
// full precision. Components receive the formatted text.

import type { CurrencyCode } from "./currency";

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
