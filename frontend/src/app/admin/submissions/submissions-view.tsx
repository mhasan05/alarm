"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { bn, bnRelative } from "@/lib/db/format";
import { disputeForSubmission, nameOf, profileOf, STATE_CHIP } from "@/lib/db/selectors";
import type { Submission } from "@/lib/db/types";
import { useAdmin } from "../use-admin";

export type Tab = "all" | "pending" | "accepted" | "closed";
const TABS: Tab[] = ["all", "pending", "accepted", "closed"];

const TAB_LABEL: Record<Tab, string> = { all: "সব", pending: "যাচাই চলছে", accepted: "গ্রহণ হয়েছে", closed: "বাতিল" };
const inTab = (s: Submission, tab: Tab) =>
  tab === "all" || (tab === "pending" ? s.state === "Pending" : tab === "accepted" ? s.state === "Accepted" : s.state === "Rejected");

type Origin = "all" | "staff" | "self";
const ORIGIN_LABEL: Record<Origin, string> = { all: "সবার জমা", staff: "তদন্ত সম্পাদকের জমা", self: "রাজনৈতিক কর্মীর জমা" };

/** One place to find, open and edit every submission. */
export function SubmissionsView({ initialTab }: { initialTab: Tab }) {
  const { db } = useAdmin();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [origin, setOrigin] = useState<Origin>("all");
  const [q, setQ] = useState("");

  const all = [...db.submissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const byOrigin = all.filter((s) => origin === "all" || s.origin === origin);
  const needle = q.trim().toLowerCase();
  const shown = byOrigin
    .filter((s) => inTab(s, tab))
    .filter((s) => {
      if (!needle) return true;
      const p = profileOf(db, s.profileId);
      return [s.code, s.title, s.source, p?.name ?? "", s.staffId ? nameOf(db, s.staffId) : ""].some((v) => v.toLowerCase().includes(needle));
    });
  const count = (t: Tab) => byOrigin.filter((s) => inTab(s, t)).length;

  return (
    <>
      <PageHeader crumb="প্রধান নির্বাহী সম্পাদক পোর্টাল / সব জমা" title="সব জমা" />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-[22px] pb-9 sm:px-7">
        <p className="rounded-card border border-l-[3px] border-line border-l-primary bg-white px-5 py-3.5 text-[13px] leading-[1.7] text-ink shadow-card">
          তদন্ত সম্পাদক ও রাজনৈতিক কর্মীর পাঠানো প্রতিটি জমা এখানে। যেকোনো জমা খুলে দেখতে বা <strong className="font-semibold">এডিট</strong> করতে পারবেন — প্রতিটি পরিবর্তন জমার ইতিহাস ও অডিট লগে আপনার নামসহ লেখা থাকে।
        </p>

        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <div role="tablist" aria-label="জমার অবস্থা" className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold ${tab === t ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:border-primary hover:text-primary"}`}
                >
                  {TAB_LABEL[t]}
                  <span className={`rounded-full px-1.5 text-[11.5px] ${tab === t ? "bg-white/20" : "bg-surface"}`}>{bn(count(t))}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">খুঁজুন</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="জমার কোড, শিরোনাম বা নাম দিয়ে খুঁজুন…"
                  className="h-10 w-full rounded-input border border-line bg-white px-3.5 text-[13.5px] outline-none placeholder:text-muted focus:border-primary"
                />
              </label>
              <select
                aria-label="কার জমা"
                value={origin}
                onChange={(e) => setOrigin(e.target.value as Origin)}
                className="h-10 rounded-input border border-line bg-white px-3 text-[13.5px] outline-none focus:border-primary sm:w-[210px]"
              >
                {(Object.keys(ORIGIN_LABEL) as Origin[]).map((o) => (
                  <option key={o} value={o}>
                    {ORIGIN_LABEL[o]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-[14px] font-semibold text-ink">{needle ? "এভাবে খুঁজে কিছু পাওয়া যায়নি" : "এই তালিকায় কোনো জমা নেই"}</p>
              <p className="mt-1 text-[12.5px] text-muted">{needle ? "অন্য শব্দ বা জমার কোড (যেমন SUB-0401) দিয়ে চেষ্টা করুন।" : "অন্য ট্যাব বেছে নিন।"}</p>
            </div>
          ) : (
            <ul>
              {shown.map((s) => {
                const p = profileOf(db, s.profileId);
                const dispute = disputeForSubmission(db, s.code);
                const who = s.origin === "self" ? `${p?.name ?? ""} · রাজনৈতিক কর্মী (নিজে)` : `${nameOf(db, s.staffId ?? "")} · তদন্ত সম্পাদক`;
                return (
                  <li key={s.code} className="relative flex cursor-pointer flex-col gap-3 border-b border-line px-4 py-4 last:border-b-0 hover:bg-surface/60 sm:flex-row sm:items-center sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-semibold text-muted">{s.code}</span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold ${s.category === "ইতিবাচক" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{s.category}</span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ${STATE_CHIP[s.state].cls}`}>{STATE_CHIP[s.state].label}</span>
                        {dispute && <span className="rounded-md bg-danger/8 px-1.5 py-0.5 text-[11.5px] font-medium text-danger">অভিযোগ {dispute.state === "Open" ? "খোলা" : "সমাধান হয়েছে"}</span>}
                        {s.events.some((e) => e.type === "edited") && <span className="rounded-md bg-role-reviewer/10 px-1.5 py-0.5 text-[11.5px] font-medium text-role-reviewer">এডিট করা</span>}
                      </div>
                      <Link href={`/admin/submissions/${s.code}`} className="mt-1.5 block text-[14.5px] font-semibold leading-[1.55] text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary">
                        {s.title}
                      </Link>
                      <p className="mt-1 text-[12.5px] text-muted">
                        {who} · বিষয়: {p?.name} · {bnRelative(s.submittedAt)}
                      </p>
                    </div>
                    <div className="relative z-10 flex flex-none gap-2">
                      <Link href={`/admin/submissions/${s.code}`} className="inline-flex h-9 flex-1 items-center justify-center rounded-button border border-line bg-white px-4 text-[13px] font-semibold text-primary hover:border-primary sm:flex-none">
                        দেখুন
                      </Link>
                      <Link href={`/admin/submissions/${s.code}?edit=1`} className="inline-flex h-9 flex-1 items-center justify-center rounded-button bg-primary px-4 text-[13px] font-semibold text-white hover:bg-primary-hover sm:flex-none">
                        এডিট
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-line px-5 py-3 text-[12px] text-muted">
            দেখানো হচ্ছে {bn(shown.length)}টি · মোট {bn(all.length)}টি জমা
          </p>
        </section>
      </div>
    </>
  );
}
