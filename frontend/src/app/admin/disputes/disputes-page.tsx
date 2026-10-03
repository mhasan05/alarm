"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { StatTiles } from "@/components/charts";
import { daysSince } from "@/lib/db/format";
import { useAdmin } from "../use-admin";
import { DisputesView, type Tab } from "./disputes-view";

export function DisputesPage({ initialTab }: { initialTab: Tab }) {
  const { db } = useAdmin();
  const open = db.disputes.filter((d) => d.state === "Open");
  const resolved = db.disputes.filter((d) => d.state !== "Open");
  const overdue = open.filter((d) => daysSince(d.filedAt) >= 2).length;
  const withdrawn = resolved.filter((d) => d.state === "Removed").length;
  const profiles = new Set(open.map((d) => d.profileId)).size;

  const stats = [
    { label: "OPEN DISPUTES", value: String(open.length), color: "#F42A41", note: "খোলা অভিযোগ · awaiting your decision" },
    { label: "OLDER THAN 48H", value: String(overdue), color: "#D97706", note: "৪৮ ঘণ্টার বেশি · answer these first" },
    { label: "RESOLVED", value: String(resolved.length), color: "#1A7A4A", note: `নিষ্পত্তি হয়েছে · ${withdrawn} report${withdrawn === 1 ? "" : "s"} withdrawn`, href: "/admin/disputes?tab=resolved" },
    { label: "PROFILES AFFECTED", value: String(profiles), color: "#0D1F17", note: "প্রোফাইল · reports stay visible meanwhile", href: "/admin/politicians" },
  ];

  return (
    <>
      <PageHeader
        crumb="অ্যাডমিন পোর্টাল / অভিযোগ"
        title={
          <>
            Disputes · <span className="font-bn">অসঙ্গতির অভিযোগ</span>
            <span className="mt-1 block text-[12.5px] font-normal text-muted max-md:hidden">
              {open.length} open disputes awaiting your decision · {overdue} older than 48 hours
            </span>
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <div className="flex gap-3 rounded-card border border-line border-l-[3px] border-l-primary bg-white px-5 py-4 shadow-card">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 flex-none text-primary">
            <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 7.2v3.6M8 5.2v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-[13px] leading-relaxed text-ink text-pretty">
            Only the political activist a report is about can dispute it. The report <strong className="font-semibold">stays on their profile unchanged</strong> while you
            review — disputes are internal and carry no badge, so a challenge cannot quietly discredit a finding the reviewer already accepted.
          </p>
        </div>

        <StatTiles stats={stats} linkAs={Link} />
        <DisputesView key={initialTab} initialTab={initialTab} />
      </div>
    </>
  );
}
