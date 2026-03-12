import type { Currency } from "@/types";

export function currencySymbol(currency?: Currency): string {
  switch (currency) {
    case "USD":
      return "$";
    case "EUR":
    default:
      return "\u20AC";
  }
}
