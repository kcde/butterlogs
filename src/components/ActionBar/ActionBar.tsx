"use client";

import { type ReactNode, useEffect, useRef } from "react";
import styles from "./ActionBar.module.css";

/** The bar fixed to the bottom of flows and edit screens, holding Back/Next or Save, with an optional running total. */
export interface ActionBarProps {
  /** "Ingredient cost ₦5,212" */
  summary?: { label: string; value: string };
  /** Not in the design system's props: one line above the buttons when she can't go on yet ("Fill in the boxes marked in red."). */
  message?: string;
  /** One or two Buttons. */
  children: ReactNode;
}

export function ActionBar({ summary, message, children }: ActionBarProps) {
  const bar = useRef<HTMLDivElement>(null);

  // Stays above the iPhone keyboard (README): the keyboard shrinks the visible
  // part of the screen, so the bar is lifted by the part it covers.
  useEffect(() => {
    const element = bar.current;
    const viewport = window.visualViewport;
    if (!element || !viewport) return;
    const fit = () => {
      const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      element.style.setProperty("--covered", `${covered}px`);
    };
    fit();
    viewport.addEventListener("resize", fit);
    viewport.addEventListener("scroll", fit);
    return () => {
      viewport.removeEventListener("resize", fit);
      viewport.removeEventListener("scroll", fit);
    };
  }, []);

  return (
    <div ref={bar} className={styles.bar}>
      {summary && (
        <div className={styles.summary}>
          <span>{summary.label}</span>
          <span>{summary.value}</span>
        </div>
      )}
      {message && (
        <p className={styles.message} role="alert">
          {message}
        </p>
      )}
      <div className={styles.buttons}>{children}</div>
    </div>
  );
}
