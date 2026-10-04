"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { meetingWhen } from "@/components/meetings/meeting-bits";
import { bn, bnRelative, daysSince } from "@/lib/db/format";
import { pendingRequests } from "@/lib/db/meetings";
import { activeReviewersFor, analysisStatus, nameOf, openDisputes, profileOf, roleOfId, STATE_CHIP } from "@/lib/db/selectors";
import { plainText } from "@/lib/rich-text";
import { auditHref } from "@/lib/settings-data";
import { useNow } from "@/lib/use-client";
import { useAdmin } from "../use-admin";

const ROLE = {
  admin: { label: "প্রধান নির্বাহী সম্পাদক", color: "#006A4E" },
  reviewer: { label: "নির্বাহী সম্পাদক", color: "#1D6FC0" },
  staff: { label: "তদন্ত সম্পাদক", color: "#D97706" },
  politician: { label: "রাজনৈতিক কর্মী", color: "#7A3FA8" },
  system: { label: "সিস্টেম", color: "#4A7060" },
} as const;

const ICON = {
  inbox: "M2.4 9.6h3.2l1.2 2h2.4l1.2-2h3.2M2.4 9.6 4 3.2h8l1.6 6.4v3.6H2.4z",
  alert: "M8 1.8 15 14H1zM8 6.2v3.4M8 11.6v.2",
  spark: "M8 1.6v3M8 11.4v3M1.6 8h3M11.4 8h3M3.5 3.5l2 2M10.5 10.5l2 2M3.5 12.5l2-2M10.5 5.5l2-2",
  sign: "M3.6 2.4h5.6l3.2 3.2v8H3.6zM9.2 2.6v3.2h3.2M5.6 10.6c1-.9 1.8-.9 2.4 0s1.4.9 2.4 0",
  person: "M8 7.4a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2ZM3 14c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6",
  plus: "M8 3v10M3 8h10",
  meeting: "M2.4 4.4h7.2v7.2H2.4zM9.6 7l4-2.4v6.8l-4-2.4",
};

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Card({ title, sub, action, children, className = "" }: { title: string; sub?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-card border border-line bg-white shadow-card ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-[12px] leading-[1.6] text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The প্রধান নির্বাহী সম্পাদক's home: what needs doing now, with one tap to each task. */
export function AdminDashboardView() {
  const { db, admin } = useAdmin();
  const now = useNow(60_000);

  const pendingSubs = db.submissions.filter((s) => s.state === "Pending");
  const overdue = pendingSubs.filter((s) => daysSince(s.submittedAt) >= 2).length;
  const disputes = openDisputes(db).sort((a, b) => a.filedAt.localeCompare(b.filedAt));
  const ready = db.profiles.filter((p) => analysisStatus(db, p.id).ready);
  const awaitingSignOff = db.reports.filter((r) => r.state === "pending");
  const stranded = pendingSubs.filter((s) => activeReviewersFor(db, s.profileId).length === 0);
  const joinRequests = db.meetings.filter((m) => m.status === "scheduled" || m.status === "live").reduce((n, m) => n + pendingRequests(m).length, 0);

  const TODO = [
    { key: "pending", label: "যাচাই চলছে এমন জমা", count: pendingSubs.length, note: overdue ? `${bn(overdue)}টি ৪৮ ঘণ্টার বেশি পুরনো` : "নির্বাহী সম্পাদকের সিদ্ধান্তের অপেক্ষায়", href: "/admin/submissions?tab=pending", button: "জমাগুলো দেখুন", icon: ICON.inbox, tone: "text-role-reviewer bg-role-reviewer/10" },
    { key: "disputes", label: "খোলা অভিযোগ", count: disputes.length, note: "আপনার সিদ্ধান্তের অপেক্ষায়", href: "/admin/disputes", button: "অভিযোগের সমাধান করুন", icon: ICON.alert, tone: "text-danger bg-danger/10" },
    { key: "ready", label: "বিশ্লেষণের জন্য তৈরি", count: ready.length, note: "যাচাইয়ের তালিকা খালি, নতুন গ্রহণ করা তথ্য আছে", href: "/admin/ai-review", button: "বিশ্লেষণ শুরু করুন", icon: ICON.spark, tone: "text-primary bg-primary/10" },
    { key: "sign", label: "সইয়ের অপেক্ষায় প্রতিবেদন", count: awaitingSignOff.length, note: "নির্বাহী সম্পাদকের অনুমোদন বাকি", href: "/admin/reports?tab=draft", button: "প্রতিবেদন দেখুন", icon: ICON.sign, tone: "text-warning bg-warning/10" },
  ];

  const QUICK = [
    { label: "নতুন রাজনৈতিক কর্মী", href: "/admin/politicians/new", icon: ICON.person },
    { label: "নতুন তদন্ত সম্পাদক", href: "/admin/field-staff/new", icon: ICON.person },
    { label: "নতুন নির্বাহী সম্পাদক", href: "/admin/reviewers/new", icon: ICON.person },
    { label: "নতুন মিটিং", href: "/admin/meetings/new", icon: ICON.meeting },
  ];

  const ACTIONS: { stage: string; title: string; detail: string; urgency: string; urgent: boolean; href: string }[] = [
    ...stranded.slice(0, 1).map((s) => ({
      stage: "যাচাই",
      title: `${bn(stranded.length)}টি জমার জন্য কোনো চালু নির্বাহী সম্পাদক নেই`,
      detail: `${profileOf(db, s.profileId)?.district ?? ""} এলাকায় কোনো নির্বাহী সম্পাদক নেই — কাউকে এই এলাকার দায়িত্ব দিন।`,
      urgency: "জরুরি",
      urgent: true,
      href: "/admin/settings?tab=coverage",
    })),
    ...disputes.map((d) => ({
      stage: "অভিযোগ",
      title: `${d.code} · ${profileOf(db, d.profileId)?.name} — ${d.reason}`,
      detail: plainText(d.claim),
      urgency: daysSince(d.filedAt) === 0 ? "আজ জমা" : `${bn(daysSince(d.filedAt))} দিন খোলা`,
      urgent: daysSince(d.filedAt) >= 2,
      href: `/admin/disputes/${d.code}`,
    })),
    ...ready.map((p) => ({
      stage: "এআই বিশ্লেষণ",
      title: `${p.name} — বিশ্লেষণ শুরু করা যাবে`,
      detail: `${bn(analysisStatus(db, p.id).accepted)}টি জমা গ্রহণ হয়েছে, যাচাইয়ের তালিকায় কিছু বাকি নেই।`,
      urgency: "তৈরি",
      urgent: false,
      href: `/admin/ai-review?profile=${p.id}`,
    })),
    ...awaitingSignOff.map((r) => ({
      stage: "প্রতিবেদন",
      title: `${r.code} · ${r.subject.name} — নির্বাহী সম্পাদকের সইয়ের অপেক্ষায়`,
      detail: `${nameOf(db, r.reviewerId)} অনুমোদন দিলে প্রতিবেদনটি শেয়ার ও ডাউনলোড করা যাবে।`,
      urgency: "অপেক্ষায়",
      urgent: false,
      href: `/admin/reports/${r.code}`,
    })),
    ...(joinRequests
      ? [{ stage: "মিটিং", title: `${bn(joinRequests)}টি মিটিংয়ে যোগ দেওয়ার অনুরোধ`, detail: "এলাকার বাইরের কেউ যোগ দিতে চেয়েছেন — অনুমতি দিন বা না করুন।", urgency: "অপেক্ষায়", urgent: false, href: "/admin/meetings" }]
      : []),
  ];

  const recent = [...db.submissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 5);
  const upcoming = db.meetings
    .filter((m) => m.status === "live" || (m.status === "scheduled" && (!now || new Date(m.scheduledAt).getTime() >= now - 3_600_000)))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 3);
  const activity = db.audit.slice(0, 6);

  const accounts = [
    { label: "রাজনৈতিক কর্মী", value: db.profiles.filter((p) => p.account === "Active").length, href: "/admin/politicians" },
    { label: "তদন্ত সম্পাদক", value: db.staff.filter((x) => x.status !== "Deactivated" && x.status !== "Suspended").length, href: "/admin/field-staff" },
    { label: "নির্বাহী সম্পাদক", value: db.reviewers.filter((r) => r.status === "Active").length, href: "/admin/reviewers" },
    { label: "চলতি মাঠের কাজ", value: db.assignments.filter((a) => a.open).length, href: "/admin/field-staff" },
  ];

  const hour = now ? Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }).format(new Date(now))) : 10;
  const greeting = hour < 12 ? "শুভ সকাল" : hour < 17 ? "শুভ বিকাল" : "শুভ সন্ধ্যা";
  const dateLine = now ? new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: "Asia/Dhaka" }).format(new Date(now)) : "";
  const total = TODO.reduce((n, t) => n + t.count, 0);

  return (
    <>
      <PageHeader crumb="প্রধান নির্বাহী সম্পাদক পোর্টাল / ড্যাশবোর্ড" title="ড্যাশবোর্ড" />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        {/* Greeting */}
        <section className="rounded-card border border-line bg-white px-5 py-5 shadow-card sm:px-6">
          <p className="text-[12.5px] text-muted">{dateLine}</p>
          <h2 className="mt-1 text-[20px] font-semibold leading-[1.5] text-ink">
            {greeting}, {admin?.nameBn ?? admin?.name}
          </h2>
          <p className="mt-1 text-[13.5px] leading-[1.7] text-muted">
            {total ? `আজ আপনার মোট ${bn(total)}টি কাজ বাকি আছে। নিচের যেকোনো কার্ডে চাপ দিয়ে কাজটি শুরু করুন।` : "এই মুহূর্তে কোনো কাজ বাকি নেই। নতুন কিছু এলে এখানে দেখাবে।"}
          </p>
        </section>

        {/* What needs doing */}
        <section aria-labelledby="todo-h">
          <h2 id="todo-h" className="mb-3 text-[15px] font-semibold text-ink">
            এখন যা করতে হবে
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {TODO.map((t) => (
              <li key={t.key}>
                <Link href={t.href} className="group flex h-full flex-col rounded-card border border-line bg-white p-4 shadow-card hover:border-primary">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`flex size-9 items-center justify-center rounded-lg ${t.tone}`}>
                      <Icon d={t.icon} />
                    </span>
                    <span className={`text-[28px] font-bold leading-none ${t.count ? "text-ink" : "text-muted/60"}`}>{bn(t.count)}</span>
                  </div>
                  <div className="mt-3 text-[14px] font-semibold text-ink">{t.label}</div>
                  <div className="mt-0.5 flex-1 text-[12px] leading-[1.6] text-muted">{t.count ? t.note : "কিছু বাকি নেই"}</div>
                  <span className="mt-3 text-[12.5px] font-semibold text-primary group-hover:text-primary-hover">{t.button} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Quick actions */}
        <section aria-labelledby="quick-h" className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
          <h2 id="quick-h" className="text-[15px] font-semibold text-ink">
            দ্রুত কাজ
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {QUICK.map((q) => (
              <Link key={q.href} href={q.href} className="flex min-h-[52px] items-center gap-2.5 rounded-button border border-line bg-surface/60 px-3 text-[13px] font-semibold text-ink hover:border-primary hover:bg-white hover:text-primary">
                <span className="flex size-7 flex-none items-center justify-center rounded-full bg-primary text-white">
                  <Icon d={ICON.plus} className="size-3.5" />
                </span>
                <span className="leading-[1.35]">{q.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <Card title="আপনার সিদ্ধান্তের অপেক্ষায়" sub={ACTIONS.length ? "জরুরি কাজগুলোতে লাল দাগ দেওয়া" : undefined}>
              {ACTIONS.length === 0 ? (
                <p className="px-5 py-10 text-center text-[13px] text-muted">এই মুহূর্তে আপনার সিদ্ধান্তের অপেক্ষায় কিছু নেই।</p>
              ) : (
                <ul className="flex flex-col gap-3 p-4">
                  {ACTIONS.map((a) => (
                    <li key={a.stage + a.title}>
                      <Link href={a.href} className="block rounded-card border border-l-[3px] border-line p-[15px] text-ink hover:border-primary hover:bg-[#FAFDFC]" style={{ borderLeftColor: a.urgent ? "#F42A41" : "#1A7A4A" }}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-input bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{a.stage}</span>
                          <span className="flex-1" />
                          <span className={`rounded-input px-2 py-0.5 text-[11.5px] font-semibold ${a.urgent ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>{a.urgency}</span>
                        </div>
                        <div className="mt-2 text-[13.5px] font-semibold leading-[1.65] text-pretty">{a.title}</div>
                        <div className="mt-1 line-clamp-2 text-[12px] leading-[1.65] text-muted">{a.detail}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title="নতুন জমা"
              sub="তদন্ত সম্পাদক ও রাজনৈতিক কর্মীর সবশেষ জমা — যেকোনোটি এডিট করতে পারবেন"
              action={
                <Link href="/admin/submissions" className="text-[12.5px] font-semibold text-primary hover:text-primary-hover">
                  সব জমা →
                </Link>
              }
            >
              <ul>
                {recent.map((s) => (
                  <li key={s.code} className="relative flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-5 py-3.5 last:border-b-0 hover:bg-surface/60">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/submissions/${s.code}`} className="block truncate text-[13.5px] font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary">
                        {s.title}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {s.code} · {s.origin === "self" ? "রাজনৈতিক কর্মী (নিজে)" : nameOf(db, s.staffId ?? "")} · {bnRelative(s.submittedAt)}
                      </p>
                    </div>
                    <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ${STATE_CHIP[s.state].cls}`}>{STATE_CHIP[s.state].label}</span>
                    <Link href={`/admin/submissions/${s.code}?edit=1`} className="relative z-10 inline-flex h-8 items-center rounded-button border border-line px-3 text-[12.5px] font-semibold text-primary hover:border-primary">
                      এডিট
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <Card title="অ্যাকাউন্ট ও মাঠের কাজ">
              <ul className="grid grid-cols-2">
                {accounts.map((a, i) => (
                  <li key={a.label} className={`${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""} border-line`}>
                    <Link href={a.href} className="block px-5 py-4 hover:bg-surface/60">
                      <div className="text-[22px] font-bold leading-none text-ink">{bn(a.value)}</div>
                      <div className="mt-1.5 text-[12.5px] text-muted">{a.label}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card
              title="সামনের মিটিং"
              action={
                <Link href="/admin/meetings" className="text-[12.5px] font-semibold text-primary hover:text-primary-hover">
                  সব মিটিং →
                </Link>
              }
            >
              {upcoming.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-muted">সামনে কোনো মিটিং নেই।</p>
              ) : (
                <ul>
                  {upcoming.map((m) => (
                    <li key={m.id} className="border-b border-line last:border-b-0">
                      <Link href={`/admin/meetings/${m.id}`} className="block px-5 py-3.5 hover:bg-surface/60">
                        <div className="text-[13.5px] font-semibold text-ink">{m.title}</div>
                        <div className="mt-0.5 text-[12px] text-muted">
                          {m.status === "live" ? "এখন চলছে" : meetingWhen(m)}
                          {pendingRequests(m).length > 0 && ` · ${bn(pendingRequests(m).length)}টি যোগ দেওয়ার অনুরোধ`}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title="সবশেষ কাজ"
              action={
                <Link href="/admin/settings?tab=audit" className="text-[12.5px] font-semibold text-primary hover:text-primary-hover">
                  অডিট লগ →
                </Link>
              }
            >
              <ul className="px-5">
                {activity.map((a, i) => {
                  const role = ROLE[roleOfId(db, a.actor)];
                  const href = auditHref(a.target, db);
                  return (
                    <li key={`${a.at}-${i}`} className={`flex gap-[11px] border-b border-line py-3 last:border-b-0 ${href ? "relative cursor-pointer hover:bg-surface/60" : ""}`}>
                      <span className="mt-[7px] size-2 flex-none rounded-full" style={{ background: role.color }} aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[12.5px] leading-[1.7] text-ink">
                          <span className="font-semibold">{nameOf(db, a.actor)}</span> {a.action} ·{" "}
                          {href ? (
                            <Link href={href} className="after:absolute after:inset-0 after:content-[''] hover:text-primary">
                              {a.target}
                            </Link>
                          ) : (
                            a.target
                          )}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-muted">
                          {role.label} · {bnRelative(a.at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
