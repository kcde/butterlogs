"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";
import { IconButton } from "../IconButton";
import styles from "./SearchField.module.css";

/** Search box at the top of the Recipes and Ingredients lists and inside the add-ingredients sheet. */
export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** "Search recipes", "Search ingredients" */
  placeholder: string;
}

export function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.search}>
      <Search aria-hidden="true" />
      <input
        ref={input}
        type="search"
        value={value}
        placeholder={placeholder}
        // The placeholder doubles as the label (SearchField README).
        aria-label={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <IconButton
          variant="plain"
          icon={<X />}
          label="Clear search"
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        />
      )}
    </div>
  );
}
