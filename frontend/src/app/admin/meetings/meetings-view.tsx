"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { StatTiles } from "@/components/charts";
import { MeetingStatusChip, meetingWhen } from "@/components/meetings/meeting-bits";
import { bn } from "@/lib/db/format";
import { areaLabel, pendingRequests } from "@/lib/db/meetings";
import type { Meeting } from "@/lib/db/types";
import { useAdmin } from "../use-admin";

const ORDER: Record<Meeting["status"], number> = { live: 0, scheduled: 1, ended: 2, cancelled: 3 };

export function MeetingsView({ tab }: { tab: "upcoming" | "past" }) {
  const { db } = useAdmin();
  const upcoming = db.meetings
    .filter((m) => m.status === "live" || m.status === "scheduled")
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.scheduledAt.localeCompare(b.scheduledAt));
  const past = db.meetings.filter((m) => m.status === "ended" || m.status === "cancelled").sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  const list = tab === "upcoming" ? upcoming : past;
  const requests = upcoming.reduce((n, m) => n + pendingRequests(m).length, 0);

  const stats = [
    { label: "চলমান", value: bn(upcoming.filter((m) => m.status === "live").length), color: "#F42A41", note: "এখন চলছে" },
    { label: "আসন্ন", value: bn(upcoming.filter((m) => m.status === "scheduled").length), color: "#1D6FC0", note: "নির্ধারিত মিটিং" },
    { label: "যোগ দেওয়ার অনুরোধ", value: bn(requests), color: "#D97706", note: "আপনার অনুমোদনের অপেক্ষায়" },
    { label: "শেষ হয়েছে", value: bn(past.filter((m) => m.status === "ended").length), color: "#0D1F17", note: "সম্পন্ন মিটিং", href: "/admin/meetings?tab=past" },
  ];

  return (
    <>
      <PageHeader
        crumb="অ্যাডমিন পোর্টাল / মিটিং"
        title={
          <>
            Meetings · <span className="font-bn">মিটিং</span>
          </>
        }
        action={
          <Link href="/admin/meetings/new" className="inline-flex h-[38px] items-center rounded-button bg-primary px-3.5 font-bn text-[13.5px] font-semibold text-white hover:bg-primary-hover">
            + নতুন মিটিং
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <StatTiles stats={stats} linkAs={Link} />

        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <div className="min-w-[180px] flex-1">
              <h2 className="font-bn text-[14.5px] font-semibold">{tab === "upcoming" ? "আসন্ন ও চলমান মিটিং" : "শেষ ও বাতিল মিটিং"}</h2>
              <p className="mt-0.5 font-bn text-[12px] text-muted">লিংক শেয়ার করুন — লগইন ছাড়াই ALARM আইডি দিয়ে যোগ দেওয়া যায়; আমন্ত্রিত নন এমন আইডি অনুরোধ পাঠায়</p>
            </div>
            <nav className="flex gap-2" aria-label="মিটিং তালিকা">
              {(["upcoming", "past"] as const).map((t) => (
                <Link
                  key={t}
                  href={t === "upcoming" ? "/admin/meetings" : "/admin/meetings?tab=past"}
                  aria-current={tab === t ? "true" : undefined}
                  className={`flex h-8 items-center gap-1.5 rounded-button border px-3 font-bn text-[12.5px] font-semibold ${tab === t ? "border-primary bg-primary text-white" : "border-line text-muted hover:border-primary hover:text-primary"}`}
                >
                  {t === "upcoming" ? "আসন্ন" : "পূর্ববর্তী"}
                  <span className={`rounded-[9px] px-1.5 text-[11px] ${tab === t ? "bg-white/20" : "bg-surface"}`}>{bn((t === "upcoming" ? upcoming : past).length)}</span>
                </Link>
              ))}
            </nav>
          </div>

          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center font-bn">
              <p className="text-[13px] text-muted">{tab === "upcoming" ? "কোনো আসন্ন মিটিং নেই।" : "এখনও কোনো মিটিং শেষ হয়নি।"}</p>
              {tab === "upcoming" && (
                <Link href="/admin/meetings/new" className="inline-flex h-9 items-center rounded-button border border-line px-4 text-[13px] font-semibold text-primary hover:border-primary">
                  প্রথম মিটিং তৈরি করুন
                </Link>
              )}
            </div>
          ) : (
            <ul className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {list.map((m) => {
                const req = pendingRequests(m).length;
                return (
                  <li key={m.id} className="flex">
                    <Link
                      href={`/admin/meetings/${m.id}`}
                      className={`group flex w-full flex-col rounded-card border border-l-[3px] border-line p-[15px] font-bn hover:border-primary hover:bg-[#FAFDFC] ${m.status === "live" ? "border-l-danger" : m.status === "scheduled" ? "border-l-role-reviewer" : "border-l-line bg-[#FAFDFC]"}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <MeetingStatusChip status={m.status} />
                        <span className="font-mono text-[11px] font-semibold text-muted">{m.id}</span>
                        <span className="flex-1" />
                        {req > 0 && <span className="rounded-full bg-warning/12 px-2 py-0.5 text-[11px] font-semibold text-warning">{bn(req)}টি অনুরোধ</span>}
                      </div>
                      <div className="mt-2.5 text-[14px] font-semibold leading-[1.6] text-ink text-pretty">{m.title}</div>
                      <div className="mt-1 text-[12px] text-muted">{meetingWhen(m)}</div>
                      <div aria-hidden="true" className="min-h-[12px] flex-1" />
                      <div className="flex flex-wrap items-center gap-2.5 border-t border-[#E3EEEA] pt-2.5 text-[11.5px] text-muted">
                        <span className="truncate">এলাকা: {areaLabel(m.area)}</span>
                        {m.invitees.length > 0 && <span>· +{bn(m.invitees.length)} জন আমন্ত্রিত</span>}
                        <span className="ml-auto inline-flex h-8 items-center rounded-button border border-line bg-white px-3 text-[11.5px] font-semibold text-primary group-hover:border-primary">পরিচালনা</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
