"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { StatTiles } from "@/components/charts";
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
    { label: "ACTIVE REVIEWERS", value: String(active.length), color: "#0D1F17", note: `সক্রিয় · ${REVIEWERS.length - active.length} unavailable`, href: "/admin/reviewers?tab=active" },
    { label: "WAITING IN QUEUES", value: String(queue), color: "#D97706", note: stranded ? `পর্যালোচনার অপেক্ষায় · ${stranded} with an unavailable reviewer` : "পর্যালোচনার অপেক্ষায়" },
    { label: "DECIDED THIS MONTH", value: String(decided), color: "#1A7A4A", note: `সিদ্ধান্ত · ${rate}% accepted` },
    { label: "AVG DECISION TIME", value: `${avgHours}h`, color: "#1D6FC0", note: "গড় সময় · submission to decision" },
  ];

  // Districts where field staff collect, and how many active reviewers cover each.
  const districts = [...new Set(db.profiles.map((s) => s.district))].map((d) => ({
    name: d,
    reviewers: active.filter((r) => r.areas.some((a) => a.startsWith(d))).map((r) => r.name),
  }));
  const uncovered = districts.filter((d) => d.reviewers.length === 0).map((d) => d.name);

  // Latest decisions across all reviewers.
  const recent = REVIEWERS.flatMap((r) => decisionsBy(db, r.id).map((f) => ({ f, r })))
    .sort((a, b) => b.f.decidedAt!.localeCompare(a.f.decidedAt!))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        crumb="অ্যাডমিন পোর্টাল / পর্যালোচক"
        title={
          <>
            Reviewers · <span className="font-bn">পর্যালোচক</span>
            <span className="mt-1 block text-[12.5px] font-normal text-muted max-md:hidden">
              {active.length} active · {queue} submissions waiting across all queues
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
              + Add Reviewer
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <Link
          href="/admin/reviewers/new"
          className="inline-flex h-11 items-center justify-center rounded-button bg-primary text-[14px] font-semibold text-white hover:bg-primary-hover md:hidden"
        >
          + Add Reviewer
        </Link>

        <StatTiles stats={stats} linkAs={Link} />

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,415px)]">
          <ReviewersView key={initialTab} reviewers={REVIEWERS} initialTab={initialTab} />

          <div className="flex flex-col gap-5">
            <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
              <h2 className="text-[15px] font-semibold text-ink">District Coverage</h2>
              <p className="mt-0.5 font-bn text-[12px] text-muted">জেলাভিত্তিক পর্যালোচক</p>
              <ul className="mt-3">
                {districts.map((d) => (
                  <li key={d.name} className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
                    <span className="font-bn text-[13.5px] font-semibold text-ink">{d.name}</span>
                    <span className={`text-right text-[12px] ${d.reviewers.length ? "text-muted" : "font-semibold text-danger"}`}>
                      {d.reviewers.length ? d.reviewers.join(", ") : "No active reviewer"}
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
                    Submissions from <span className="font-bn">{uncovered.join(", ")}</span> have no active reviewer.{" "}
                    <Link href="/admin/settings?tab=coverage" className="font-semibold text-primary hover:text-primary-hover">
                      Assign coverage
                    </Link>
                  </span>
                </p>
              )}
            </section>

            <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
              <div className="px-5 pt-4">
                <h2 className="text-[15px] font-semibold text-ink">Recent Decisions</h2>
                <p className="mt-0.5 font-bn text-[12px] text-muted">সাম্প্রতিক সিদ্ধান্ত</p>
              </div>
              {recent.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-muted">No decisions yet.</p>
              ) : (
                <ol className="px-5 pt-2">
                  {recent.map(({ f, r }) => (
                    <li key={f.code} className="relative flex gap-3 border-b border-line py-3 last:border-b-0">
                      <span className={`mt-[6px] size-2 flex-none rounded-full ${f.state === "Accepted" ? "bg-success" : "bg-danger"}`} aria-hidden="true" />
                      <div>
                        <Link href={`/admin/field-reports/${f.code}`} className="text-[13px] leading-normal text-ink after:absolute after:inset-0 hover:text-primary">
                          {r.name} · {f.state === "Accepted" ? "accepted" : f.state === "Held" ? "held" : "rejected"} {f.code}
                        </Link>
                        <div className="mt-0.5 font-bn text-[11.5px] text-muted">{f.title}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <div className="border-t border-line px-5 py-3.5">
                <Link href="/admin/settings?tab=audit" className="text-[13px] font-semibold text-primary hover:text-primary-hover">
                  View full audit trail →
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
