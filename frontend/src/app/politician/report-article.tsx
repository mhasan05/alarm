import Link from "next/link";
import type { ReactNode } from "react";
import { bnDate } from "@/lib/db/format";
import { CATEGORY_STYLE, ORIGIN_STYLE, STATE_BN } from "@/lib/db/selectors";
import type { Dispute, DisputeState, Submission } from "@/lib/db/types";
import { reportFootNote } from "./report-card";

// Politician-facing report and dispute views. Show only submitted content —
// no submitter or reviewer identities, review trail or key facts.

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-[34px] items-center gap-2 self-start rounded-button border border-line bg-white px-[13px] text-[12.5px] font-semibold text-primary hover:border-primary hover:bg-surface max-md:hidden"
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M8.6 2.4 4 7l4.6 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </Link>
  );
}

function SectionLabel({ num, children }: { num?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.05em] text-muted">
      {num && <span className="flex size-[18px] items-center justify-center rounded-full bg-surface text-[10px] text-primary">{num}</span>}
      {children}
    </div>
  );
}

function Badge({ fg, bg, children }: { fg: string; bg: string; children: ReactNode }) {
  return (
    <span className="inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold" style={{ color: fg, background: bg }}>
      <span className="size-[5px] rounded-full" style={{ background: fg }} />
      {children}
    </span>
  );
}

/**
 * The full report: badges, title, date, description and evidence. `showFooter` adds the
 * status note and dispute button (hidden on the dispute page, where the dispute card covers it).
 */
export function ReportArticle({
  report,
  dispute,
  disputeStatus,
  showFooter = true,
}: {
  report: Submission;
  dispute?: Dispute;
  disputeStatus?: { allowed: boolean; label: string };
  showFooter?: boolean;
}) {
  const cat = CATEGORY_STYLE[report.category];
  const origin = ORIGIN_STYLE[report.origin];
  const st = STATE_BN[report.state];
  const warn = dispute?.state === "Open";
  const note = reportFootNote(report, dispute);

  return (
    <article className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="border-b border-l-4 border-line px-[22px] py-[18px]" style={{ borderLeftColor: cat.fg }}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge fg={cat.fg} bg={cat.bg}>
            {report.category}
          </Badge>
          {/* Only the politician's own submissions are labelled; staff origin stays internal. */}
          {report.origin === "self" && (
            <span className="flex-none whitespace-nowrap rounded-input px-2 py-[3px] text-[11px] font-semibold" style={{ color: origin.fg, background: origin.bg }}>
              {origin.label}
            </span>
          )}
          <span className="flex-none whitespace-nowrap font-mono text-[11px] font-semibold text-muted">{report.code}</span>
          <span className="min-w-2.5 flex-1" />
          <Badge fg={st.fg} bg={st.bg}>
            {st.label}
          </Badge>
        </div>
        <h2 className="mt-3 text-[18px] font-semibold leading-[1.65] text-pretty">{report.title}</h2>
        <p className="mt-1.5 text-[12px] leading-[1.65] text-muted">{bnDate(report.decidedAt ?? report.submittedAt)}</p>
      </div>

      <div className="flex flex-col gap-5 px-[22px] py-5">
        <div>
          <SectionLabel num="১">বিবরণ · DESCRIPTION</SectionLabel>
          <p className="mt-2 text-[13.5px] leading-[1.8] text-pretty">{report.body}</p>
        </div>

        <div>
          <SectionLabel num="২">সংযুক্ত প্রমাণ · EVIDENCE</SectionLabel>
          {report.evidence.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-muted">কোনো প্রমাণ সংযুক্ত নেই।</p>
          ) : (
            <ul className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
              {report.evidence.map((e) => (
                <li key={e.id} className="overflow-hidden rounded-card border border-line">
                  <div className="flex h-[92px] items-center justify-center border-b border-line bg-surface px-2 text-center text-[11px] text-muted">{e.kind}</div>
                  <div className="px-[11px] py-2.5">
                    <div className="text-[12px] font-semibold leading-[1.55] text-pretty">{e.title}</div>
                    <div className="mt-1 text-[10.5px] leading-[1.55] text-muted">{e.meta}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {report.response && (
          <div className="rounded-card border border-l-[3px] border-line border-l-role-reviewer bg-surface px-4 py-3">
            <SectionLabel>রিপোর্টে যুক্ত আপনার বক্তব্য</SectionLabel>
            <p className="mt-1.5 text-[13px] leading-[1.75] text-pretty">{report.response}</p>
          </div>
        )}
      </div>

      {showFooter && disputeStatus && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line bg-[#FAFDFC] px-[22px] py-4">
          <p className={`flex-1 text-[11.5px] leading-[1.7] text-pretty ${note ? "min-w-[200px]" : ""} ${warn ? "text-warning" : "text-muted"}`}>{note}</p>
          {disputeStatus.allowed ? (
            <Link
              href={`/politician/disputes?report=${report.code}`}
              className="inline-flex h-10 flex-none items-center rounded-button border border-danger bg-white px-[18px] text-[13px] font-semibold text-danger hover:bg-danger/6"
            >
              {disputeStatus.label}
            </Link>
          ) : (
            <button type="button" disabled className="h-10 flex-none cursor-not-allowed rounded-button border border-line bg-surface px-[18px] text-[13px] font-semibold text-muted">
              {disputeStatus.label}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/** How a dispute reads to the politician. */
export function disputeView(d: Dispute, workingDays: number): { state: string; outcome: string; fg: string; bg: string; outcomeFg: string } {
  const map: Record<DisputeState, { state: string; outcome: string; fg: string; outcomeFg: string }> = {
    Open: { state: "অ্যাডমিন যাচাই করছেন", outcome: `সিদ্ধান্তের অপেক্ষায় · সাধারণত ${new Intl.NumberFormat("bn-BD").format(workingDays)} কর্মদিবস`, fg: "#D97706", outcomeFg: "#D97706" },
    Kept: { state: "রিপোর্ট বহাল", outcome: "অ্যাডমিন রিপোর্টটি বহাল রেখেছেন", fg: "#4A7060", outcomeFg: "#4A7060" },
    Response: { state: "আংশিক গৃহীত", outcome: "অ্যাডমিন রিপোর্টে আপনার বক্তব্য যুক্ত করেছেন, তথ্যটি বহাল রয়েছে", fg: "#1D6FC0", outcomeFg: "#4A7060" },
    Removed: { state: "গৃহীত", outcome: "অ্যাডমিন রিপোর্টটি প্রত্যাহার করেছেন · প্রোফাইল থেকে সরানো হয়েছে", fg: "#1A7A4A", outcomeFg: "#1A7A4A" },
  };
  const v = map[d.state];
  return { ...v, bg: `${v.fg}1A` };
}

/** The politician's dispute on a report: what they claimed, when, its status and the admin's outcome. */
export function DisputeCard({ dispute: d, workingDays, title = "আমার অভিযোগ" }: { dispute: Dispute; workingDays: number; title?: string }) {
  const v = disputeView(d, workingDays);
  return (
    <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="border-b border-l-4 border-line px-[22px] py-[18px]" style={{ borderLeftColor: v.fg }}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-semibold leading-[1.6]">{title}</h2>
          <span className="flex-none whitespace-nowrap font-mono text-[11px] font-semibold text-muted">{d.code}</span>
          <span className="min-w-2.5 flex-1" />
          <Badge fg={v.fg} bg={v.bg}>
            {v.state}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-[22px] py-5">
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-5 gap-y-3">
          <div>
            <dt className="text-[10.5px] font-semibold tracking-[0.05em] text-muted">অভিযোগের ধরন</dt>
            <dd className="mt-1.5">
              <span className="inline-flex rounded-input bg-surface px-2 py-[3px] text-[12px] font-semibold text-ink">{d.reason}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[10.5px] font-semibold tracking-[0.05em] text-muted">জমার তারিখ</dt>
            <dd className="mt-1.5 text-[13px] leading-[1.6]">{bnDate(d.filedAt)}</dd>
          </div>
          {d.attachments.length > 0 && (
            <div>
              <dt className="text-[10.5px] font-semibold tracking-[0.05em] text-muted">সংযুক্তি</dt>
              <dd className="mt-1.5 text-[12.5px] leading-[1.6]">{d.attachments.join(" · ")}</dd>
            </div>
          )}
        </dl>

        <div>
          <SectionLabel>আপনার বক্তব্য</SectionLabel>
          <p className="mt-2 text-[13.5px] leading-[1.8] text-pretty">{d.claim}</p>
        </div>

        <div className="rounded-card border border-l-[3px] border-line bg-surface px-4 py-3" style={{ borderLeftColor: v.fg }}>
          <div className="text-[10.5px] font-semibold tracking-[0.05em] text-muted">সিদ্ধান্ত{d.decidedAt && ` · ${bnDate(d.decidedAt)}`}</div>
          <p className="mt-1 text-[13px] font-semibold leading-[1.65] text-pretty" style={{ color: v.outcomeFg }}>
            {v.outcome}
          </p>
          {d.decisionReason && <p className="mt-1.5 text-[12.5px] leading-[1.7] text-ink text-pretty">কারণ: {d.decisionReason}</p>}
        </div>
      </div>
    </section>
  );
}
