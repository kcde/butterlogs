"use client";

import { useId, useState } from "react";
import { cx } from "../cx";
import styles from "./CodeField.module.css";

/**
 * One box per digit, for the code from the sign-in email.
 * Not in the design system yet (added for the code screen, 19 Oct): styled
 * from TextField's tokens. It's a single real input drawn as boxes, so iPhone
 * can offer the code from Mail and a pasted code fills every box.
 */
export interface CodeFieldProps {
  /** Read by screen readers; the boxes speak for themselves on screen. */
  label: string;
  /** Digits only. */
  value: string;
  onChange: (value: string) => void;
  /** Number of boxes. Default: 6. */
  length?: number;
  /** Red borders and this message under the boxes. */
  error?: string;
  /** Grey line under the boxes, e.g. "Checking your code…". */
  helper?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
}

export function CodeField({
  label,
  value,
  onChange,
  length = 6,
  error,
  helper,
  disabled = false,
  autoFocus = false,
  onBlur,
}: CodeFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const [focused, setFocused] = useState(autoFocus);
  const message = error ?? helper;

  return (
    <div className={cx(styles.field, error && styles.error)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className={styles.boxes}>
        {Array.from({ length }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cx(
              styles.box,
              // The box the next digit goes into (the last one when full).
              focused && index === Math.min(value.length, length - 1) && styles.current,
            )}
          >
            {value[index] ?? ""}
          </span>
        ))}
        <input
          id={id}
          className={styles.input}
          value={value}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={length}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? helpId : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, length))}
        />
      </div>
      {message && (
        <span id={helpId} className={styles.help} role={error ? "alert" : "status"}>
          {message}
        </span>
      )}
    </div>
  );
}
