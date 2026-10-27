"use client";

import { useRadioGroup } from "../radioGroup";
import styles from "./ChoiceGrid.module.css";

/** A 2 × 2 grid of pill options where the chosen one turns black; used for the pricing method. */
export interface ChoiceGridProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  /** Group name for screen readers. */
  label: string;
}

export function ChoiceGrid({ options, value, onChange, label }: ChoiceGridProps) {
  const radio = useRadioGroup(options, value, onChange);

  return (
    <div role="radiogroup" aria-label={label} className={styles.grid}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          {...radio(index)}
          className={styles.choice}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
