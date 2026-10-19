"use client";

import { createContext, useContext } from "react";
import type { SignedInUser } from "@/lib/session";

export const UserContext = createContext<SignedInUser | null>(null);

/** The signed-in user. Only inside the (app) layout, which waits for one. */
export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser needs the (app) layout");
  return user;
}
