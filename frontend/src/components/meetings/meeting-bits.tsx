"use client";

import { useState } from "react";
import { useOrigin } from "@/lib/use-client";
import { bnDate, bnTime } from "@/lib/db/format";
import type { Meeting, MeetingStatus } from "@/lib/db/types";

const STATUS: Record<MeetingStatus, { label: string; cls: string; dot: string }> = {
  scheduled: { label: "সামনে হবে", cls: "bg-role-reviewer/10 text-role-reviewer", dot: "bg-role-reviewer" },
  live: { label: "চলছে", cls: "bg-danger/10 text-danger", dot: "bg-danger animate-pulse" },
  ended: { label: "শেষ হয়েছে", cls: "bg-surface text-muted", dot: "bg-muted" },
  cancelled: { label: "বাতিল", cls: "bg-surface text-muted", dot: "bg-placeholder" },
};

export function MeetingStatusChip({ status }: { status: MeetingStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-input px-2.5 py-[3px] font-bn text-[11.5px] font-semibold ${s.cls}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/** "০৮ অক্টোবর, ২০২৬ · ১১:০০ AM" */
export const meetingWhen = (m: Meeting) => `${bnDate(m.scheduledAt)} · ${bnTime(m.scheduledAt)}`;

export function ShareLink({ code, compact = false }: { code: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  // "" on the server, so the server and first client render match.
  const origin = useOrigin();
  const link = `${origin}/meet/${code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard can be blocked; selecting the field lets the user copy by hand.
      (document.getElementById(`link-${code}`) as HTMLInputElement | null)?.select();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "rounded-card border border-line bg-surface/60 p-1.5"}`}>
      <label htmlFor={`link-${code}`} className="sr-only">
        মিটিং লিংক
      </label>
      <input
        id={`link-${code}`}
        readOnly
        value={link}
        onFocus={(e) => e.target.select()}
        className="h-9 min-w-0 flex-1 rounded-input border border-line bg-white px-3 font-mono text-[12.5px] text-ink outline-none focus:border-primary"
      />
      <button
        type="button"
        onClick={copy}
        className={`h-9 flex-none cursor-pointer rounded-button px-3.5 font-bn text-[12.5px] font-semibold ${copied ? "bg-success text-white" : "bg-primary text-white hover:bg-primary-hover"}`}
      >
        {copied ? "কপি হয়েছে ✓" : "লিংক কপি করুন"}
      </button>
    </div>
  );
}

export function MicIcon({ muted, size = 16 }: { muted?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="7" y="2.5" width="6" height="10" rx="3" />
      <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5M7 17.5h6" strokeLinecap="round" />
      {muted && <path d="M3.5 3.5l13 13" strokeLinecap="round" />}
    </svg>
  );
}

export function HandIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path
        d="M7 10V4.2a1.2 1.2 0 0 1 2.4 0V9m0-.5V3.2a1.2 1.2 0 0 1 2.4 0V9m0-.6V4.4a1.2 1.2 0 0 1 2.4 0v6.8c0 3.3-2.3 5.8-5.3 5.8-2.2 0-3.4-1-4.6-2.9L2.6 11a1.2 1.2 0 0 1 2-1.3L7 12.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Nav icon (16×16 path) for "মিটিং". */
export const MEETING_ICON = "M6 2.2h4v6.6a2 2 0 0 1-4 0zM3.4 7.6a4.6 4.6 0 0 0 9.2 0M8 12.2v2";
