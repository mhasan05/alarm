"use client";

import { useState } from "react";

const btn =
  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-button border px-3.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";

/** Print / share / PDF. PDF uses the browser's print-to-PDF; the page hides the portal chrome when printed. */
export function ReportActions({ approved, code }: { approved: boolean; code: string }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    setTimeout(() => setCopied(null), 4000);
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => window.print()} className={`${btn} border-line bg-white text-ink hover:border-primary hover:text-primary`}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6V2h8v4M4 12H2.5V6.5h11V12H12M4 9.5h8V14H4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
          Print
        </button>
        <button
          type="button"
          onClick={share}
          disabled={!approved}
          title={approved ? undefined : "Available once the reviewer approves the report"}
          className={`${btn} border-line bg-white text-ink hover:border-primary hover:text-primary`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6.5 9.5 9.5 6.5M7 4.5l1.3-1.3a2.6 2.6 0 0 1 3.7 3.7L10.7 8.2M9 11.5l-1.3 1.3A2.6 2.6 0 0 1 4 9.1l1.3-1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Share Secure Link
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!approved}
          title={approved ? `Save ${code} as PDF from the print dialog` : "Available once the reviewer approves the report"}
          className={`${btn} border-primary bg-primary text-white hover:bg-primary-hover`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2.5v8M4.8 7.5 8 10.7l3.2-3.2M3 13.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download PDF
        </button>
      </div>
      <p role="status" className="text-[11.5px] text-muted">
        {copied === "ok"
          ? "Link copied — only signed-in admins and reviewers can open it."
          : copied === "fail"
            ? "Couldn't copy — copy the address from the browser bar."
            : !approved
              ? "Sharing and PDF unlock once the reviewer approves."
              : ""}
      </p>
    </div>
  );
}
