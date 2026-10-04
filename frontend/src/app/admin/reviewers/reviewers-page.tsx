"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { StatTiles } from "@/components/charts";
import { bn } from "@/lib/db/format";
import { decisionsBy, strandedCount } from "@/lib/db/selectors";
import { useAdmin } from "../use-admin";
import { reviewerRows } from "./rows";
import { ExportReviewers, ReviewersView, type Tab } from "./reviewers-view";

export function ReviewersPage({ initialTab }: { initialTab: Tab }) {
  const { db } = useAdmin();
  const REVIEWERS = reviewerRows(db);
  const active = REVIEWERS.filter((r) => r.status === "Active");
  const queue = REVIEWERS.reduce((n, r) => n + r.queue, 0);
  const stranded = strandedCount(db);
  const decided = Math.max(1, REVIEWERS.reduce((n, r) => n + r.decidedMonth, 0));
  const rate = Math.round(REVIEWERS.reduce((n, r) => n + r.acceptRate * r.decidedMonth, 0) / decided);
  const avgHours = Math.round(REVIEWERS.reduce((n, r) => n + r.avgHours * r.decidedMonth, 0) / decided);

  const stats = [
    { label: "কাজে থাকা নির্বাহী সম্পাদক", value: bn(active.length), color: "#0D1F17", note: `${bn(REVIEWERS.length - active.length)} জন কাজে নেই`, href: "/admin/reviewers?tab=active" },
    { label: "তালিকায় অপেক্ষায়", value: bn(queue), color: "#D97706", note: stranded ? `যাচাইয়ের অপেক্ষায় · ${bn(stranded)}টি কাজে না থাকা নির্বাহী সম্পাদকের কাছে আটকে` : "যাচাইয়ের অপেক্ষায়" },
    { label: "এই মাসে সিদ্ধান্ত", value: bn(decided), color: "#1A7A4A", note: `${bn(rate)}% গ্রহণ হয়েছে` },
    { label: "সিদ্ধান্তের গড় সময়", value: `${bn(avgHours)} ঘণ্টা`, color: "#1D6FC0", note: "জমা থেকে সিদ্ধান্ত পর্যন্ত" },
  ];

  // Districts where field staff collect, and how many active reviewers cover each.
  const districts = [...new Set(db.profiles.map((s) => s.district))].map((d) => ({
    name: d,
    reviewers: active.filter((r) => r.areas.some((a) => a.startsWith(d))).map((r) => r.nameBn || r.name),
  }));
  const uncovered = districts.filter((d) => d.reviewers.length === 0).map((d) => d.name);

  // Latest decisions across all reviewers.
  const recent = REVIEWERS.flatMap((r) => decisionsBy(db, r.id).map((f) => ({ f, r })))
    .sort((a, b) => b.f.decidedAt!.localeCompare(a.f.decidedAt!))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        crumb="প্রধান নির্বাহী সম্পাদক পোর্টাল / নির্বাহী সম্পাদক"
        title={
          <>
            নির্বাহী সম্পাদক
            <span className="mt-1 block text-[12.5px] font-normal text-muted max-md:hidden">
              {bn(active.length)} জন কাজে আছেন · সব তালিকা মিলিয়ে {bn(queue)}টি জমা অপেক্ষায়
            </span>
          </>
        }
        action={
          <div className="flex flex-wrap gap-2.5">
            <ExportReviewers reviewers={REVIEWERS} />
            <Link
              href="/admin/reviewers/new"
              className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
            >
              + নির্বাহী সম্পাদক যোগ করুন
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <Link
          href="/admin/reviewers/new"
          className="inline-flex h-11 items-center justify-center rounded-button bg-primary text-[14px] font-semibold text-white hover:bg-primary-hover md:hidden"
        >
          + নির্বাহী সম্পাদক যোগ করুন
        </Link>

        <StatTiles stats={stats} linkAs={Link} />

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,415px)]">
          <ReviewersView key={initialTab} reviewers={REVIEWERS} initialTab={initialTab} />

          <div className="flex flex-col gap-5">
            <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
              <h2 className="text-[15px] font-semibold text-ink">জেলা অনুযায়ী দায়িত্বের এলাকা</h2>
              <p className="mt-0.5 font-bn text-[12px] text-muted">কোন জেলায় কোন নির্বাহী সম্পাদক</p>
              <ul className="mt-3">
                {districts.map((d) => (
                  <li key={d.name} className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
                    <span className="font-bn text-[13.5px] font-semibold text-ink">{d.name}</span>
                    <span className={`text-right text-[12px] ${d.reviewers.length ? "text-muted" : "font-semibold text-danger"}`}>
                      {d.reviewers.length ? d.reviewers.join(", ") : "কাজে থাকা কোনো নির্বাহী সম্পাদক নেই"}
                    </span>
                  </li>
                ))}
              </ul>
              {uncovered.length > 0 && (
                <p className="mt-3 flex gap-2 border-t border-line pt-3 text-[12px] leading-relaxed text-muted text-pretty">
                  <span className="text-warning" aria-hidden="true">
                    ⚠
                  </span>
                  <span>
                    <span className="font-bn">{uncovered.join(", ")}</span> থেকে আসা জমার জন্য কাজে থাকা কোনো নির্বাহী সম্পাদক নেই।{" "}
                    <Link href="/admin/settings?tab=coverage" className="font-semibold text-primary hover:text-primary-hover">
                      এলাকা দিন
                    </Link>
                  </span>
                </p>
              )}
            </section>

            <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
              <div className="px-5 pt-4">
                <h2 className="text-[15px] font-semibold text-ink">সাম্প্রতিক সিদ্ধান্ত</h2>
              </div>
              {recent.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-muted">এখনও কোনো সিদ্ধান্ত নেই।</p>
              ) : (
                <ol className="px-5 pt-2">
                  {recent.map(({ f, r }) => (
                    <li key={f.code} className="relative flex cursor-pointer gap-3 border-b border-line py-3 last:border-b-0 hover:bg-surface/60">
                      <span className={`mt-[6px] size-2 flex-none rounded-full ${f.state === "Accepted" ? "bg-success" : "bg-danger"}`} aria-hidden="true" />
                      <div>
                        <Link href={`/admin/submissions/${f.code}`} className="text-[13px] leading-normal text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary">
                          {r.nameBn || r.name} · {f.code} {f.state === "Accepted" ? "গ্রহণ করেছেন" : "বাতিল করেছেন"}
                        </Link>
                        <div className="mt-0.5 font-bn text-[11.5px] text-muted">{f.title}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <div className="border-t border-line px-5 py-3.5">
                <Link href="/admin/settings?tab=audit" className="text-[13px] font-semibold text-primary hover:text-primary-hover">
                  পুরো অডিট লগ দেখুন →
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
