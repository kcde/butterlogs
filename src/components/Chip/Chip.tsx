"use client";

import { useEffect, useRef } from "react";
import styles from "./Chip.module.css";

/** Tappable filter pills in a sideways-scrolling row; the selected one turns black. */
export interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function Chip({ label, selected, onClick }: ChipProps) {
  const chip = useRef<HTMLButtonElement>(null);

  // The row scrolls sideways and keeps the selected chip in view (README).
  useEffect(() => {
    if (selected) chip.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selected]);

  return (
    <button ref={chip} type="button" aria-pressed={selected} className={styles.chip} onClick={onClick}>
      {label}
    </button>
  );
}
