"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useMe } from "@/lib/auth-client";
import { bn } from "@/lib/db/format";
import { accessOf, areaLabel, canEnter, meetingsFor, type MeetingAccess } from "@/lib/db/meetings";
import { alarmIdOf } from "@/lib/db/selectors";
import { useDb } from "@/lib/db/store";
import type { Meeting } from "@/lib/db/types";
import { MeetingStatusChip, meetingWhen } from "./meeting-bits";

const ACCESS: Partial<Record<MeetingAccess, { label: string; cls: string }>> = {
  invited: { label: "আমন্ত্রিত", cls: "bg-primary/8 text-primary" },
  approved: { label: "অনুরোধ অনুমোদিত", cls: "bg-success/10 text-success" },
  area: { label: "আপনার এলাকার মিটিং", cls: "bg-primary/8 text-primary" },
  outside: { label: "এলাকার বাইরে", cls: "bg-surface text-muted" },
  pending: { label: "অনুমোদনের অপেক্ষায়", cls: "bg-warning/10 text-warning" },
  declined: { label: "অনুরোধ গৃহীত হয়নি", cls: "bg-danger/10 text-danger" },
  removed: { label: "সরানো হয়েছে", cls: "bg-danger/10 text-danger" },
};

const ORDER: Record<Meeting["status"], number> = { live: 0, scheduled: 1, ended: 2, cancelled: 3 };
const CODE = /([a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4})/i;

/** "Meetings" page for political activists, field staff and reviewers. */
export function MyMeetings({ portal }: { portal: string }) {
  const db = useDb();
  const me = useMe();
  const router = useRouter();
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  if (!me) return null;

  const mine = meetingsFor(db, me.userId).sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.status === "scheduled" ? a.scheduledAt.localeCompare(b.scheduledAt) : b.scheduledAt.localeCompare(a.scheduledAt)));
  const live = mine.filter((m) => m.status === "live" && canEnter(accessOf(db, m, me.userId, me.role))).length;

  return (
    <>
      <PageHeader crumb={`${portal} / মিটিং`} title="আমার মিটিং" />
      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        {live > 0 && (
          <p role="status" className="flex items-center gap-2.5 rounded-card border border-l-[3px] border-line border-l-danger bg-white px-5 py-3.5 text-[13px] shadow-card">
            <span className="size-2 flex-none animate-pulse rounded-full bg-danger" />
            {bn(live)}টি মিটিং এখন চলছে — নিচে থেকে যোগ দিন।
          </p>
        )}

        <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-[200px] flex-1">
              <h2 className="text-[14.5px] font-semibold">লিংক পেয়েছেন?</h2>
              <p className="mt-0.5 text-[12px] text-muted">প্রধান নির্বাহী সম্পাদকের পাঠানো মিটিং লিংক বা কোড এখানে দিন। আমন্ত্রিত না হলে যোগ দেওয়ার অনুরোধ পাঠাতে পারবেন।</p>
            </div>
            <div className="rounded-card border border-line bg-surface/60 px-3.5 py-2 text-right">
              <div className="text-[11px] text-muted">আপনার ALARM আইডি</div>
              <div className="font-mono text-[15px] font-semibold text-ink">{alarmIdOf(db, me.userId)}</div>
            </div>
          </div>
          <p className="mt-2 text-[11.5px] text-muted">লগইন ছাড়াও মিটিং লিংক খুলে এই আইডি দিয়ে যোগ দিতে পারবেন।</p>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const code = link.match(CODE)?.[1]?.toLowerCase();
              if (!code) return setLinkError("সঠিক মিটিং লিংক বা কোড দিন — যেমন abcd-efgh-jkmn।");
              router.push(`/meet/${code}`);
            }}
          >
            <label htmlFor="meet-link" className="sr-only">
              মিটিং লিংক
            </label>
            <input
              id="meet-link"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setLinkError("");
              }}
              placeholder="https://…/meet/abcd-efgh-jkmn"
              className={`h-10 min-w-[220px] flex-1 rounded-input border px-3 font-mono text-[13px] outline-none focus:border-primary ${linkError ? "border-danger" : "border-line"}`}
            />
            <button type="submit" className="h-10 cursor-pointer rounded-button bg-primary px-4 text-[13px] font-semibold text-white hover:bg-primary-hover">
              খুলুন
            </button>
          </form>
          {linkError && <p className="mt-1.5 text-[11.5px] text-danger">{linkError}</p>}
        </section>

        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[14.5px] font-semibold">আমার মিটিংগুলো</h2>
            <p className="mt-0.5 text-[12px] text-muted">আপনার এলাকার মিটিং, যেখানে আপনি আমন্ত্রিত বা যোগ দেওয়ার অনুরোধ করেছেন</p>
          </div>
          {mine.length === 0 ? (
            <p className="px-6 py-12 text-center text-[13px] text-muted">এখনও কোনো মিটিং নেই। প্রধান নির্বাহী সম্পাদক আমন্ত্রণ জানালে এখানে দেখা যাবে।</p>
          ) : (
            <ul className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {mine.map((m) => {
                const access = accessOf(db, m, me.userId, me.role);
                const a = ACCESS[access];
                const enter = canEnter(access);
                const action =
                  m.status === "live" && enter
                    ? { label: "এখনই যোগ দিন", cls: "bg-danger text-white hover:bg-danger-hover" }
                    : m.status === "scheduled" && enter
                      ? { label: "লবিতে যান", cls: "border border-line bg-white text-primary hover:border-primary" }
                      : access === "pending" && (m.status === "live" || m.status === "scheduled")
                        ? { label: "অবস্থা দেখুন", cls: "border border-line bg-white text-muted hover:border-primary" }
                        : null;
                return (
                  <li key={m.id} className="flex">
                    <div className={`flex w-full flex-col rounded-card border border-l-[3px] border-line p-[15px] ${m.status === "live" ? "border-l-danger" : m.status === "scheduled" ? "border-l-role-reviewer" : "border-l-line bg-[#FAFDFC]"}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <MeetingStatusChip status={m.status} />
                        {a && <span className={`rounded-input px-2 py-[3px] text-[11px] font-semibold ${a.cls}`}>{a.label}</span>}
                      </div>
                      <div className="mt-2.5 text-[14px] font-semibold leading-[1.6] text-pretty">{m.title}</div>
                      <div className="mt-1 text-[12px] text-muted">{meetingWhen(m)}</div>
                      <div className="mt-0.5 text-[12px] text-muted">এলাকা: {areaLabel(m.area)}</div>
                      <div aria-hidden="true" className="min-h-[12px] flex-1" />
                      <div className="flex items-center gap-2 border-t border-[#E3EEEA] pt-2.5">
                        <span className="flex-1 text-[11.5px] text-muted">অডিও মিটিং · আয়োজক প্রধান নির্বাহী সম্পাদক</span>
                        {action && (
                          <Link href={`/meet/${m.code}`} className={`inline-flex h-8 flex-none items-center rounded-button px-3 text-[12px] font-semibold ${action.cls}`}>
                            {action.label}
                          </Link>
                        )}
                      </div>
                    </div>
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
