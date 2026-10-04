"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { bn, bnAge, bnDate, daysSince } from "@/lib/db/format";
import { profileOf, submissionOf } from "@/lib/db/selectors";
import type { Database, Dispute } from "@/lib/db/types";
import { plainText } from "@/lib/rich-text";
import { disputeStatus } from "./dispute-resolver";
import { DISPUTE_TABS, type DisputeTab } from "./tabs";

export type { DisputeTab };

const TAB_LABEL: Record<DisputeTab, string> = { open: "খোলা", resolved: "সমাধান হয়েছে", all: "সব" };

/** Disputes as a list of clickable rows; each opens the resolution page at `${baseHref}/<code>`. */
export function DisputeList({ db, disputes, baseHref, initialTab }: { db: Database; disputes: Dispute[]; baseHref: string; initialTab: DisputeTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<DisputeTab>(initialTab);
  const open = disputes.filter((d) => d.state === "Open").sort((a, b) => a.filedAt.localeCompare(b.filedAt)); // oldest first
  const resolved = disputes.filter((d) => d.state !== "Open").sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
  const lists: Record<DisputeTab, Dispute[]> = { open, resolved, all: [...open, ...resolved] };
  const shown = lists[tab];

  const switchTab = (t: DisputeTab) => {
    setTab(t);
    router.replace(t === "open" ? pathname : `${pathname}?tab=${t}`, { scroll: false });
  };

  return (
    <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">অভিযোগের তালিকা</h2>
          <p className="mt-0.5 text-[12px] text-muted">যেকোনো সারিতে চাপ দিলে অভিযোগটি খুলবে — সেখানে জমা এডিট ও সিদ্ধান্ত দেওয়া যাবে</p>
        </div>
        <div role="tablist" aria-label="অভিযোগের অবস্থা" className="flex flex-wrap gap-2">
          {DISPUTE_TABS.map((t) => {
            const on = tab === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => switchTab(t)}
                className={`flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold ${on ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:border-primary hover:text-primary"}`}
              >
                {TAB_LABEL[t]}
                <span className={`rounded-full px-1.5 text-[11.5px] ${on ? "bg-white/20" : "bg-surface"}`}>{bn(lists[t].length)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-[14px] font-semibold text-ink">{tab === "open" ? "কোনো খোলা অভিযোগ নেই" : "এখনও কিছু নেই"}</p>
          <p className="mt-1 text-[12.5px] text-muted">{tab === "open" ? "সব অভিযোগের সিদ্ধান্ত দেওয়া হয়েছে।" : "সিদ্ধান্ত দেওয়া অভিযোগ এখানে দেখা যাবে।"}</p>
        </div>
      ) : (
        <ul>
          {shown.map((d) => {
            const p = profileOf(db, d.profileId);
            const s = submissionOf(db, d.submissionCode);
            const st = disputeStatus(d);
            const late = d.state === "Open" && daysSince(d.filedAt) >= 2;
            return (
              <li key={d.code} className="relative flex flex-col gap-2 border-b border-l-[3px] border-line px-5 py-4 last:border-b-0 hover:bg-surface/60 sm:flex-row sm:items-center" style={{ borderLeftColor: d.state === "Open" ? (late ? "#F42A41" : "#D97706") : "transparent" }}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-semibold text-muted">{d.code}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-semibold" style={{ color: st.tone, background: `${st.tone}1A` }}>
                      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                      {st.label}
                    </span>
                    <span className="rounded-md bg-surface px-2 py-0.5 text-[11.5px] text-ink">{d.reason}</span>
                  </div>
                  <Link href={`${baseHref}/${d.code}`} className="mt-1.5 block text-[14.5px] font-semibold leading-[1.55] text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary">
                    {p?.name} — {s?.title ?? d.submissionCode}
                  </Link>
                  <p className="mt-1 line-clamp-1 text-[12.5px] text-muted">{plainText(d.claim)}</p>
                </div>
                <div className="flex flex-none items-center gap-3 text-[12px] text-muted sm:flex-col sm:items-end sm:gap-1">
                  <span className={late ? "font-semibold text-danger" : ""}>{d.state === "Open" ? bnAge(d.filedAt) : d.decidedAt ? bnDate(d.decidedAt) : ""}</span>
                  <span className="font-semibold text-primary">{d.state === "Open" ? "সমাধান করুন →" : "দেখুন →"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
