import type { ReactNode } from "react";
import styles from "./StepList.module.css";

/** Numbered instruction cards; used for the iPhone install guide. */
export interface StepListProps {
  steps: { text: ReactNode; icon?: ReactNode }[];
}

export function StepList({ steps }: StepListProps) {
  return (
    <ol className={styles.list}>
      {steps.map((step, index) => (
        <li key={index} className={styles.step}>
          <span className={styles.number} aria-hidden="true">
            {index + 1}
          </span>
          <span className={styles.text}>{step.text}</span>
          {step.icon}
        </li>
      ))}
    </ol>
  );
}
