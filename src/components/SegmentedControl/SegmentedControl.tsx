"use client";

import { useRadioGroup } from "../radioGroup";
import styles from "./SegmentedControl.module.css";

/** Two or three options side by side on a grey track; the chosen one lifts onto white. */
export interface SegmentedControlProps {
  /** 2–3 short nouns. */
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  /** 'tabs' when it switches views (Ingredients / Costs) Default: 'choice'. */
  as?: "tabs" | "choice";
  /** Not in the design system's props: the group's name for screen readers ("Yield"). */
  label?: string;
}

export function SegmentedControl({ options, value, onChange, as = "choice", label }: SegmentedControlProps) {
  const radio = useRadioGroup(options, value, onChange);

  if (as === "tabs") {
    return (
      <div role="tablist" aria-label={label} className={styles.track}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={option.value === value}
            className={styles.segment}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={label} className={styles.track}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          {...radio(index)}
          className={styles.segment}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
