import Link from "next/link";
import { bnDate } from "@/lib/db/format";
import { CATEGORY_STYLE, ORIGIN_STYLE, STATE_BN } from "@/lib/db/selectors";
import type { Dispute, Submission } from "@/lib/db/types";

/** One-line status under a report; empty for a normally published one. */
export function reportFootNote(r: Submission, dispute?: Dispute) {
  if (r.state === "Rejected" || r.state === "Held") return "পর্যালোচক বাতিল করেছেন — এটি প্রোফাইলে দেখা যায় না, তবে রেকর্ডে সংরক্ষিত।";
  if (r.state === "Withdrawn") return "অভিযোগের পর অ্যাডমিন রিপোর্টটি প্রত্যাহার করেছেন — প্রোফাইল ও স্কোর থেকে সরানো হয়েছে।";
  if (r.state === "Pending") return "পর্যালোচকের সিদ্ধান্তের অপেক্ষায় · স্কোরে যোগ হয়নি";
  if (dispute?.state === "Open") return "আপনি এই তথ্যের বিরুদ্ধে অভিযোগ জানিয়েছেন — অ্যাডমিন যাচাই করছেন।";
  if (dispute?.state === "Response") return "অ্যাডমিন রিপোর্টে আপনার বক্তব্য যুক্ত করেছেন।";
  return "";
}

/**
 * One activity, linking to its detail page. `from` sets where the detail page's back link returns;
 * `meta` shows the date (dashboard) or the review state (my reports) in the top-right corner.
 */
export function ReportCard({
  report: r,
  dispute,
  from,
  meta = "date",
}: {
  report: Submission;
  dispute?: Dispute;
  from: "dashboard" | "reports" | "disputes";
  meta?: "date" | "state";
}) {
  const cat = CATEGORY_STYLE[r.category];
  const st = STATE_BN[r.state];
  const rejected = r.state !== "Accepted" && r.state !== "Pending";
  const origin = ORIGIN_STYLE[r.origin];
  const disputed = dispute?.state === "Open";
  const href = `/politician/reports/${r.code}?from=${from}`;
  const note = reportFootNote(r, dispute);

  return (
    <Link
      href={href}
      className={`group flex h-full flex-col rounded-card border border-l-[3px] border-line p-[15px] hover:border-primary hover:bg-[#FAFDFC] ${
        rejected ? "bg-[#FAFDFC]" : "bg-white"
      }`}
      style={{ borderLeftColor: rejected ? "#C8DDD6" : cat.fg }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold"
          style={{ color: cat.fg, background: cat.bg }}
        >
          <span className="size-[5px] rounded-full" style={{ background: cat.fg }} />
          {r.category}
        </span>
        {/* Only the politician's own submissions are labelled; staff origin stays internal. */}
        {r.origin === "self" && (
          <span
            className="flex-none whitespace-nowrap rounded-input px-2 py-[3px] text-[11px] font-semibold"
            style={{ color: origin.fg, background: origin.bg }}
          >
            {origin.label}
          </span>
        )}
        <span className="min-w-2.5 flex-1" />
        {meta === "date" ? (
          <span className="flex-none whitespace-nowrap text-[11px] text-muted">{bnDate(r.decidedAt ?? r.submittedAt)}</span>
        ) : (
          <span
            className="inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold"
            style={{ color: st.fg, background: st.bg }}
          >
            <span className="size-[5px] rounded-full" style={{ background: st.fg }} />
            {st.label}
          </span>
        )}
      </div>
      <div className={`mt-2.5 text-[13.5px] font-semibold leading-[1.65] text-pretty ${rejected ? "text-muted" : "text-ink"}`}>
        {r.title}
      </div>
      <div className="mt-1.5 text-[12px] leading-[1.65] text-muted text-pretty">{r.source}</div>
      <div aria-hidden="true" className="min-h-[11px] flex-1" />
      <div className="flex flex-wrap items-center gap-2.5 border-t border-[#E3EEEA] pt-2.5">
        <div
          className={`flex-1 text-[11.5px] leading-[1.65] text-pretty ${note ? "min-w-40" : ""} ${disputed ? "text-warning" : "text-muted"}`}
        >
          {note}
        </div>
        <span className="inline-flex h-8 flex-none items-center gap-[7px] rounded-button border border-line bg-white px-3 text-[11.5px] font-semibold text-primary group-hover:border-primary group-hover:bg-surface">
          বিস্তারিত দেখুন
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M5.4 2.4 10 7l-4.6 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
