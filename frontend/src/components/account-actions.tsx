"use client";

import { useState } from "react";

// Account status controls shared by the field-staff and reviewer detail pages. The page passes the
// current status and callbacks that save the change, so every screen shows the same state.

export type AccountStatus = "Active" | "On duty" | "On leave" | "Suspended" | "Deactivated";

const STATUS_STYLE: Record<AccountStatus, string> = {
  Active: "bg-success/10 text-success",
  "On duty": "bg-success/10 text-success",
  "On leave": "bg-surface text-muted",
  Suspended: "bg-danger/10 text-danger",
  Deactivated: "bg-ink/10 text-ink",
};

export function StaffStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium ${STATUS_STYLE[status]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  );
}

type Pending = "reset" | "suspend" | "deactivate" | null;

export function AccountActions({
  name,
  status,
  maskedPhone,
  open,
  activeLabel,
  openNoun = "open assignment",
  onStatus,
  onReset,
}: {
  name: string;
  status: AccountStatus;
  maskedPhone: string;
  open: number;
  /** Status restored when a suspension is lifted. */
  activeLabel: AccountStatus;
  openNoun?: string;
  onStatus: (s: AccountStatus) => void;
  onReset: () => void;
}) {
  const [confirm, setConfirm] = useState<Pending>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [before, setBefore] = useState<AccountStatus | null>(null);
  const deactivated = status === "Deactivated";
  const suspended = status === "Suspended";

  const act = (a: Exclude<Pending, null>) => {
    setConfirm(null);
    if (a === "reset") {
      onReset();
      setMessage(`A temporary password was sent by SMS to ${maskedPhone}. ${name} must change it at next sign-in.`);
    }
    if (a === "suspend") {
      if (suspended) {
        onStatus(activeLabel);
        setMessage(`${name} can sign in again.`);
      } else {
        onStatus("Suspended");
        setMessage(`${name} is suspended — sign-in is blocked.${open ? ` Reassign their ${open} ${openNoun}${open === 1 ? "" : "s"}.` : ""}`);
      }
    }
    if (a === "deactivate") {
      setBefore(status);
      onStatus("Deactivated");
      setMessage(`${name}'s account is deactivated. Submitted evidence and audit-trail entries are kept.`);
    }
  };

  const CONFIRM: Record<Exclude<Pending, null>, { q: string; yes: string; cls: string }> = {
    reset: { q: `Send ${name} a temporary password by SMS?`, yes: "Send", cls: "bg-primary hover:bg-primary-hover" },
    suspend: suspended
      ? { q: `Lift the suspension and let ${name} sign in again?`, yes: "Reactivate", cls: "bg-primary hover:bg-primary-hover" }
      : { q: `Suspend ${name}? They can't sign in or upload until reactivated.`, yes: "Suspend", cls: "bg-warning hover:bg-warning/90" },
    deactivate: { q: `Deactivate ${name}'s account? This closes it for good; evidence and the audit trail are kept.`, yes: "Deactivate", cls: "bg-danger hover:bg-danger-hover" },
  };

  const button = "h-10 w-full cursor-pointer rounded-button border bg-white text-[13.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
      <h2 className="text-[15px] font-semibold text-ink">Account Actions</h2>
      {confirm ? (
        <div role="alertdialog" aria-labelledby="acct-confirm" className="mt-3 rounded-card border border-line bg-surface/60 p-4">
          <p id="acct-confirm" className="text-[13px] leading-normal text-ink text-pretty">
            {CONFIRM[confirm].q}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => act(confirm)} className={`h-9 cursor-pointer rounded-button px-4 text-[13px] font-semibold text-white ${CONFIRM[confirm].cls}`}>
              {CONFIRM[confirm].yes}
            </button>
            <button type="button" onClick={() => setConfirm(null)} className="h-9 cursor-pointer rounded-button border border-line bg-white px-4 text-[13px] font-semibold text-ink hover:border-primary">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          <button type="button" disabled={deactivated} onClick={() => setConfirm("reset")} className={`${button} border-line text-primary hover:border-primary hover:bg-surface`}>
            Reset password
          </button>
          <button type="button" disabled={deactivated} onClick={() => setConfirm("suspend")} className={`${button} border-line text-warning hover:border-warning`}>
            {suspended ? "Reactivate account" : "Suspend account"}
          </button>
          <button type="button" disabled={deactivated} onClick={() => setConfirm("deactivate")} className={`${button} border-danger text-danger hover:bg-danger/5`}>
            {deactivated ? "Account deactivated" : "Deactivate account"}
          </button>
        </div>
      )}
      {message && (
        <div role="status" className="mt-3 rounded-button bg-success/8 px-3 py-2 text-[12.5px] leading-normal text-ink">
          {message}
          {deactivated && before && (
            <button
              type="button"
              onClick={() => {
                onStatus(before);
                setBefore(null);
                setMessage(null);
              }}
              className="ml-2 cursor-pointer font-semibold text-primary hover:text-primary-hover"
            >
              Undo
            </button>
          )}
        </div>
      )}
      <p className="mt-3 text-[11.5px] text-muted">Deactivation keeps all submitted evidence and audit-trail entries intact.</p>
    </section>
  );
}
