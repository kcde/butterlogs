"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import styles from "./SelectField.module.css";

/** A native dropdown styled like a text field, for short fixed lists: currency, "I measure it in". */
export interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  helper?: string;
}

export function SelectField({ label, value, options, onChange, helper }: SelectFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.select}>
        <select
          id={id}
          value={value}
          aria-describedby={helper ? helpId : undefined}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown />
      </div>
      {helper && (
        <span id={helpId} className={styles.help}>
          {helper}
        </span>
      )}
    </div>
  );
}
