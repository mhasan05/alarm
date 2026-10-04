"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { STATUS_LABEL } from "@/components/account-actions";
import { bn } from "@/lib/db/format";
import type { ReviewerStatus } from "@/lib/db/types";
import type { Reviewer } from "./rows";

export type Tab = "all" | "active" | "unavailable";
const TAB_LABEL: Record<Tab, string> = { all: "সব", active: "কাজে আছেন", unavailable: "কাজে নেই" };

export const REVIEWER_STATUS_STYLE: Record<ReviewerStatus, string> = {
  Active: "bg-success/10 text-success",
  "On leave": "bg-surface text-muted",
  Suspended: "bg-danger/10 text-danger",
  Deactivated: "bg-ink/10 text-ink",
};

/** Queue at or above this is flagged orange; above the next step, red. */
const queueColor = (n: number) => (n >= 8 ? "bg-danger" : n >= 5 ? "bg-warning" : "bg-primary");
const rateColor = (n: number) => (n < 60 ? "text-warning" : "text-ink");

/** Saves the reviewer roster as a CSV file. */
export function ExportReviewers({ reviewers }: { reviewers: Reviewer[] }) {
  const exportCsv = () => {
    const head = ["ALARM আইডি", "নাম", "ইমেইল", "মোবাইল", "অবস্থা", "দায়িত্বের এলাকা", "অপেক্ষায়", "সবচেয়ে পুরোনো (দিন)", "এই মাসে সিদ্ধান্ত", "গ্রহণের হার %", "সিদ্ধান্তের গড় সময় (ঘণ্টা)"];
    const rows = reviewers.map((r) => [r.id, r.nameBn || r.name, r.email, r.phone, STATUS_LABEL[r.status], r.areas.join("; "), r.queue, r.oldest, r.decidedMonth, r.acceptRate, r.avgHours]);
    const csv = [head, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `alarm-reviewers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={exportCsv}
      className="inline-flex h-10 cursor-pointer items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary hover:bg-surface"
    >
      তালিকা CSV ডাউনলোড
    </button>
  );
}

export function ReviewersView({ reviewers, initialTab }: { reviewers: Reviewer[]; initialTab: Tab }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");

  const lists: Record<Tab, Reviewer[]> = {
    all: reviewers,
    active: reviewers.filter((r) => r.status === "Active"),
    unavailable: reviewers.filter((r) => r.status !== "Active"),
  };
  const q = query.trim().toLowerCase();
  const shown = lists[tab].filter((r) => !q || `${r.name} ${r.nameBn} ${r.id} ${r.areas.join(" ")}`.toLowerCase().includes(q));

  const switchTab = (t: Tab) => {
    setTab(t);
    router.replace(t === "all" ? pathname : `${pathname}?tab=${t}`, { scroll: false });
  };

  return (
    <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">নির্বাহী সম্পাদক তালিকা</h2>
        </div>
        <label className="flex h-10 min-w-0 flex-[1_1_240px] items-center gap-2 rounded-input border border-line px-3 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,106,78,0.10)]">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none text-muted">
            <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
            <path d="m10.6 10.6 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="sr-only">নির্বাহী সম্পাদক খুঁজুন</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="নাম, ALARM আইডি বা এলাকা দিয়ে খুঁজুন…"
            className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-placeholder"
          />
        </label>
      </div>

      <div role="tablist" aria-label="নির্বাহী সম্পাদকের তালিকা" className="flex flex-wrap gap-2 border-b border-line px-5 py-3.5">
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
                on ? "border-primary bg-primary text-white" : "border-line bg-white text-ink hover:border-primary hover:text-primary"
              }`}
            >
              {TAB_LABEL[t]}
              <span className={`rounded-[9px] px-[7px] py-px text-[11px] ${on ? "bg-white/20 text-white" : "bg-surface text-muted"}`}>{bn(lists[t].length)}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[660px] text-left">
          <thead>
            <tr className="border-b border-line bg-surface/60 text-[11px] font-semibold text-muted">
              <th scope="col" className="px-5 py-3 font-semibold">নাম</th>
              <th scope="col" className="px-3 py-3 font-semibold">দায়িত্বের এলাকা</th>
              <th scope="col" className="px-3 py-3 font-semibold">অপেক্ষায়</th>
              <th scope="col" className="px-3 py-3 font-semibold">সিদ্ধান্ত</th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">অবস্থা</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="relative cursor-pointer border-b border-line last:border-b-0 hover:bg-surface/40">
                <td className="px-5 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 flex-none items-center justify-center rounded-full bg-role-reviewer/10 text-[11.5px] font-semibold text-role-reviewer">
                      {r.initials}
                    </span>
                    <div>
                      {/* Stretched link: the whole row opens the reviewer detail page. */}
                      <Link href={`/admin/reviewers/${r.id}`} className="whitespace-nowrap text-[13.5px] font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary">
                        {r.nameBn || r.name}
                      </Link>
                      <div className="text-[11.5px] text-muted">{r.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 align-middle font-bn text-[12.5px] text-ink">
                  {r.areas[0]}
                  {r.areas.length > 1 && <span className="text-muted"> +আরও {bn(r.areas.length - 1)}টি</span>}
                </td>
                <td className="px-3 py-3 align-middle">
                  <div className="text-[13px] font-semibold text-ink">
                    {bn(r.queue)}টি <span className="text-[11.5px] font-normal text-muted">অপেক্ষায় · সবচেয়ে পুরোনো {bn(r.oldest)} দিন</span>
                  </div>
                  <div
                    role="meter"
                    aria-label={`${r.nameBn || r.name}-এর যাচাইয়ের তালিকা`}
                    aria-valuenow={r.queue}
                    aria-valuemin={0}
                    aria-valuemax={10}
                    className="mt-1 h-1 w-[104px] overflow-hidden rounded-full bg-surface"
                  >
                    <div className={`h-full rounded-full ${queueColor(r.queue)}`} style={{ width: `${Math.min(100, r.queue * 10)}%` }} />
                  </div>
                </td>
                <td className="px-3 py-3 align-middle">
                  <div className="text-[13px] font-semibold text-ink">{bn(r.decidedMonth)}টি</div>
                  <div className={`text-[11.5px] ${rateColor(r.acceptRate)}`}>{bn(r.acceptRate)}% গ্রহণ হয়েছে</div>
                </td>
                <td className="px-5 py-3 text-right align-middle">
                  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium ${REVIEWER_STATUS_STYLE[r.status]}`}>
                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <p className="text-[14px] font-semibold text-ink">{q ? "খুঁজে কোনো নির্বাহী সম্পাদক পাওয়া যায়নি" : "এই তালিকায় কেউ নেই"}</p>
                  <p className="mt-1 text-[12.5px] text-muted">{q ? "নাম, KAR-736204-এর মতো ALARM আইডি, বা জেলার নাম দিয়ে চেষ্টা করুন।" : "আরও নির্বাহী সম্পাদক দেখতে ফিল্টার বদলান।"}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <p className="text-[13px] text-muted">
          মোট {bn(reviewers.length)} জনের মধ্যে {bn(shown.length)} জন দেখানো হচ্ছে
        </p>
        <Link href="/admin/settings?tab=coverage" className="text-[13px] font-semibold text-primary hover:text-primary-hover">
          দায়িত্বের এলাকা ঠিক করুন →
        </Link>
      </div>
    </section>
  );
}
