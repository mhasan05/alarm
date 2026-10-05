"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { bn, bnDate } from "@/lib/db/format";
import type { FinalReport, ReportFinding, ReportVersion } from "@/lib/db/types";

const refs = (r: number[]) => `সূত্র ${r.map(bn).join(", ")}`;

// Version titles, notes and dates may come from older English seed data; show them in Bengali.
const VERSION_TITLE_BN: Record<string, string> = {
  "Initial report": "প্রথম ভার্সন",
  "Re-analysed and re-cut": "আবার বিশ্লেষণ ও নতুন ভার্সন",
};
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Bengali title for a report version. */
export const versionTitle = (title: string) => VERSION_TITLE_BN[title] ?? title;
/** Bengali part of a "বাংলা · English" version note. */
export const versionWhy = (why: string) => why.split(" · ")[0];
/** Bengali date for a report version ("16 Sep 2026", an ISO date, or already Bengali). */
export function versionDate(date: string) {
  const m = /^(\d{1,2}) ([A-Za-z]{3})[A-Za-z]* (\d{4})$/.exec(date.trim());
  if (m) {
    const month = MONTHS.indexOf(m[2].toLowerCase());
    if (month >= 0) return bnDate(`${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}T12:00:00+06:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(date) && !Number.isNaN(Date.parse(date))) return bnDate(date);
  return bn(date);
}

function Section({ num, title, aside, tone, children }: { num: string; title: string; aside?: string; tone?: "pos" | "neg"; children: ReactNode }) {
  const band = tone === "pos" ? "border-l-success bg-success/8" : tone === "neg" ? "border-l-danger bg-danger/8" : "";
  return (
    <section className="mt-8 break-inside-avoid-page">
      <div
        className={`flex items-center justify-between gap-3 ${
          tone ? `rounded-button border-l-[3px] px-4 py-3 ${band}` : "border-b border-line pb-2.5"
        }`}
      >
        <h2 className="flex items-baseline gap-3 font-bn text-[16px] font-bold text-ink">
          <span className="text-[12px] font-semibold text-muted">{num}</span>
          {title}
        </h2>
        {aside && <span className={`font-bn text-[12.5px] font-semibold ${tone === "neg" ? "text-danger" : tone === "pos" ? "text-success" : "text-muted"}`}>{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function FindingItem({ f, tone }: { f: ReportFinding; tone: "pos" | "neg" }) {
  if (f.chain) {
    return (
      <li className="mt-4 rounded-card border border-line p-4 sm:p-5">
        <p className="font-bn text-[14.5px] font-bold leading-[1.7] text-ink">{f.text}</p>
        <span className="mt-2 inline-block rounded-md bg-primary/10 px-2 py-0.5 font-bn text-[12px] font-semibold text-primary">
          {bn(f.refs.length)}টি আলাদা সূত্র
        </span>
        <div className="mt-4 border-t border-line pt-3">
          <div className="font-bn text-[12px] font-semibold text-muted">প্রমাণের ধারা</div>
          <ol className="mt-2 flex flex-col gap-3">
            {f.chain.map((c, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-5 flex-none items-center justify-center rounded bg-primary font-bn text-[11px] font-semibold text-white">{bn(i + 1)}</span>
                <div>
                  <p className="font-bn text-[13.5px] leading-[1.6] text-ink">{c.text}</p>
                  <p className="mt-0.5 font-bn text-[11.5px] text-muted">{c.meta}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </li>
    );
  }
  return (
    <li className="flex gap-3 border-b border-line py-4 last:border-b-0">
      <span className={`mt-[9px] size-2 flex-none rounded-full ${tone === "pos" ? "bg-success" : "bg-danger"}`} aria-hidden="true" />
      <div>
        <p className="font-bn text-[14.5px] leading-[1.7] text-ink">{f.text}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 font-bn text-[12px] text-muted">
          {refs(f.refs)}
          {f.kind && <span className="rounded-md bg-surface px-2 py-0.5 font-semibold text-ink">{f.kind}</span>}
        </div>
        {f.remark && (
          <p className="mt-2 font-bn text-[12.5px] leading-relaxed text-muted">
            <strong className="font-semibold text-ink">নির্বাহী সম্পাদকের মন্তব্য:</strong> {f.remark}
          </p>
        )}
      </div>
    </li>
  );
}

/** Findings and sources as they stood in one version. */
export function versionView(report: FinalReport, version: ReportVersion) {
  const positive = report.positive.filter((f) => f.since <= version.v);
  const negative = report.negative.filter((f) => f.since <= version.v);
  const cited = new Set([...positive, ...negative].flatMap((f) => f.refs));
  const sources = report.sources.map((s, i) => ({ ...s, n: i + 1 })).filter((s) => cited.has(s.n));
  return { positive, negative, sources };
}

/** The printable audit report document. */
export function ReportDocument({
  report,
  version,
  audit,
  profileHref,
  reviewerName,
  reviewerInitials,
}: {
  report: FinalReport;
  version: ReportVersion;
  audit: string;
  profileHref?: string;
  reviewerName: string;
  reviewerInitials: string;
}) {
  const { positive, negative, sources } = versionView(report, version);
  return (
        <article className="overflow-hidden rounded-card border border-line bg-white shadow-card print:rounded-none print:border-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-primary px-5 py-5 sm:px-9">
            <div className="flex items-center gap-3">
              <Logo size={52} />
              <div>
                <div className="text-[18px] font-bold leading-none tracking-[0.13em] text-primary">ALARM</div>
                <div className="mt-1 text-[11px] text-muted">এআই-চালিত অডিট ও জবাবদিহি ব্যবস্থা</div>
              </div>
            </div>
            <div className="text-right font-bn text-[12px] leading-relaxed text-muted">
              <div className="font-sans text-[13px] font-semibold text-ink">{audit}</div>
              <div>প্রকাশিত {bnDate(report.published)}</div>
              <div>ভার্সন {bn(version.v)}.০ · গোপনীয়</div>
            </div>
          </header>

          <div className="px-5 py-6 sm:px-9">
            {/* Subject */}
            <div className="flex flex-wrap gap-5">
              <div className="flex h-[98px] w-[82px] flex-none flex-col items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-center font-bn text-[10px] leading-tight text-muted">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="5.5" r="2.6" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M3 14c.6-2.8 2.6-4.3 5-4.3s4.4 1.5 5 4.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                ব্যক্তির ছবি
                <br />
                যোগ করা হয়নি
              </div>
              <div className="min-w-0 flex-1">
                {profileHref ? (
                  <Link href={profileHref} className="font-bn text-[22px] font-bold text-ink hover:text-primary print:no-underline">
                    {report.subject.name}
                  </Link>
                ) : (
                  <span className="font-bn text-[22px] font-bold text-ink">{report.subject.name}</span>
                )}
                <p className="font-bn text-[12.5px] text-muted">পিতা: {report.subject.father}</p>
                <dl className="mt-3 grid grid-cols-1 gap-x-10 gap-y-3 font-bn sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] text-muted">এনআইডি</dt>
                    <dd className="text-[13px] text-ink">
                      {report.subject.nid} <span className="text-[11px] text-muted">লুকানো</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted">পেশা</dt>
                    <dd className="text-[13px] text-ink">{report.subject.job}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] text-muted">ঠিকানা</dt>
                    <dd className="text-[13px] text-ink">{report.subject.address}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-5 rounded-card border border-line bg-surface/60 px-5 py-4">
              <dl className="grid flex-1 grid-cols-1 gap-4 font-bn sm:grid-cols-3">
                {[
                  ["অডিটের উদ্দেশ্য", report.purpose],
                  ["অনুরোধ করেছেন", report.requester],
                  ["এলাকার নির্বাহী সম্পাদক", reviewerName],
                ].map(([k, val]) => (
                  <div key={k}>
                    <dt className="text-[11px] text-muted">{k}</dt>
                    <dd className="mt-0.5 text-[13.5px] font-semibold text-ink">{val}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-center gap-3 border-line sm:border-l sm:pl-5">
                <div
                  role="img"
                  aria-label={`আস্থার মাত্রা ${bn(report.confidence.pct)}%`}
                  className="flex size-[62px] items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(#006A4E ${report.confidence.pct * 3.6}deg, #E3EEEA 0)` }}
                >
                  <span className="flex size-[50px] items-center justify-center rounded-full bg-white font-bn text-[15px] font-bold text-ink">
                    {bn(report.confidence.pct)}%
                  </span>
                </div>
                <div className="font-bn text-[11px] leading-snug text-muted">
                  আস্থার মাত্রা
                  <div className="text-[13px] font-semibold text-primary">{report.confidence.label}</div>
                  সূত্রের মিল
                  <br />ও তথ্য কত নতুন
                </div>
              </div>
            </div>

            <Section num="০১" title="সারাংশ">
              <p className="mt-3 font-bn text-[14px] leading-[1.85] text-ink">
                {report.summary.replace("{pos}", bn(positive.length)).replace("{neg}", bn(negative.length))}
              </p>
              <p className="mt-2 font-bn text-[12.5px] leading-relaxed text-muted">{report.summaryNote}</p>
            </Section>

            <Section num="০২" title="ইতিবাচক কাজ" aside={`${bn(positive.length)}টি সিদ্ধান্ত`} tone="pos">
              <ul className="mt-1">
                {positive.map((f) => (
                  <FindingItem key={f.text} f={f} tone="pos" />
                ))}
              </ul>
            </Section>

            <Section num="০৩" title="নেতিবাচক কাজ" aside={`${bn(negative.length)}টি সিদ্ধান্ত`} tone="neg">
              <p className="mt-3 font-bn text-[12.5px] text-muted">{report.negativeIntro}</p>
              <ul className="mt-1">
                {negative.map((f) => (
                  <FindingItem key={f.text} f={f} tone="neg" />
                ))}
              </ul>
            </Section>

            <Section num="০৪" title="সূত্র তালিকা" aside={`${bn(sources.length)}টি সূত্র`}>
              <ol className="mt-1">
                {sources.map((s) => (
                  <li key={s.n} className="flex gap-4 border-b border-line py-3 last:border-b-0">
                    <span className="w-5 flex-none font-bn text-[13px] font-semibold text-muted">{bn(s.n)}</span>
                    <div>
                      <p className="font-bn text-[13.5px] text-ink">{s.title}</p>
                      <p className="mt-0.5 font-bn text-[11.5px] text-muted">{s.meta}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>

            <Section num="০৫" title="অনুমোদন">
              <div className="mt-3 rounded-card border border-line px-5 py-4">
                {report.remark && <p className="mb-4 border-b border-line pb-4 font-bn text-[13.5px] leading-[1.85] text-ink">{report.remark}</p>}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-surface text-[13px] font-semibold text-primary">
                      {reviewerInitials}
                    </span>
                    <div>
                      <div className="font-bn text-[14px] font-semibold text-ink">{reviewerName}</div>
                      <div className="font-bn text-[12px] text-muted">এলাকার নির্বাহী সম্পাদক</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-button border-2 border-success px-4 py-2 text-success">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
                      <path d="m5.3 8.2 1.8 1.8 3.6-3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="font-bn leading-tight">
                      <div className="text-[13.5px] font-semibold">চূড়ান্ত · {bnDate(report.approval?.at ?? report.published)}</div>
                      {report.approval?.signature && <div className="text-[11px]">সই আইডি {report.approval.signature}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <footer className="flex flex-wrap justify-between gap-3 border-t border-line px-5 py-3.5 font-bn text-[11px] text-muted sm:px-9">
            <span className="text-pretty">
              Bangladesh Alarm তৈরি করেছে। সিস্টেমের তথ্য রাখার নিয়ম মেনে ব্যক্তিগত তথ্য গোপন রাখা হয়েছে। অনুমতি ছাড়া কাউকে দিলে তা লগে লেখা থাকে।
            </span>
            <span className="whitespace-nowrap">
              পাতা ১ / ১ · {audit} · ভার্সন {bn(version.v)}
            </span>
          </footer>
        </article>
  );
}

/** Version picker and history for a report. */
export function VersionHistory({ report, version, hrefFor }: { report: FinalReport; version: ReportVersion; hrefFor: (v: number) => string }) {
  const current = report.versions[0];
  const isCurrent = version.v === current.v;
  const code = report.code;
  const versionHref = hrefFor;
  return (
    <>
        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[14.5px] font-semibold text-ink">ভার্সন তালিকা</h2>
              <p className="mt-0.5 text-[12px] text-muted">
                {code}-এর ভার্সন {bn(version.v)} দেখানো হচ্ছে · মোট {bn(report.versions.length)}টি ভার্সন ·{" "}
                {isCurrent ? "এটিই এখনকার প্রতিবেদন" : "পুরোনো ভার্সন — এর নিজের সূত্র তালিকাসহ পড়া যায়"}
              </p>
            </div>
            <nav aria-label="প্রতিবেদনের ভার্সন" className="flex flex-wrap gap-2">
              {report.versions.map((x) => {
                const on = x.v === version.v;
                return (
                  <Link
                    key={x.v}
                    href={versionHref(x.v)}
                    aria-current={on ? "page" : undefined}
                    className={`flex h-8 items-center gap-2 rounded-button border px-3 text-[12.5px] font-semibold ${
                      on ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:border-primary hover:text-primary"
                    }`}
                  >
                    ভার্সন {bn(x.v)}
                    <span className={`rounded-md px-1.5 text-[10.5px] font-medium ${on ? "bg-white/20" : "bg-surface"}`}>
                      {x.v === current.v ? "এখনকার" : "পুরোনো"}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <ul>
            {report.versions.map((x) => (
              <li key={x.v} className={`border-b border-line last:border-b-0 ${x.v === version.v ? "bg-surface/60" : ""}`}>
                <Link href={versionHref(x.v)} className="flex flex-wrap items-start gap-x-5 gap-y-1 px-5 py-3 hover:bg-surface/60">
                  <span className="w-16 text-[12.5px] font-semibold text-muted">ভার্সন {bn(x.v)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink">{versionTitle(x.title)}</span>
                    <span className="block font-bn text-[12px] text-muted">{versionWhy(x.why)}</span>
                  </span>
                  <span className="text-right text-[12px] text-muted max-sm:w-full max-sm:pl-[84px] max-sm:text-left">
                    <span className="block text-ink">{versionDate(x.date)}</span>
                    {bn(x.positive)}টি ইতিবাচক · {bn(x.negative)}টি নেতিবাচক
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[11.5px] text-muted">
            শুধু নতুন তথ্য যোগ করে আবার বিশ্লেষণ করলেই নতুন ভার্সন তৈরি হয়। পুরোনো ভার্সনগুলো তাদের নিজের সূত্র তালিকাসহ পড়া যায়।
          </p>
        </section>

        {!isCurrent && (
          <p role="status" className="rounded-card border border-warning/40 bg-warning/8 px-5 py-3 text-[13px] text-ink print:hidden">
            আপনি পুরোনো ভার্সন {bn(version.v)} ({versionDate(version.date)}) পড়ছেন।{" "}
            <Link href={versionHref(current.v)} className="font-semibold text-primary hover:text-primary-hover">
              এখনকার ভার্সন {bn(current.v)} খুলুন →
            </Link>
          </p>
        )}

    </>
  );
}
