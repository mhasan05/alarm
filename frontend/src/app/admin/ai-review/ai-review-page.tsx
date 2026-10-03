"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { StateCard } from "@/components/state-card";
import { bnDate } from "@/lib/db/format";
import { analysisStatus, nameBnOf, nextCode, profileOf, submissionsFor } from "@/lib/db/selectors";
import type { Database } from "@/lib/db/types";
import { useAdmin } from "../use-admin";
import { AiReviewView, type Analysis, type Finding } from "./ai-review-view";

function buildAnalysis(db: Database, profileId: string): Analysis | null {
  const p = profileOf(db, profileId);
  if (!p) return null;
  const accepted = submissionsFor(db, profileId).filter((s) => s.state === "Accepted");
  const staff: Finding[] = accepted.map((s) => ({
    id: s.code,
    kind: "staff",
    category: s.category,
    title: s.title,
    meta: `${s.origin === "self" ? "নিজের দেওয়া তথ্য" : `${nameBnOf(db, s.staffId ?? "")} (${s.staffId})`} · ${s.source} · গৃহীত ${bnDate(s.decidedAt ?? s.submittedAt)}`,
    sources: Math.max(1, s.evidence.length),
    href: `/admin/field-reports/${s.code}`,
    suggested: "keep",
  }));
  const ai: Finding[] = db.aiFindings.filter((f) => f.profileId === profileId).map((f) => ({ ...f, kind: "ai" }));
  const existing = db.reports.find((r) => r.profileId === profileId);
  return {
    profileId,
    name: p.name,
    post: p.post,
    area: `${p.seat}, ${p.thana}`,
    wards: p.wards,
    audit: p.audit.code,
    staffCount: new Set(accepted.map((s) => s.staffId).filter(Boolean)).size,
    findings: [...staff, ...ai],
    reportCode: existing?.code ?? nextCode(db.reports.map((r) => r.code), "RPT-2026", 4),
    version: (existing?.versions[0]?.v ?? 0) + 1,
  };
}

/** Without a profile: a picker. With one: the analysis, or the rule that blocks it. */
export function AiReviewPage({ profileId }: { profileId?: string }) {
  const { db, admin, adminId } = useAdmin();
  // Once a report is cut here, keep showing the result instead of the "up to date" gate.
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);

  if (!profileId) {
    const rows = db.profiles.map((p) => ({ p, st: analysisStatus(db, p.id) }));
    return (
      <>
        <PageHeader crumb="অ্যাডমিন পোর্টাল / এআই বিশ্লেষণ" title={<>AI Analysis · <span className="font-bn">এআই বিশ্লেষণ</span></>} />
        <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
          <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[15px] font-semibold text-ink">Choose a profile</h2>
              <p className="mt-0.5 text-[12px] text-muted">The analysis runs once a profile has accepted data and nothing waiting in review.</p>
            </div>
            <ul>
              {rows.map(({ p, st }) => (
                <li key={p.id} className="relative flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5 last:border-b-0 hover:bg-surface/40">
                  <span className="flex size-9 flex-none items-center justify-center rounded-full bg-primary/12 font-bn text-[13px] font-semibold text-primary">{p.initial}</span>
                  <div className="min-w-[200px] flex-1">
                    <Link href={`/admin/ai-review?profile=${p.id}`} className="font-bn text-[14px] font-semibold text-ink after:absolute after:inset-0 hover:text-primary">
                      {p.name}
                    </Link>
                    <div className="text-[12px] text-muted">
                      {p.id} · {st.accepted} accepted{st.report ? ` · ${st.report.code} v${st.report.versions[0].v}` : ""}
                    </div>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${
                      st.ready ? "bg-success/10 text-success" : st.pending ? "bg-warning/10 text-warning" : "bg-surface text-muted"
                    }`}
                  >
                    {st.ready ? "Ready" : st.pending ? `${st.pending} in review` : st.accepted ? "Up to date" : "No accepted data"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </>
    );
  }

  const p = profileOf(db, profileId);
  const st = analysisStatus(db, profileId);
  const analysis = buildAnalysis(db, profileId);
  const back = `/admin/politicians/${profileId}`;
  const header = (
    <PageHeader
      backHref={back}
      crumb={
        <>
          <Link href="/admin/ai-review" className="text-primary hover:text-primary-hover">
            এআই বিশ্লেষণ
          </Link>{" "}
          / {p ? p.audit.code : profileId}
        </>
      }
      title={<span className="font-bn">{p?.name ?? "Profile not found"}</span>}
    />
  );
  const gate = (tone: "warning" | "neutral", title: string, body: string, actions: { label: string; href: string; kind?: "primary" | "secondary" }[]) => (
    <>
      {header}
      <div className="flex flex-1 flex-col px-4 pt-[22px] pb-9 sm:px-7">
        <section className="mx-auto w-full max-w-lg rounded-card border border-line bg-white shadow-card">
          <StateCard tone={tone} icon={tone === "warning" ? "◔" : "⌕"} title={title} body={body} actions={actions} />
        </section>
      </div>
    </>
  );

  if (!p || !analysis) return gate("neutral", "প্রোফাইলটি পাওয়া যায়নি", "ঠিকানাটি ভুল অথবা প্রোফাইলটি আর নেই।", [{ label: "প্রোফাইল বেছে নিন", href: "/admin/ai-review" }]);
  if (generatedFor === profileId) return <AiReviewView key={profileId} analysis={analysis} admin={admin?.name ?? "Admin"} adminId={adminId} onGenerated={() => {}} />;
  if (st.pending)
    return gate(
      "warning",
      "বিশ্লেষণ শুরু করা যাবে না",
      `এই প্রোফাইলে ${new Intl.NumberFormat("bn-BD").format(st.pending)}টি জমা এখনও পর্যালোচকের কাছে আছে। সারি খালি হলে বিশ্লেষণ চালু হবে।`,
      [
        { label: "প্রোফাইলের জমাগুলো দেখুন", href: back },
        { label: "অন্য প্রোফাইল", href: "/admin/ai-review", kind: "secondary" },
      ],
    );
  if (!st.accepted)
    return gate("neutral", "বিশ্লেষণের জন্য কোনো তথ্য নেই", "এই প্রোফাইলে এখনও কোনো গৃহীত জমা নেই। মাঠকর্মী নিয়োগ দিন এবং পর্যালোচক সিদ্ধান্ত দিলে বিশ্লেষণ চালু হবে।", [
      { label: "প্রোফাইলে ফিরুন", href: back },
    ]);
  if (!st.ready && st.report)
    return gate(
      "neutral",
      "প্রতিবেদন হালনাগাদ আছে",
      `${st.report.code} v${st.report.versions[0].v} সর্বশেষ গৃহীত তথ্য থেকেই তৈরি। নতুন তথ্য গৃহীত হলে নতুন সংস্করণ তৈরি করা যাবে।`,
      [
        { label: "প্রতিবেদন দেখুন", href: `/admin/reports/${st.report.code}` },
        { label: "অন্য প্রোফাইল", href: "/admin/ai-review", kind: "secondary" },
      ],
    );

  return <AiReviewView key={profileId} analysis={analysis} admin={admin?.name ?? "Admin"} adminId={adminId} onGenerated={() => setGeneratedFor(profileId)} />;
}
