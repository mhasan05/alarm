"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { AccountActions, StaffStatusBadge, type AccountStatus } from "@/components/account-actions";
import { RecordMissing } from "@/components/record-missing";
import { resetPassword, setReviewerStatus } from "@/lib/db/actions";
import { enDate, phoneMasked } from "@/lib/db/format";
import { alarmIdOf, decisionsBy, nameOf, STATE_EN } from "@/lib/db/selectors";
import type { ReviewerStatus, SubmissionState } from "@/lib/db/types";
import { useAdmin } from "../../use-admin";
import { reviewerRows } from "../rows";

const STATE_STYLE: Record<SubmissionState, { cls: string; dot: string }> = {
  Accepted: { cls: STATE_EN.Accepted.cls, dot: "bg-success" },
  Pending: { cls: STATE_EN.Pending.cls, dot: "bg-warning" },
  Held: { cls: STATE_EN.Held.cls, dot: "bg-danger" },
  Rejected: { cls: STATE_EN.Rejected.cls, dot: "bg-danger" },
  Withdrawn: { cls: STATE_EN.Withdrawn.cls, dot: "bg-muted" },
};

const card = "rounded-card border border-line bg-white shadow-card";

export function ReviewerDetailView({ id }: { id: string }) {
  const { db, adminId } = useAdmin();
  const r = reviewerRows(db).find((x) => x.id === id);
  if (!r) return <RecordMissing title="পর্যালোচক পাওয়া যায়নি" backHref="/admin/reviewers" backLabel="পর্যালোচক তালিকায় ফিরুন" />;

  const decisions = decisionsBy(db, r.id);
  const reports = db.reports.filter((rep) => rep.reviewerId === r.id);
  const signed = reports.filter((rep) => rep.state === "approved");
  const awaiting = reports.filter((rep) => rep.state !== "approved");

  const stats = [
    { label: "IN QUEUE", value: String(r.queue), color: r.queue >= 5 ? "#D97706" : "#0D1F17", note: `অপেক্ষমাণ · oldest ${r.oldest} day${r.oldest === 1 ? "" : "s"}` },
    { label: "DECIDED THIS MONTH", value: String(r.decidedMonth), color: "#1A7A4A", note: "সিদ্ধান্ত · accepted and rejected" },
    { label: "ACCEPT RATE", value: `${r.acceptRate}%`, color: "#0D1F17", note: "গৃহীত · this month" },
    { label: "AVG DECISION TIME", value: `${r.avgHours}h`, color: r.avgHours > 24 ? "#D97706" : "#1D6FC0", note: `গড় সময় · ${r.avgHours > 24 ? "slower than the 24h target" : "within the 24h target"}` },
    { label: "REPORTS SIGNED", value: String(signed.length), color: "#1A7A4A", note: "স্বাক্ষরিত প্রতিবেদন" },
    { label: "AWAITING SIGN-OFF", value: String(awaiting.length), color: awaiting.length ? "#D97706" : "#0D1F17", note: "অনুমোদনের অপেক্ষায়" },
  ];

  const facts = [
    { k: "ALARM ID", v: alarmIdOf(db, r.id) || "Not issued — no sign-in yet" },
    { k: "REVIEWER ID", v: r.id },
    { k: "MOBILE", v: phoneMasked(r.phone) },
    { k: "EMAIL", v: r.email },
    { k: "NID", v: `${r.nid} · গোপনকৃত` },
    { k: "JOINED", v: enDate(r.joined) },
  ];

  return (
    <>
      <PageHeader
        backHref="/admin/reviewers"
        crumb={
          <>
            <Link href="/admin/reviewers" className="text-primary hover:text-primary-hover">
              Reviewers
            </Link>{" "}
            / {r.id}
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {r.name}
            <StaffStatusBadge status={r.status as AccountStatus} />
            <span className="rounded-md bg-role-reviewer/10 px-2 py-0.5 text-[12px] font-medium text-role-reviewer">Reviewer</span>
            <span className="block w-full font-bn text-[12.5px] font-normal text-muted max-md:hidden">
              {r.nameBn} · {r.areas.length} coverage area{r.areas.length === 1 ? "" : "s"}
            </span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={`/admin/reviewers/new?edit=${r.id}`}
              className="inline-flex h-10 items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary hover:bg-surface"
            >
              Edit profile
            </Link>
            <Link
              href="/admin/settings?tab=coverage"
              className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
            >
              Assign coverage
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        {r.note && (
          <p role="note" className="rounded-card border border-warning/40 bg-warning/8 px-5 py-3 font-bn text-[13px] text-ink">
            {r.note}
          </p>
        )}

        <section className={`${card} flex flex-wrap gap-5 px-5 py-5`}>
          <div className="flex size-[86px] flex-none items-center justify-center rounded-lg bg-role-reviewer/10 text-[26px] font-semibold text-role-reviewer">{r.initials}</div>
          <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
            {facts.map((f) => (
              <div key={f.k} className="min-w-0">
                <dt className="text-[10.5px] font-semibold tracking-[0.06em] text-muted">{f.k}</dt>
                <dd className="mt-1 break-words font-bn text-[13.5px] font-semibold text-ink">{f.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
          {stats.map((st) => (
            <div key={st.label} className={`${card} p-3 md:p-[18px]`}>
              <div className="text-[11px] font-semibold tracking-[0.04em] text-muted">{st.label}</div>
              <div className="mt-1.5 text-[22px] font-bold leading-none md:text-[26px]" style={{ color: st.color }}>
                {st.value}
              </div>
              <div className="mt-1.5 font-bn text-[11.5px] leading-snug text-muted max-md:hidden">{st.note}</div>
            </div>
          ))}
        </div>

        <section className={`${card} px-5 py-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Coverage Areas</h2>
              <p className="mt-0.5 font-bn text-[12px] text-muted">দায়িত্বের এলাকা · submissions from here reach this reviewer</p>
            </div>
            <Link href="/admin/settings?tab=coverage" className="text-[13px] font-semibold text-primary hover:text-primary-hover">
              Change coverage →
            </Link>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {r.areas.map((a) => (
              <li key={a} className="rounded-md bg-surface px-3 py-1.5 font-bn text-[13px] text-ink">
                {a}
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,536px)]">
          <section className={`${card} overflow-hidden`}>
            <div className="px-5 pt-4">
              <h2 className="text-[15px] font-semibold text-ink">Recent Decisions</h2>
              <p className="mt-0.5 font-bn text-[12px] text-muted">সাম্প্রতিক সিদ্ধান্ত</p>
            </div>
            {decisions.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-muted">No decisions on record yet.</p>
            ) : (
              <ul className="px-5 pt-2 pb-2">
                {decisions.slice(0, 6).map((f) => (
                  <li key={f.code} className="relative flex gap-3 border-b border-line py-3 last:border-b-0">
                    <span className={`mt-[7px] size-2 flex-none rounded-full ${STATE_STYLE[f.state].dot}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/field-reports/${f.code}`} className="font-bn text-[13.5px] text-ink after:absolute after:inset-0 hover:text-primary">
                        {f.title}
                      </Link>
                      <div className="mt-0.5 font-bn text-[11.5px] text-muted">
                        {f.code} · {f.origin === "self" ? "নিজের দেওয়া তথ্য" : `${nameOf(db, f.staffId ?? "")} (${f.staffId})`} · {f.evidence.length} items
                      </div>
                    </div>
                    <span className={`h-fit whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${STATE_STYLE[f.state].cls}`}>{STATE_EN[f.state].label}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-5">
            <section className={`${card} overflow-hidden`}>
              <div className="px-5 pt-4">
                <h2 className="text-[15px] font-semibold text-ink">Final Reports</h2>
                <p className="mt-0.5 font-bn text-[12px] text-muted">চূড়ান্ত প্রতিবেদন · sign-off</p>
              </div>
              {reports.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-muted">No reports assigned for sign-off.</p>
              ) : (
                <ul className="px-5 pt-2 pb-2">
                  {reports.map((rep) => (
                    <li key={rep.code} className="relative flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/reports/${rep.code}`} className="font-mono text-[12.5px] font-semibold text-primary after:absolute after:inset-0 hover:text-primary-hover">
                          {rep.code}
                        </Link>
                        <div className="font-bn text-[12px] text-muted">{rep.subject.name}</div>
                      </div>
                      <span
                        className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
                          rep.state === "approved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}
                      >
                        {rep.state === "approved" ? "Signed" : "Awaiting sign-off"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <AccountActions
              name={r.name}
              status={r.status as AccountStatus}
              maskedPhone={phoneMasked(r.phone)}
              open={r.queue}
              activeLabel="Active"
              openNoun="waiting submission"
              onStatus={(st) => setReviewerStatus(r.id, adminId, st as ReviewerStatus)}
              onReset={() => resetPassword(r.id, adminId)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
