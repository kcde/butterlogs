"use client";

import { type KeyboardEvent, useRef } from "react";
import styles from "./ChoiceGrid.module.css";

/** A 2 × 2 grid of pill options where the chosen one turns black; used for the pricing method. */
export interface ChoiceGridProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  /** Group name for screen readers. */
  label: string;
}

const NEXT_KEYS = ["ArrowRight", "ArrowDown"];
const PREVIOUS_KEYS = ["ArrowLeft", "ArrowUp"];

export function ChoiceGrid({ options, value, onChange, label }: ChoiceGridProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // Radio-group keys: arrows move the choice and the focus together.
  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = NEXT_KEYS.includes(event.key) ? 1 : PREVIOUS_KEYS.includes(event.key) ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className={styles.grid}>
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            // Only the chosen option is in the tab order (or the first, if none is).
            tabIndex={checked || (!options.some((o) => o.value === value) && index === 0) ? 0 : -1}
            className={styles.choice}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
