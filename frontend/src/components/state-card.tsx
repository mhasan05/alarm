import Link from "next/link";
import type { ReactNode } from "react";

export type StateTone = "success" | "neutral" | "danger" | "warning" | "politician";

const TONE: Record<StateTone, string> = {
  success: "bg-success/10 text-success",
  neutral: "bg-surface text-muted",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  politician: "bg-role-politician/10 text-role-politician",
};

export type StateAction = { label: string; href?: string; onClick?: () => void; kind?: "primary" | "secondary" | "danger" };

const ACTION: Record<NonNullable<StateAction["kind"]>, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover border-primary",
  secondary: "bg-white text-primary border-line hover:border-primary",
  danger: "bg-white text-danger border-danger/50 hover:bg-danger/5",
};

/**
 * The shared empty / loading / error / gate state: an icon, a title, what happened, and one next action
 * (plus an optional lighter escape route). Never a blank panel.
 */
export function StateCard({ tone, icon, title, body, actions = [], children }: { tone: StateTone; icon?: ReactNode; title: string; body: ReactNode; actions?: StateAction[]; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-5 py-7 text-center">
      {children ?? (
        <span className={`flex size-[52px] items-center justify-center rounded-full text-[20px] ${TONE[tone]}`} aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 className="mt-3.5 font-bn text-[15px] font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm font-bn text-[12.5px] leading-[1.7] text-muted text-pretty">{body}</p>
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {actions.map((a) => {
            const cls = `inline-flex h-9 cursor-pointer items-center rounded-button border px-4 font-bn text-[13px] font-semibold ${ACTION[a.kind ?? "primary"]}`;
            return a.href ? (
              <Link key={a.label} href={a.href} className={cls}>
                {a.label}
              </Link>
            ) : (
              <button key={a.label} type="button" onClick={a.onClick} className={cls}>
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Skeleton bars shaped like list rows, for loading states. */
export function RowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-2.5" aria-hidden="true">
      <div className="h-3 w-2/5 animate-pulse rounded bg-line/60" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`h-10 animate-pulse rounded-md bg-line/50 ${i === rows - 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}
