"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export type Tab = "latest" | "all" | "draft" | "superseded";
const TAB_LABEL: Record<Tab, string> = { latest: "Latest", all: "All versions", draft: "Draft", superseded: "Superseded" };

export type ReportRow = {
  code: string;
  v: number;
  latest: boolean;
  date: string;
  name: string;
  profileId: string;
  meta: string;
  positive: number;
  negative: number;
  approved: boolean;
  href: string;
};

/** Every report version, filterable by tab and searchable by report ID or politician name. */
export function ReportsView({ rows, initialTab }: { rows: ReportRow[]; initialTab: Tab }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [showHow, setShowHow] = useState(false);

  const lists: Record<Tab, ReportRow[]> = {
    latest: rows.filter((r) => r.latest),
    all: rows,
    draft: rows.filter((r) => !r.approved),
    superseded: rows.filter((r) => !r.latest),
  };
  const q = query.trim().toLowerCase();
  const shown = lists[tab].filter((r) => !q || `${r.code} ${r.name} ${r.meta}`.toLowerCase().includes(q));

  const switchTab = (t: Tab) => {
    setTab(t);
    router.replace(t === "latest" ? pathname : `${pathname}?tab=${t}`, { scroll: false });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Report lists" className="flex flex-wrap gap-2">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
            const on = tab === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => switchTab(t)}
                className={`flex h-9 cursor-pointer items-center gap-2 rounded-button border px-3.5 text-[13.5px] font-semibold ${
                  on ? "border-primary bg-primary text-white" : "border-line bg-white text-ink hover:border-primary hover:text-primary"
                }`}
              >
                {TAB_LABEL[t]}
                <span className={`rounded-[9px] px-[7px] py-px text-[11px] ${on ? "bg-white/20 text-white" : "bg-surface text-muted"}`}>{lists[t].length}</span>
              </button>
            );
          })}
        </div>
        <label className="ml-auto flex h-10 min-w-0 flex-[0_1_420px] items-center gap-2 rounded-input border border-line bg-white px-3 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,106,78,0.10)] max-sm:flex-[1_1_100%]">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none text-muted">
            <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
            <path d="m10.6 10.6 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Search reports</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search report ID or political activist name…"
            className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-placeholder"
          />
        </label>
      </div>

      <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-line bg-surface/60 text-[11px] font-semibold tracking-[0.06em] text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">REPORT ID</th>
                <th scope="col" className="px-3 py-3 font-semibold">SUBJECT</th>
                <th scope="col" className="px-3 py-3 font-semibold">VERSION</th>
                <th scope="col" className="px-3 py-3 font-semibold">FINDINGS</th>
                <th scope="col" className="px-3 py-3 font-semibold">STATUS</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={`${r.code}-v${r.v}`} className="border-b border-line last:border-b-0 hover:bg-surface/40">
                  <td className="px-5 py-4 align-middle">
                    <Link href={r.href} className="font-mono text-[12.5px] font-semibold text-primary hover:text-primary-hover">
                      {r.code}
                    </Link>
                    <div className="mt-0.5 text-[12px] text-muted">
                      {r.approved ? "Issued" : "Cut"} {r.date}
                    </div>
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <Link href={`/admin/politicians/${r.profileId}`} className="font-bn text-[14px] font-semibold text-ink hover:text-primary">
                      {r.name}
                    </Link>
                    <div className="mt-0.5 font-bn text-[12px] text-muted">{r.meta}</div>
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <span className="rounded-md bg-surface px-2 py-0.5 text-[12.5px] font-semibold text-ink">v{r.v}</span>
                    <div className="mt-1 text-[11.5px] text-muted">{r.latest ? "latest" : "superseded"}</div>
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-0.5 text-[12px] font-medium text-success">
                        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                        {r.positive} positive
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-danger/10 px-2 py-0.5 text-[12px] font-medium text-danger">
                        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                        {r.negative} negative
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium ${
                        !r.latest ? "bg-surface text-muted" : r.approved ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}
                    >
                      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                      {!r.latest ? "Superseded" : r.approved ? "Approved" : "Awaiting approval"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right align-middle">
                    <Link
                      href={r.href}
                      className="inline-flex h-9 items-center whitespace-nowrap rounded-button border border-line bg-white px-3.5 text-[13px] font-semibold text-primary hover:border-primary hover:bg-surface"
                    >
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-[14px] font-semibold text-ink">{q ? "No report matches this search" : "Nothing here yet"}</p>
                    <p className="mt-1 text-[12.5px] text-muted">
                      {q ? "Try a report ID like RPT-2026-0039 or part of a name." : tab === "draft" ? "Every report has been approved." : "No superseded versions."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <p className="text-[13px] text-muted">
            Showing {shown.length} of {rows.length} report versions
          </p>
          <button
            type="button"
            aria-expanded={showHow}
            aria-controls="how-versions"
            onClick={() => setShowHow((s) => !s)}
            className="cursor-pointer text-[13px] font-semibold text-primary hover:text-primary-hover"
          >
            How versions are cut {showHow ? "↑" : "→"}
          </button>
        </div>
        {showHow && (
          <div id="how-versions" className="border-t border-line bg-surface/60 px-5 py-4 text-[13px] leading-relaxed text-ink">
            <ol className="list-decimal space-y-1.5 pl-5 text-pretty">
              <li>The admin keeps or excludes each AI finding; only kept items are written. That cut becomes <strong>v1</strong>, a draft.</li>
              <li>The reviewer adds their remark and approves it — only then can it be shared or downloaded.</li>
              <li>A new version is cut only when more accepted data is added and re-analysed. The earlier version becomes superseded.</li>
              <li>Superseded versions stay readable with their own source index. Nothing is edited in place.</li>
            </ol>
          </div>
        )}
      </section>
    </>
  );
}
