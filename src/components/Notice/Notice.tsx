import type { ReactNode } from "react";
import styles from "./Notice.module.css";

/** A neutral grey card for calm information: "Check your email", or a calculated result like "Works out to ₦1.20 per g". */
export interface NoticeProps {
  /** Result = one line, label left and bold value right. Default: 'message'. */
  variant?: "message" | "result";
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
}

export function Notice({ variant = "message", icon, title, children }: NoticeProps) {
  if (variant === "result") {
    return (
      <div className={styles.result}>
        <span className={styles.resultLabel}>{title}</span>
        <span className={styles.resultValue}>{children}</span>
      </div>
    );
  }
  return (
    <div className={styles.notice} role="status">
      {icon && <span className={styles.icon}>{icon}</span>}
      <span>
        {title && <b className={styles.title}>{title}</b>}
        <span className={styles.message}>{children}</span>
      </span>
    </div>
  );
}
