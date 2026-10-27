"use client";

import { Check } from "lucide-react";
import { useRadioGroup } from "../radioGroup";
import styles from "./RadioList.module.css";

/** A single-choice list where the chosen row shows a caramel tick; used to pick a category. */
export interface RadioListProps {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
  label: string;
}

export function RadioList({ options, value, onChange, label }: RadioListProps) {
  const radio = useRadioGroup(options, value, onChange);

  return (
    <div role="radiogroup" aria-label={label} className={styles.list}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          {...radio(index)}
          className={styles.radio}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.value === value && <Check aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}
