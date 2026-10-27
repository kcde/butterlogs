import { GripVertical, X } from "lucide-react";
import type { Ref } from "react";
import { cx } from "../cx";
import styles from "./EditLineRow.module.css";
import type { SortableLine } from "./SortableLines";

/** An editable line in the new-recipe and edit flows: drag handle, name, amount box with unit, remove. */
export interface EditLineRowProps {
  name: string;
  amount: string;
  onAmountChange: (value: string) => void;
  /** Shown after the number ("g", "pcs") */
  unit?: string;
  /** Shown before it ("₦" for overhead) */
  prefix?: string;
  /** Shows the × button. */
  onRemove?: () => void;
  /** Shows the grip; rows reorder by dragging. Default: false. */
  dragHandle?: boolean;
  /** Not in the design system's props: the row's and grip's drag props, from SortableLineRow. */
  sortable?: SortableLine;
  /** Not in the design system's props: a red outline on an amount she has to fill in (agreed 27 Oct). */
  invalid?: boolean;
  /** Not in the design system's props: lets the screen put the cursor in the amount. */
  inputRef?: Ref<HTMLInputElement>;
}

export function EditLineRow({
  name,
  amount,
  onAmountChange,
  unit,
  prefix,
  onRemove,
  dragHandle = false,
  sortable,
  invalid = false,
  inputRef,
}: EditLineRowProps) {
  return (
    <div
      ref={sortable?.rowRef}
      className={cx(styles.row, !dragHandle && styles.noGrip)}
      style={sortable?.rowStyle}
      data-dragging={sortable?.dragging || undefined}
    >
      {dragHandle && (
        <button
          ref={sortable?.gripRef}
          type="button"
          className={styles.grip}
          {...sortable?.gripAttributes}
          {...sortable?.gripListeners}
          aria-label={`Move ${name} up or down`}
        >
          <GripVertical aria-hidden="true" />
        </button>
      )}
      <span className={styles.name}>{name}</span>
      <span className={cx(styles.amount, invalid && styles.invalid)}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          aria-label={`${name} amount`}
          aria-invalid={invalid || undefined}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      {onRemove && (
        <button type="button" className={styles.remove} aria-label={`Remove ${name}`} onClick={onRemove}>
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
