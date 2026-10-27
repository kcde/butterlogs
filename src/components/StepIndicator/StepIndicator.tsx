import styles from "./StepIndicator.module.css";

/** Top of the new-recipe flow: step name, "Step 2 of 3" and a thin progress bar. */
export interface StepIndicatorProps {
  step: number;
  total: number;
  /** "Basics", "Ingredients", "Overhead & price" */
  label: string;
}

export function StepIndicator({ step, total, label }: StepIndicatorProps) {
  const count = `Step ${step} of ${total}`;
  return (
    <div className={styles.steps}>
      <div className={styles.top}>
        <h2 className={styles.name}>{label}</h2>
        <span className={styles.count}>{count}</span>
      </div>
      {/* A native progress bar is a progressbar to screen readers, with its values. */}
      <progress className={styles.progress} value={step} max={total} aria-label={count} />
    </div>
  );
}
