"use client";

import { useState } from "react";
import { bn } from "@/lib/db/format";

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

/** Bengali labels for the stored (English) status values. */
export const STATUS_LABEL: Record<AccountStatus, string> = {
  Active: "চালু আছে",
  "On duty": "কাজে আছেন",
  "On leave": "ছুটিতে",
  Suspended: "বন্ধ",
  Deactivated: "পুরোপুরি বন্ধ",
};

export function StaffStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium ${STATUS_STYLE[status]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABEL[status]}
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
  openNoun = "চলমান কাজ",
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
      setMessage(`${maskedPhone} নম্বরে এসএমএস-এ একটি অস্থায়ী পাসওয়ার্ড পাঠানো হয়েছে। পরের বার সাইন ইন করার সময় ${name}-কে এটি বদলাতে হবে।`);
    }
    if (a === "suspend") {
      if (suspended) {
        onStatus(activeLabel);
        setMessage(`${name} আবার সাইন ইন করতে পারবেন।`);
      } else {
        onStatus("Suspended");
        setMessage(`${name}-এর অ্যাকাউন্ট বন্ধ করা হয়েছে — সাইন ইন করা যাবে না।${open ? ` তাঁর ${bn(open)}টি ${openNoun} অন্য কাউকে দিন।` : ""}`);
      }
    }
    if (a === "deactivate") {
      setBefore(status);
      onStatus("Deactivated");
      setMessage(`${name}-এর অ্যাকাউন্ট পুরোপুরি বন্ধ করা হয়েছে। জমা দেওয়া প্রমাণ ও অডিট লগের তথ্য রাখা আছে।`);
    }
  };

  const CONFIRM: Record<Exclude<Pending, null>, { q: string; yes: string; cls: string }> = {
    reset: { q: `${name}-কে এসএমএস-এ একটি অস্থায়ী পাসওয়ার্ড পাঠাবেন?`, yes: "পাঠান", cls: "bg-primary hover:bg-primary-hover" },
    suspend: suspended
      ? { q: `${name}-এর অ্যাকাউন্ট আবার চালু করে সাইন ইন করতে দেবেন?`, yes: "আবার চালু করুন", cls: "bg-primary hover:bg-primary-hover" }
      : { q: `${name}-এর অ্যাকাউন্ট বন্ধ করবেন? আবার চালু না করা পর্যন্ত তিনি সাইন ইন বা আপলোড করতে পারবেন না।`, yes: "বন্ধ করুন", cls: "bg-warning hover:bg-warning/90" },
    deactivate: { q: `${name}-এর অ্যাকাউন্ট পুরোপুরি বন্ধ করবেন? এটি আর চালু করা যাবে না; প্রমাণ ও অডিট লগ রাখা থাকবে।`, yes: "পুরোপুরি বন্ধ করুন", cls: "bg-danger hover:bg-danger-hover" },
  };

  const button = "h-10 w-full cursor-pointer rounded-button border bg-white text-[13.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
      <h2 className="text-[15px] font-semibold text-ink">অ্যাকাউন্ট নিয়ন্ত্রণ</h2>
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
              বাতিল
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          <button type="button" disabled={deactivated} onClick={() => setConfirm("reset")} className={`${button} border-line text-primary hover:border-primary hover:bg-surface`}>
            পাসওয়ার্ড রিসেট
          </button>
          <button type="button" disabled={deactivated} onClick={() => setConfirm("suspend")} className={`${button} border-line text-warning hover:border-warning`}>
            {suspended ? "অ্যাকাউন্ট আবার চালু করুন" : "অ্যাকাউন্ট বন্ধ করুন"}
          </button>
          <button type="button" disabled={deactivated} onClick={() => setConfirm("deactivate")} className={`${button} border-danger text-danger hover:bg-danger/5`}>
            {deactivated ? "পুরোপুরি বন্ধ" : "পুরোপুরি বন্ধ করুন"}
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
              আগের মতো করুন
            </button>
          )}
        </div>
      )}
      <p className="mt-3 text-[11.5px] text-muted">পুরোপুরি বন্ধ করলেও জমা দেওয়া সব প্রমাণ ও অডিট লগের তথ্য ঠিকঠাক থাকে।</p>
    </section>
  );
}
