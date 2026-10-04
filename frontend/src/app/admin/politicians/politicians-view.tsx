"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { bn, phoneBn, phoneIntl } from "@/lib/db/format";
import { profileSummary, scoreColor } from "@/lib/db/selectors";
import { useAdmin } from "../use-admin";

export type Tab = "directory" | "suspended";

const TAB_LABEL: Record<Tab, string> = { directory: "সব প্রোফাইল", suspended: "বন্ধ অ্যাকাউন্ট" };

/** Profile `account` values are stored in English; show them in Bengali. */
const ACCOUNT_BN: Record<string, string> = { Active: "চালু আছে", Suspended: "বন্ধ", Deactivated: "পুরোপুরি বন্ধ" };

export function PoliticiansView({ initialTab }: { initialTab: Tab }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const { db } = useAdmin();

  const DIRECTORY = db.profiles.map((p) => {
    const sm = profileSummary(db, p.id);
    return { id: p.id, name: p.name, initial: p.initial, phone: phoneBn(p.phone), phoneRaw: `${p.phone} ${phoneIntl(p.phone)}`, post: p.post, area: `${p.seat}, ${p.thana}`, accepted: sm.accepted, pending: sm.pending, score: sm.score, account: p.account };
  });
  const suspended = DIRECTORY.filter((r) => r.account === "Suspended").length;
  const counts: Record<Tab, number> = { directory: DIRECTORY.length, suspended };

  const switchTab = (t: Tab) => {
    setTab(t);
    // Keep the tab in the URL so it can be linked to and survives reloads.
    router.replace(t === "directory" ? pathname : `${pathname}?tab=${t}`, { scroll: false });
  };

  const q = query.trim().toLowerCase();
  const rows = DIRECTORY.filter((r) => tab !== "suspended" || r.account === "Suspended").filter(
    (r) => !q || `${r.name} ${r.post} ${r.area} ${r.phone} ${r.phoneRaw}`.toLowerCase().includes(q),
  );

  const footLabel = q
    ? rows.length === 0
      ? "এভাবে খুঁজে কোনো প্রোফাইল পাওয়া যায়নি"
      : `${bn(rows.length)}টি মিল পাওয়া গেছে`
    : tab === "suspended"
      ? `${bn(rows.length)}টি বন্ধ অ্যাকাউন্ট · সাইন-ইন বন্ধ, রেকর্ড রাখা আছে`
      : `সব ${bn(rows.length)}টি প্রোফাইল দেখানো হচ্ছে`;

  return (
    <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div role="tablist" aria-label="প্রোফাইলের তালিকা" className="flex flex-wrap gap-0.5 border-b border-line px-3">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => switchTab(t)}
              className={`flex h-12 cursor-pointer items-center gap-2 border-b-2 px-[15px] text-[13.5px] font-semibold ${
                on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {TAB_LABEL[t]}
              <span className={`rounded-[9px] px-[7px] py-px text-[11px] font-semibold ${on ? "bg-primary/12 text-primary" : "bg-surface text-muted"}`}>
                {bn(counts[t])}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E3EEEA] px-5 py-3.5">
        <label className="flex h-[38px] min-w-0 flex-[1_1_260px] items-center gap-2 rounded-input border border-line px-3 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,106,78,0.10)]">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none text-muted">
            <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
            <path d="m10.6 10.6 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="sr-only">প্রোফাইল খুঁজুন</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="নাম, পদ, এলাকা বা মোবাইল নম্বর দিয়ে খুঁজুন…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none"
          />
        </label>
        {q && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="h-[38px] cursor-pointer rounded-button border border-danger bg-white px-[13px] text-[12.5px] font-semibold text-danger hover:bg-danger/6"
          >
            খোঁজা মুছুন
          </button>
        )}
      </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface text-[11px] font-semibold text-muted">
                <th scope="col" className="px-5 py-2.5 font-semibold">নাম</th>
                <th scope="col" className="px-2 py-2.5 font-semibold">পদ ও এলাকা</th>
                <th scope="col" className="px-2 py-2.5 font-semibold">জমা</th>
                <th scope="col" className="px-2 py-2.5 font-semibold">স্কোর</th>
                <th scope="col" className="px-5 py-2.5 text-right font-semibold">অ্যাকাউন্ট</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const score = r.score;
                const color = r.accepted ? scoreColor(score) : "#4A7060";
                const active = r.account === "Active";
                return (
                  // Whole row opens the profile via the stretched name link.
                  <tr key={r.id} className="relative cursor-pointer border-b border-[#E3EEEA] text-[13px] hover:bg-[#FAFDFC]">
                    <td className="px-5 py-[13px]">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-primary/12 text-[13px] font-semibold text-primary">
                          {r.initial}
                        </span>
                        <span className="min-w-0">
                          <Link
                            href={`/admin/politicians/${r.id}`}
                            className="block truncate font-semibold leading-normal text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary"
                          >
                            {r.name}
                          </Link>
                          <span className="mt-px block truncate text-[11px] text-muted">{r.phone}</span>
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[240px] truncate px-2 text-[12.5px] leading-[1.55] text-muted">
                      {r.post} · {r.area}
                    </td>
                    <td className="px-2">
                      <span className="text-[13px] font-semibold">{bn(r.accepted)}</span>
                      <span className="text-[11px] text-muted">টি গ্রহণ হয়েছে</span>
                      <span className={`mt-0.5 block text-[11px] ${r.pending ? "text-warning" : "text-muted"}`}>
                        {r.pending ? `${bn(r.pending)}টি যাচাই চলছে` : "তালিকা খালি"}
                      </span>
                    </td>
                    <td className="w-[110px] px-2">
                      <span className="text-[15px] font-bold" style={{ color }}>
                        {r.accepted ? bn(score) : "—"}
                      </span>
                      <div className="mt-[5px] h-[5px] overflow-hidden rounded-[3px] bg-[#E3EEEA]">
                        <div className="h-full" style={{ width: `${r.accepted ? score : 0}%`, background: color }} />
                      </div>
                    </td>
                    <td className="px-5 text-right">
                      <span
                        className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11.5px] font-semibold ${
                          active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}
                      >
                        <span className={`size-[5px] rounded-full ${active ? "bg-success" : "bg-danger"}`} />
                        {ACCOUNT_BN[r.account] ?? r.account}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-muted">
                    {q ? "এভাবে খুঁজে কোনো প্রোফাইল পাওয়া যায়নি।" : "এই তালিকায় কোনো প্রোফাইল নেই।"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      <p className="px-5 py-[13px] text-[12.5px] text-muted">{footLabel}</p>
    </section>
  );
}
