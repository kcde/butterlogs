"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { TabBar } from "@/components/TabBar";
import { BusinessGate } from "../business";
import styles from "./tabs.module.css";

// The tab screens: Recipes, Ingredients, Settings, with the floating tab bar.
export default function TabsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname.startsWith("/ingredients")
    ? "ingredients"
    : pathname.startsWith("/settings")
      ? "settings"
      : "recipes";
  return (
    <BusinessGate>
      <main className={styles.screen}>{children}</main>
      <TabBar active={active} />
    </BusinessGate>
  );
}
