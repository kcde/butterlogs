"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import { type BusinessRow, useBusiness } from "@/lib/db/useBusiness";
import { useUser } from "./user";

export const BusinessContext = createContext<BusinessRow | null>(null);

/** Her business. Only inside a BusinessGate, which waits for it. */
export function useCurrentBusiness() {
  const business = useContext(BusinessContext);
  if (!business) throw new Error("useCurrentBusiness needs a BusinessGate");
  return business;
}

/**
 * Screens that need her business (the tabs and the new-recipe flow): blank
 * until the phone knows, and Setup if she has none yet.
 */
export function BusinessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useUser();
  const { state, business } = useBusiness(user.id);

  useEffect(() => {
    if (state === "none") router.replace("/setup");
  }, [state, router]);

  // Blank until the phone knows (normally under a second; Loading comes in M8).
  if (state !== "ready") return null;
  return <BusinessContext value={business}>{children}</BusinessContext>;
}
