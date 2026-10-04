"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { AccountActions, StaffStatusBadge, type AccountStatus } from "@/components/account-actions";
import { RecordMissing } from "@/components/record-missing";
import { resetPassword, setReviewerStatus } from "@/lib/db/actions";
import { bn, bnDate, phoneMasked } from "@/lib/db/format";
import { decisionsBy, nameOf, STATE_CHIP } from "@/lib/db/selectors";
import type { ReviewerStatus, SubmissionState } from "@/lib/db/types";
import { useAdmin } from "../../use-admin";
import { reviewerRows } from "../rows";

const STATE_STYLE: Record<SubmissionState, { cls: string; dot: string }> = {
  Accepted: { cls: STATE_CHIP.Accepted.cls, dot: "bg-success" },
  Pending: { cls: STATE_CHIP.Pending.cls, dot: "bg-warning" },
  Rejected: { cls: STATE_CHIP.Rejected.cls, dot: "bg-danger" },
};

const card = "rounded-card border border-line bg-white shadow-card";

export function ReviewerDetailView({ id }: { id: string }) {
  const { db, adminId } = useAdmin();
  const r = reviewerRows(db).find((x) => x.id === id);
  if (!r) return <RecordMissing title="নির্বাহী সম্পাদক পাওয়া যায়নি" backHref="/admin/reviewers" backLabel="নির্বাহী সম্পাদক তালিকায় ফিরুন" />;

  const decisions = decisionsBy(db, r.id);
  const reports = db.reports.filter((rep) => rep.reviewerId === r.id);
  const signed = reports.filter((rep) => rep.state === "approved");
  const awaiting = reports.filter((rep) => rep.state !== "approved");

  const stats = [
    { label: "অপেক্ষায়", value: bn(r.queue), color: r.queue >= 5 ? "#D97706" : "#0D1F17", note: `যাচাই বাকি · সবচেয়ে পুরোনো ${bn(r.oldest)} দিন` },
    { label: "এই মাসে সিদ্ধান্ত", value: bn(r.decidedMonth), color: "#1A7A4A", note: "গ্রহণ ও বাতিল মিলিয়ে" },
    { label: "গ্রহণের হার", value: `${bn(r.acceptRate)}%`, color: "#0D1F17", note: "এই মাসে গ্রহণ হয়েছে" },
    { label: "সিদ্ধান্তের গড় সময়", value: `${bn(r.avgHours)} ঘণ্টা`, color: r.avgHours > 24 ? "#D97706" : "#1D6FC0", note: r.avgHours > 24 ? "২৪ ঘণ্টার লক্ষ্যের চেয়ে ধীর" : "২৪ ঘণ্টার লক্ষ্যের মধ্যে" },
    { label: "সই করা প্রতিবেদন", value: bn(signed.length), color: "#1A7A4A", note: "অনুমোদন ও সই শেষ" },
    { label: "সইয়ের অপেক্ষায়", value: bn(awaiting.length), color: awaiting.length ? "#D97706" : "#0D1F17", note: "অনুমোদনের অপেক্ষায়" },
  ];

  const facts = [
    { k: "ALARM আইডি", v: r.id },
    { k: "মোবাইল", v: phoneMasked(r.phone) },
    { k: "ইমেইল", v: r.email },
    { k: "এনআইডি", v: `${r.nid} · লুকানো` },
    { k: "যোগ দিয়েছেন", v: bnDate(r.joined) },
  ];

  return (
    <>
      <PageHeader
        backHref="/admin/reviewers"
        crumb={
          <>
            <Link href="/admin/reviewers" className="text-primary hover:text-primary-hover">
              নির্বাহী সম্পাদক
            </Link>{" "}
            / {r.id}
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {r.nameBn || r.name}
            <StaffStatusBadge status={r.status as AccountStatus} />
            <span className="rounded-md bg-role-reviewer/10 px-2 py-0.5 text-[12px] font-medium text-role-reviewer">নির্বাহী সম্পাদক</span>
            <span className="block w-full font-bn text-[12.5px] font-normal text-muted max-md:hidden">
              {bn(r.areas.length)}টি দায়িত্বের এলাকা
            </span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={`/admin/reviewers/new?edit=${r.id}`}
              className="inline-flex h-10 items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary hover:bg-surface"
            >
              প্রোফাইল এডিট
            </Link>
            <Link
              href="/admin/settings?tab=coverage"
              className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
            >
              এলাকা দিন
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
                <dt className="text-[10.5px] font-semibold text-muted">{f.k}</dt>
                <dd className="mt-1 break-words font-bn text-[13.5px] font-semibold text-ink">{f.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
          {stats.map((st) => (
            <div key={st.label} className={`${card} p-3 md:p-[18px]`}>
              <div className="text-[11px] font-semibold text-muted">{st.label}</div>
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
              <h2 className="text-[15px] font-semibold text-ink">দায়িত্বের এলাকা</h2>
              <p className="mt-0.5 font-bn text-[12px] text-muted">এসব এলাকার জমা এই নির্বাহী সম্পাদকের কাছে আসে</p>
            </div>
            <Link href="/admin/settings?tab=coverage" className="text-[13px] font-semibold text-primary hover:text-primary-hover">
              এলাকা বদলান →
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
              <h2 className="text-[15px] font-semibold text-ink">সাম্প্রতিক সিদ্ধান্ত</h2>
            </div>
            {decisions.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-muted">এখনও কোনো সিদ্ধান্তের রেকর্ড নেই।</p>
            ) : (
              <ul className="px-5 pt-2 pb-2">
                {decisions.slice(0, 6).map((f) => (
                  <li key={f.code} className="relative flex cursor-pointer gap-3 border-b border-line py-3 last:border-b-0 hover:bg-surface/60">
                    <span className={`mt-[7px] size-2 flex-none rounded-full ${STATE_STYLE[f.state].dot}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/submissions/${f.code}`} className="font-bn text-[13.5px] text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary">
                        {f.title}
                      </Link>
                      <div className="mt-0.5 font-bn text-[11.5px] text-muted">
                        {f.code} · {f.origin === "self" ? "নিজের দেওয়া তথ্য" : `${nameOf(db, f.staffId ?? "")} (${f.staffId})`} · {bn(f.evidence.length)}টি প্রমাণ
                      </div>
                    </div>
                    <span className={`h-fit whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${STATE_STYLE[f.state].cls}`}>{STATE_CHIP[f.state].label}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-5">
            <section className={`${card} overflow-hidden`}>
              <div className="px-5 pt-4">
                <h2 className="text-[15px] font-semibold text-ink">চূড়ান্ত প্রতিবেদন</h2>
                <p className="mt-0.5 font-bn text-[12px] text-muted">অনুমোদন ও সই</p>
              </div>
              {reports.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-muted">সইয়ের জন্য কোনো প্রতিবেদন দেওয়া হয়নি।</p>
              ) : (
                <ul className="px-5 pt-2 pb-2">
                  {reports.map((rep) => (
                    <li key={rep.code} className="relative flex cursor-pointer items-center gap-3 border-b border-line py-3 last:border-b-0 hover:bg-surface/60">
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/reports/${rep.code}`} className="font-mono text-[12.5px] font-semibold text-primary after:absolute after:inset-0 after:content-[''] hover:text-primary-hover">
                          {rep.code}
                        </Link>
                        <div className="font-bn text-[12px] text-muted">{rep.subject.name}</div>
                      </div>
                      <span
                        className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
                          rep.state === "approved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}
                      >
                        {rep.state === "approved" ? "সই করা হয়েছে" : "সইয়ের অপেক্ষায়"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <AccountActions
              name={r.nameBn || r.name}
              status={r.status as AccountStatus}
              maskedPhone={phoneMasked(r.phone)}
              open={r.queue}
              activeLabel="Active"
              openNoun="অপেক্ষায় থাকা জমা"
              onStatus={(st) => setReviewerStatus(r.id, adminId, st as ReviewerStatus)}
              onReset={() => resetPassword(r.id, adminId)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
