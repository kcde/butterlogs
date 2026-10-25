"use client";

import { createContext, useContext } from "react";
import type { BusinessRow } from "@/lib/db/useBusiness";

export const BusinessContext = createContext<BusinessRow | null>(null);

/** Her business. Only inside the tabs layout, which waits for it. */
export function useCurrentBusiness() {
  const business = useContext(BusinessContext);
  if (!business) throw new Error("useCurrentBusiness needs the tabs layout");
  return business;
}
