"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { cx } from "../cx";
import { IconButton } from "../IconButton";
import styles from "./TextField.module.css";

/** Labelled text input with a soft filled box; also covers email, password (with show/hide), a suffix like "%", and multi-line notes. */
export interface TextFieldProps {
  /** Shown above the field. Never use the placeholder as the label. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** `password` adds the show/hide eye button. Default: 'text'. */
  type?: "text" | "email" | "password" | "number";
  /** Use 'decimal' for every number so the number keypad opens. */
  inputMode?: "text" | "decimal" | "email";
  /** An example, e.g. "₦0", "you@example.com" */
  placeholder?: string;
  /** Grey hint under the field. */
  helper?: string;
  /** Red border; replaces the helper with this message, which says how to fix it. */
  error?: string;
  /** Unit shown inside the right edge, e.g. "%", "g" */
  suffix?: string;
  /**
   * Not in the design system's props: a symbol inside the left edge, read as
   * part of the value ("₦15,000" in the Edit ingredient mockup).
   */
  prefix?: string;
  /** Renders a 88px textarea (recipe notes) Default: false. */
  multiline?: boolean;
  /** name, email, new-password, current-password. */
  autoComplete?: string;
  /** Not in the design system's props: lets forms validate on blur, as its README asks. */
  onBlur?: () => void;
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
  helper,
  error,
  suffix,
  prefix,
  multiline = false,
  autoComplete,
  onBlur,
}: TextFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const [revealed, setRevealed] = useState(false);
  const message = error ?? helper;

  const shared = {
    id,
    value,
    placeholder,
    autoComplete,
    onBlur,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": message ? helpId : undefined,
  };
  const input = (className: string) => (
    <input
      {...shared}
      className={className}
      // Numbers are typed as text so "1,700" is accepted; the keypad still opens.
      type={type === "password" ? (revealed ? "text" : "password") : type === "number" ? "text" : type}
      inputMode={inputMode ?? (type === "number" ? "decimal" : type === "email" ? "email" : undefined)}
      autoCapitalize={type === "email" || type === "password" ? "none" : undefined}
      autoCorrect={type === "email" || type === "password" ? "off" : undefined}
      spellCheck={type === "email" || type === "password" ? false : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );

  let control;
  if (multiline) {
    control = (
      <textarea {...shared} className={styles.textarea} onChange={(event) => onChange(event.target.value)} />
    );
  } else if (prefix || suffix || type === "password") {
    control = (
      <div className={styles.wrap}>
        {prefix && (
          <span className={styles.prefix} aria-hidden="true">
            {prefix}
          </span>
        )}
        {input(cx(styles.bare, prefix && styles.afterPrefix))}
        {suffix && <span className={styles.suffix}>{suffix}</span>}
        {type === "password" && (
          <IconButton
            variant="plain"
            icon={revealed ? <EyeOff /> : <Eye />}
            label={revealed ? "Hide password" : "Show password"}
            onClick={() => setRevealed(!revealed)}
          />
        )}
      </div>
    );
  } else {
    control = input(styles.input);
  }

  return (
    <div className={cx(styles.field, error && styles.error)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {control}
      {message && (
        <span id={helpId} className={styles.help}>
          {message}
        </span>
      )}
    </div>
  );
}
