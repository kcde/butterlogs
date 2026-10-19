import { ChevronLeft, X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "../IconButton";
import styles from "./TopBar.module.css";

/** The top of every screen, in three shapes: a tab home with a large title, a pushed screen with back and "…", and a flow with close. */
export interface TopBarProps {
  variant: "tab" | "push" | "flow";
  title: string;
  /** Push only: tag + "Base yield 1,500 g" */
  subtitle?: ReactNode;
  /** Push: back; flow: close. */
  backHref?: string;
  /** Sync pill, "…" button, "Add" button. */
  trailing?: ReactNode;
}

export function TopBar({ variant, title, subtitle, backHref, trailing }: TopBarProps) {
  const actions = trailing && <div className={styles.actions}>{trailing}</div>;

  if (variant === "tab") {
    return (
      <header className={styles.bar}>
        <div className={styles.row}>
          <h1 className={styles.largeTitle}>{title}</h1>
          {actions}
        </div>
      </header>
    );
  }

  if (variant === "flow") {
    return (
      <header className={styles.bar}>
        <div className={styles.row}>
          <div className={styles.lead}>
            {backHref && <IconButton href={backHref} icon={<X />} label="Close" />}
            <h1 className={styles.smallTitle}>{title}</h1>
          </div>
          {actions}
        </div>
      </header>
    );
  }

  return (
    <header className={styles.bar}>
      <div className={styles.row}>
        {backHref ? <IconButton href={backHref} icon={<ChevronLeft />} label="Back" /> : <span />}
        {actions}
      </div>
      <h1 className={styles.pageTitle}>{title}</h1>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </header>
  );
}
