"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { bn } from "@/lib/db/format";

export type Tab = "latest" | "all" | "draft" | "superseded";
const TAB_LABEL: Record<Tab, string> = { latest: "সর্বশেষ", all: "সব ভার্সন", draft: "খসড়া", superseded: "পুরোনো ভার্সন" };

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
        <div role="tablist" aria-label="প্রতিবেদনের তালিকা" className="flex flex-wrap gap-2">
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
                <span className={`rounded-[9px] px-[7px] py-px text-[11px] ${on ? "bg-white/20 text-white" : "bg-surface text-muted"}`}>{bn(lists[t].length)}</span>
              </button>
            );
          })}
        </div>
        <label className="ml-auto flex h-10 min-w-0 flex-[0_1_420px] items-center gap-2 rounded-input border border-line bg-white px-3 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,106,78,0.10)] max-sm:flex-[1_1_100%]">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none text-muted">
            <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
            <path d="m10.6 10.6 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="sr-only">প্রতিবেদন খুঁজুন</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="প্রতিবেদন আইডি বা রাজনৈতিক কর্মীর নাম দিয়ে খুঁজুন…"
            className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-placeholder"
          />
        </label>
      </div>

      <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-line bg-surface/60 text-[11px] font-semibold text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">প্রতিবেদন আইডি</th>
                <th scope="col" className="px-3 py-3 font-semibold">রাজনৈতিক কর্মী</th>
                <th scope="col" className="px-3 py-3 font-semibold">ভার্সন</th>
                <th scope="col" className="px-3 py-3 font-semibold">পাওয়া তথ্য</th>
                <th scope="col" className="px-3 py-3 font-semibold">অবস্থা</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">কাজ</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={`${r.code}-v${r.v}`} className="relative cursor-pointer border-b border-line last:border-b-0 hover:bg-surface/40">
                  <td className="px-5 py-4 align-middle">
                    <Link href={r.href} className="font-mono text-[12.5px] font-semibold text-primary after:absolute after:inset-0 after:content-[''] hover:text-primary-hover">
                      {r.code}
                    </Link>
                    <div className="mt-0.5 text-[12px] text-muted">
                      {r.approved ? "প্রকাশিত" : "তৈরি"} {r.date}
                    </div>
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <Link href={`/admin/politicians/${r.profileId}`} className="relative z-10 font-bn text-[14px] font-semibold text-ink hover:text-primary">
                      {r.name}
                    </Link>
                    <div className="mt-0.5 font-bn text-[12px] text-muted">{r.meta}</div>
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <span className="rounded-md bg-surface px-2 py-0.5 text-[12.5px] font-semibold text-ink">ভার্সন {bn(r.v)}</span>
                    <div className="mt-1 text-[11.5px] text-muted">{r.latest ? "সর্বশেষ" : "পুরোনো"}</div>
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-0.5 text-[12px] font-medium text-success">
                        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                        {bn(r.positive)}টি ইতিবাচক
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-danger/10 px-2 py-0.5 text-[12px] font-medium text-danger">
                        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                        {bn(r.negative)}টি নেতিবাচক
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
                      {!r.latest ? "পুরোনো ভার্সন" : r.approved ? "অনুমোদিত" : "অনুমোদনের অপেক্ষায়"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right align-middle">
                    <Link
                      href={r.href}
                      className="relative z-10 inline-flex h-9 items-center whitespace-nowrap rounded-button border border-line bg-white px-3.5 text-[13px] font-semibold text-primary hover:border-primary hover:bg-surface"
                    >
                      বিস্তারিত দেখুন
                    </Link>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-[14px] font-semibold text-ink">{q ? "খুঁজে কিছু পাওয়া যায়নি" : "এখনও কিছু নেই"}</p>
                    <p className="mt-1 text-[12.5px] text-muted">
                      {q ? "RPT-2026-0001 এর মতো প্রতিবেদন আইডি বা নামের অংশ দিয়ে চেষ্টা করুন।" : tab === "draft" ? "সব প্রতিবেদন অনুমোদিত হয়েছে।" : "কোনো পুরোনো ভার্সন নেই।"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <p className="text-[13px] text-muted">
            মোট {bn(rows.length)}টি ভার্সনের মধ্যে {bn(shown.length)}টি দেখানো হচ্ছে
          </p>
          <button
            type="button"
            aria-expanded={showHow}
            aria-controls="how-versions"
            onClick={() => setShowHow((s) => !s)}
            className="cursor-pointer text-[13px] font-semibold text-primary hover:text-primary-hover"
          >
            ভার্সন কীভাবে তৈরি হয় {showHow ? "↑" : "→"}
          </button>
        </div>
        {showHow && (
          <div id="how-versions" className="border-t border-line bg-surface/60 px-5 py-4 text-[13px] leading-relaxed text-ink">
            <ol className="list-decimal space-y-1.5 pl-5 text-pretty">
              <li>প্রধান নির্বাহী সম্পাদক এআই-এর পাওয়া প্রতিটি তথ্য রাখেন বা বাদ দেন; শুধু রাখা তথ্যই লেখা হয়। এটিই হয় <strong>ভার্সন ১</strong>, একটি খসড়া।</li>
              <li>নির্বাহী সম্পাদক মন্তব্য যোগ করে অনুমোদন দিয়ে সই করেন — তারপরই শেয়ার বা ডাউনলোড করা যায়।</li>
              <li>নতুন গ্রহণ করা তথ্য যোগ করে আবার বিশ্লেষণ করলে তবেই নতুন ভার্সন তৈরি হয়। আগের ভার্সনটি পুরোনো হয়ে যায়।</li>
              <li>পুরোনো ভার্সনগুলো নিজের উৎসের তালিকাসহ পড়া যায়। কিছুই সরাসরি এডিট করা হয় না।</li>
            </ol>
          </div>
        )}
      </section>
    </>
  );
}
