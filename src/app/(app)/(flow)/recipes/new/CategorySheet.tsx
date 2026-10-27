"use client";

import { usePowerSync } from "@powersync/react";
import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { RadioList } from "@/components/RadioList";
import { TextField } from "@/components/TextField";
import { addCategory, type CategoryRow } from "@/lib/db/categories";
import { nameTaken } from "@/lib/names";
import styles from "./newRecipe.module.css";

export interface CategorySheetProps {
  open: boolean;
  businessId: string;
  categories: readonly CategoryRow[];
  value: string | null;
  /** A category was picked or made; the sheet closes. */
  onPick: (id: string) => void;
  onClose: () => void;
}

// CategoryPicker.dc.html: pick one, or make a new one on the spot (PRD F4). A
// new category stays in her list even if the recipe is discarded (agreed 27 Oct).
export function CategorySheet({ open, businessId, categories, value, onPick, onClose }: CategorySheetProps) {
  const db = usePowerSync();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function add() {
    const taken = nameTaken(name, categories);
    if (name.trim() === "") return setError("Add a name.");
    if (taken) return setError(`You already have ${taken.name}.`);
    try {
      const id = await addCategory(db, { businessId, name });
      setName("");
      onPick(id);
    } catch (problem) {
      Sentry.captureException(problem, { tags: { category: "add" } });
      setError("That didn’t save. Try again.");
    }
  }

  return (
    <BottomSheet open={open} title="Category" onClose={onClose}>
      {categories.length > 0 && (
        <RadioList
          label="Category"
          value={value}
          onChange={onPick}
          options={categories.map((category) => ({ value: category.id, label: category.name ?? "" }))}
        />
      )}
      <form
        className={styles.addNew}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <div className={styles.addNewField}>
          <TextField
            label="New category"
            placeholder="e.g. Pastries"
            value={name}
            onChange={(next) => {
              setName(next);
              setError(undefined);
            }}
            error={error}
          />
        </div>
        <Button type="submit">Add</Button>
      </form>
    </BottomSheet>
  );
}
