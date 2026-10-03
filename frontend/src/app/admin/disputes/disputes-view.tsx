"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { inputClass } from "@/components/form";
import { decideDispute, undoDisputeDecision } from "@/lib/db/actions";
import { bnDate, bnDayMonth, daysSince, enAge } from "@/lib/db/format";
import { nameBnOf, nameOf, profileOf, submissionOf } from "@/lib/db/selectors";
import type { Database, Dispute, DisputeState } from "@/lib/db/types";
import { useAdmin } from "../use-admin";

type DisputeOutcome = "kept" | "response" | "removed";
const TO_STATE: Record<DisputeOutcome, Exclude<DisputeState, "Open">> = { kept: "Kept", response: "Response", removed: "Removed" };
const FROM_STATE: Record<Exclude<DisputeState, "Open">, DisputeOutcome> = { Kept: "kept", Response: "response", Removed: "removed" };

/** One dispute as the admin card shows it. */
type AdminDispute = {
  code: string;
  profileId: string;
  name: string;
  post: string;
  area: string;
  reason: string;
  filed: string;
  hoursOpen: number;
  openLabel: string;
  report: { code: string; category: "ইতিবাচক" | "নেতিবাচক"; by: string; accepted: string; title: string; source: string };
  claim: string;
  attachments: string;
  decision?: { outcome: DisputeOutcome; reason: string; by: string; when: string };
};

function toCard(db: Database, d: Dispute): AdminDispute {
  const p = profileOf(db, d.profileId);
  const s = submissionOf(db, d.submissionCode);
  return {
    code: d.code,
    profileId: d.profileId,
    name: p?.name ?? d.profileId,
    post: p?.post ?? "",
    area: p ? `${p.seat}, ${p.thana}` : "",
    reason: d.reason,
    filed: bnDate(d.filedAt),
    hoursOpen: daysSince(d.filedAt) * 24,
    openLabel: enAge(d.filedAt),
    report: {
      code: d.submissionCode,
      category: s?.category ?? "নেতিবাচক",
      by: s?.origin === "self" ? "নিজের দেওয়া তথ্য" : s?.staffId ? `${nameBnOf(db, s.staffId)} (${s.staffId})` : "—",
      accepted: s?.decidedAt ? bnDayMonth(s.decidedAt) : "—",
      title: s?.title ?? d.submissionCode,
      source: s?.source ?? "",
    },
    claim: d.claim,
    attachments: d.attachments.length ? `${d.attachments.length}টি নথি · ${d.attachments.join(", ")}` : "নেই",
    decision:
      d.state === "Open"
        ? undefined
        : { outcome: FROM_STATE[d.state], reason: d.decisionReason ?? "", by: nameOf(db, d.decidedBy ?? ""), when: d.decidedAt ? bnDate(d.decidedAt) : "" },
  };
}

const disputedReportHref = (d: AdminDispute) => `/admin/field-reports/${d.report.code}`;
import { CATEGORY_STYLE } from "@/lib/db/selectors";

export type Tab = "open" | "resolved" | "all";
const TAB_LABEL: Record<Tab, string> = { open: "Open", resolved: "Resolved", all: "All" };

const OUTCOME: Record<DisputeOutcome, { label: string; button: string; fg: string; bg: string; notice: string }> = {
  kept: {
    label: "রিপোর্ট বহাল",
    button: "Keep report",
    fg: "#4A7060",
    bg: "rgba(74,112,96,0.10)",
    notice: "Report kept unchanged on the profile. The political activist is notified with your reason.",
  },
  response: {
    label: "বক্তব্য যুক্ত হয়েছে",
    button: "Add their response",
    fg: "#1D6FC0",
    bg: "rgba(29,111,192,0.10)",
    notice: "Their response is added under the report; the finding stays and still counts in the score.",
  },
  removed: {
    label: "রিপোর্ট সরানো হয়েছে",
    button: "Remove report",
    fg: "#1A7A4A",
    bg: "rgba(26,122,74,0.10)",
    notice: "Report withdrawn from the profile and the score. It stays on record.",
  },
};

/** The dispute queue. Decisions need a written reason and can be undone during the session. */
export function DisputesView({ initialTab }: { initialTab: Tab }) {
  const router = useRouter();
  const pathname = usePathname();
  const { db, adminId } = useAdmin();
  const [tab, setTab] = useState<Tab>(initialTab);
  // Decided in this visit: kept on the Open list with Undo until the tab changes.
  const [decidedHere, setDecidedHere] = useState<string[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);

  const all = db.disputes.map((d) => toCard(db, d));
  const open = all.filter((d) => !d.decision).sort((a, b) => b.hoursOpen - a.hoursOpen);
  const resolved = all.filter((d) => d.decision);
  const lists: Record<Tab, typeof all> = { open, resolved, all: [...open, ...resolved] };
  // Cards decided this session stay in place on the Open list (with Undo) until the tab changes.
  const openShown = all.filter((d) => !d.decision || pinned.includes(d.code)).sort((a, b) => b.hoursOpen - a.hoursOpen);

  const switchTab = (t: Tab) => {
    setTab(t);
    setPinned([]);
    router.replace(t === "open" ? pathname : `${pathname}?tab=${t}`, { scroll: false });
  };

  const decide = (code: string, outcome: DisputeOutcome, reason: string) => {
    decideDispute(code, adminId, TO_STATE[outcome], reason);
    setDecidedHere((x) => [...x, code]);
    if (tab === "open") setPinned((p) => [...p, code]);
  };
  const undo = (code: string) => {
    undoDisputeDecision(code, adminId);
    setDecidedHere((x) => x.filter((c) => c !== code));
  };

  const shown = tab === "open" ? openShown : lists[tab];

  return (
    <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Dispute queue</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            <span className="font-bn">পুরোনো অভিযোগ আগে</span> · oldest first
          </p>
        </div>
        <div role="tablist" aria-label="Dispute lists" className="flex flex-wrap gap-2">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
            const on = tab === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => switchTab(t)}
                className={`flex h-9 cursor-pointer items-center gap-2 rounded-button border px-3.5 text-[13px] font-semibold ${
                  on ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:border-primary hover:text-primary"
                }`}
              >
                {TAB_LABEL[t]}
                <span className={`rounded-[9px] px-[7px] py-px text-[11px] ${on ? "bg-white/20 text-white" : "bg-surface text-muted"}`}>
                  {lists[t].length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-[14px] font-semibold text-ink">{tab === "open" ? "No open disputes" : "Nothing here yet"}</p>
          <p className="mt-1 font-bn text-[12.5px] text-muted">
            {tab === "open" ? "সব অভিযোগের সিদ্ধান্ত দেওয়া হয়েছে।" : "সিদ্ধান্ত দেওয়া অভিযোগ এখানে দেখা যাবে।"}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
          {shown.map((d) => (
            <DisputeCard key={d.code} dispute={d} justDecided={decidedHere.includes(d.code)} onDecide={decide} onUndo={undo} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DisputeCard({
  dispute: d,
  justDecided,
  onDecide,
  onUndo,
}: {
  dispute: AdminDispute;
  justDecided: boolean;
  onDecide: (code: string, outcome: DisputeOutcome, reason: string) => void;
  onUndo: (code: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);
  const overdue = !d.decision && d.hoursOpen > 48;
  const reportHref = disputedReportHref(d);
  const cat = CATEGORY_STYLE[d.report.category];
  const out = d.decision && OUTCOME[d.decision.outcome];
  const reasonId = `${d.code}-reason`;

  const submit = (outcome: DisputeOutcome) => {
    if (!reason.trim()) {
      setError(true);
      document.getElementById(reasonId)?.focus();
      return;
    }
    onDecide(d.code, outcome, reason.trim());
  };

  return (
    <li
      className={`rounded-card border border-l-[3px] border-line p-4 sm:p-5 ${
        d.decision ? "border-l-line bg-[#FAFDFC]" : overdue ? "border-l-danger" : "border-l-warning"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[12px] font-semibold text-ink">{d.code}</span>
        <span className="rounded-md bg-surface px-2 py-0.5 font-bn text-[12px] text-ink">{d.reason}</span>
        {!d.decision && (
          <span className={`text-[12px] font-semibold ${overdue ? "text-danger" : "text-muted"}`}>{d.openLabel}</span>
        )}
        <span
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-bn text-[12px]"
          style={out ? { color: out.fg, background: out.bg } : { color: "#D97706", background: "rgba(217,119,6,0.10)" }}
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {out ? out.label : "অ্যাডমিনের সিদ্ধান্তের অপেক্ষায়"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-surface font-bn text-[14px] font-semibold text-primary">
          {d.name.replace(/^মোঃ\s*/, "").slice(0, 1)}
        </span>
        <div className="min-w-0">
          <Link href={`/admin/politicians/${d.profileId}`} className="font-bn text-[14.5px] font-semibold text-ink hover:text-primary">
            {d.name}
          </Link>
          <p className="font-bn text-[12px] text-muted">
            {d.post} · {d.area} · জমা {d.filed}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-card border border-line bg-surface/70 px-4 py-3.5">
        <div className="text-[10.5px] font-semibold tracking-[0.06em] text-muted">DISPUTED REPORT</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-bn text-[12px]" style={{ color: cat.fg, background: cat.bg }}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {d.report.category}
          </span>
          <span className="font-bn text-[12px] text-muted">
            {d.report.by} · গৃহীত {d.report.accepted}
          </span>
        </div>
        {reportHref ? (
          <Link href={reportHref} className="mt-2 block font-bn text-[14px] font-semibold text-ink hover:text-primary">
            {d.report.title} <span className="font-sans text-[12px] font-normal text-primary">· {d.report.code} →</span>
          </Link>
        ) : (
          <p className="mt-2 font-bn text-[14px] font-semibold text-ink">
            {d.report.title} <span className="font-sans text-[12px] font-normal text-muted">· {d.report.code}</span>
          </p>
        )}
        <p className="mt-1 font-bn text-[12px] text-muted">{d.report.source}</p>
      </div>

      <div className="mt-4">
        <div className="text-[10.5px] font-semibold tracking-[0.06em] text-muted">
          THEIR CLAIM · <span className="font-bn">অভিযোগের বক্তব্য</span>
        </div>
        <p className="mt-1.5 font-bn text-[14px] leading-[1.7] text-ink">{d.claim}</p>
        <p className="mt-1 font-bn text-[12px] text-muted">সংযুক্তি: {d.attachments}</p>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        {d.decision && out ? (
          <div role="status">
            <div className="text-[10.5px] font-semibold tracking-[0.06em] text-muted">
              YOUR DECISION · <span className="font-bn">সিদ্ধান্ত</span>
            </div>
            <p className="mt-1.5 font-bn text-[13.5px] leading-[1.7] text-ink">{d.decision.reason}</p>
            <p className="mt-1 text-[12px] text-muted">
              {out.button} · {d.decision.by} (Admin) · <span className="font-bn">{d.decision.when}</span>
            </p>
            <p className="mt-2 text-[12px] text-muted">{out.notice}</p>
            {justDecided && (
              <button
                type="button"
                onClick={() => onUndo(d.code)}
                className="mt-2 cursor-pointer text-[12.5px] font-semibold text-primary hover:text-primary-hover"
              >
                Undo
              </button>
            )}
          </div>
        ) : (
          <>
            <label htmlFor={reasonId} className="sr-only">
              Reason for {d.code}
            </label>
            <textarea
              id={reasonId}
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setError(false);
              }}
              aria-invalid={error}
              aria-describedby={`${reasonId}-hint`}
              placeholder="সিদ্ধান্তের কারণ লিখুন — রাজনৈতিক কর্মী ও পর্যালোচক উভয়ে এটি দেখতে পাবেন।"
              className={`${inputClass} h-auto resize-y py-2.5 font-bn ${error ? "border-danger!" : ""}`}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p id={`${reasonId}-hint`} className={`font-bn text-[12px] ${error ? "text-danger" : "text-warning"}`}>
                {error ? "কারণ ছাড়া সিদ্ধান্ত নেওয়া যাবে না।" : "সিদ্ধান্ত নেওয়ার আগে কারণ লিখুন — প্রতিটি সিদ্ধান্ত লগে সংরক্ষিত হয়।"}
              </p>
              <div className="flex flex-wrap gap-2 max-sm:grid max-sm:w-full max-sm:grid-cols-1">
                {(["kept", "response", "removed"] as DisputeOutcome[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => submit(o)}
                    className={`h-9 cursor-pointer rounded-button border px-3.5 text-[13px] font-semibold ${
                      o === "kept"
                        ? "border-line bg-surface text-ink hover:border-primary"
                        : o === "response"
                          ? "border-line bg-white text-ink hover:border-primary hover:text-primary"
                          : "border-line bg-white text-ink hover:border-danger hover:text-danger"
                    }`}
                  >
                    {OUTCOME[o].button}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
