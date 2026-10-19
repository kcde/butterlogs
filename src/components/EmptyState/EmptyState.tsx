import type { ReactNode } from "react";
import { Button } from "../Button";
import styles from "./EmptyState.module.css";

/** What a list shows before it has anything: an icon, one friendly line, and the button that fixes it. */
export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  body: string;
  primaryAction: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href?: string; onClick?: () => void };
  footnote?: string;
}

export function EmptyState({ icon, title, body, primaryAction, secondaryAction, footnote }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <span className={styles.icon}>{icon}</span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{body}</p>
      <div className={styles.actions}>
        <Button variant="primary" block href={primaryAction.href} onClick={primaryAction.onClick}>
          {primaryAction.label}
        </Button>
        {secondaryAction && (
          <Button block href={secondaryAction.href} onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
      {footnote && <p className={styles.footnote}>{footnote}</p>}
    </div>
  );
}
