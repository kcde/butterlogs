"use client";

import { usePowerSync } from "@powersync/react";
import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { CheckRow } from "@/components/CheckRow";
import { TextField } from "@/components/TextField";
import { addOverheadItem, type OverheadItemRow } from "@/lib/db/overhead";
import { nameTaken } from "@/lib/names";
import styles from "./newRecipe.module.css";

export interface AddOverheadSheetProps {
  open: boolean;
  businessId: string;
  items: readonly OverheadItemRow[];
  /** Items already on this recipe: ticked and greyed out. */
  added: ReadonlySet<string>;
  onAdd: (ids: string[]) => void;
  onClose: () => void;
}

// "Add overhead item" (agreed 27 Oct): tick her items, or make a new one there
// and then. It stays in her list even if the recipe is discarded.
export function AddOverheadSheet({ open, businessId, items, added, onAdd, onClose }: AddOverheadSheetProps) {
  const db = usePowerSync();
  const [ticked, setTicked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function create() {
    const taken = nameTaken(name, items);
    if (name.trim() === "") return setError("Add a name.");
    if (taken) return setError(`You already have ${taken.name}.`);
    try {
      const id = await addOverheadItem(db, { businessId, name });
      setName("");
      setTicked((current) => [...current, id]);
    } catch (problem) {
      Sentry.captureException(problem, { tags: { overhead: "add" } });
      setError("That didn’t save. Try again.");
    }
  }

  const count = ticked.length;
  return (
    <BottomSheet
      open={open}
      title="Add overhead items"
      onClose={onClose}
      footer={
        <Button
          variant="primary"
          block
          disabled={count === 0}
          onClick={() => {
            onAdd(ticked);
            setTicked([]);
          }}
        >
          {count === 0 ? "Add items" : `Add ${count} item${count === 1 ? "" : "s"}`}
        </Button>
      }
    >
      <div className={styles.checks}>
        {items.map((item) => {
          const already = added.has(item.id);
          return (
            <CheckRow
              key={item.id}
              label={item.name ?? ""}
              checked={already || ticked.includes(item.id)}
              disabled={already}
              onChange={(on) =>
                setTicked((current) => (on ? [...current, item.id] : current.filter((id) => id !== item.id)))
              }
            />
          );
        })}
      </div>
      <form
        className={styles.addNew}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <div className={styles.addNewField}>
          <TextField
            label="New item"
            placeholder="e.g. Pan maintenance"
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

