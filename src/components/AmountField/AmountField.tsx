"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { type Unit, unitLabel } from "@/lib/units";
import { cx } from "../cx";
import styles from "./AmountField.module.css";

/** A number field with a unit picker attached on the right: pack size, yield, anything with g, kg, ml or pcs. */
export interface AmountFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'l' | 'fl_oz' | 'tsp' | 'tbsp' | 'cup' | 'pcs'. */
  unit: Unit;
  /** Only units of the same kind as the ingredient (weight, volume or pieces) */
  units: Unit[];
  onUnitChange: (unit: Unit) => void;
  helper?: string;
  error?: string;
  /** Not in the design system's props: lets forms validate on blur, as TextField does. */
  onBlur?: () => void;
  /** Not in the design system's props: the label is read out but not shown (NewRecipe1's yield, under its "Yield" heading). */
  hideLabel?: boolean;
}

export function AmountField({
  label,
  value,
  onChange,
  unit,
  units,
  onUnitChange,
  helper,
  error,
  onBlur,
  hideLabel = false,
}: AmountFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const message = error ?? helper;

  return (
    <div className={cx(styles.field, error && styles.error)}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : styles.label}>
        {label}
      </label>
      <div className={styles.group}>
        <input
          id={id}
          className={styles.input}
          value={value}
          // Typed as text so "1,700" is accepted; the decimal keypad still opens.
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? helpId : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        {/* A native <select>, so iPhone shows its scroll wheel. */}
        <span className={styles.unit}>
          <select
            aria-label={`${label} unit`}
            value={unit}
            onChange={(event) => onUnitChange(event.target.value as Unit)}
          >
            {units.map((option) => (
              <option key={option} value={option}>
                {unitLabel(option)}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </span>
      </div>
      {message && (
        <span id={helpId} className={styles.help}>
          {message}
        </span>
      )}
    </div>
  );
}
