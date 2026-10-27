"use client";

import type { ReactNode } from "react";
import { BusinessGate } from "../business";
import styles from "./flow.module.css";

// Flow screens (screen-patterns.md, layout 3): the new-recipe steps. No tab bar
// and no FAB; the ActionBar is fixed to the bottom.
export default function FlowLayout({ children }: { children: ReactNode }) {
  return (
    <BusinessGate>
      <main className={styles.screen}>{children}</main>
    </BusinessGate>
  );
}
