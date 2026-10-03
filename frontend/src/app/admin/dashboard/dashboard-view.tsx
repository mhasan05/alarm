"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { ChartCard, Meter, StackedDayChart, StatTiles } from "@/components/charts";
import { bn, daysSince, enRelative } from "@/lib/db/format";
import { activeReviewersFor, analysisStatus, nameOf, openDisputes, profileOf, roleOfId } from "@/lib/db/selectors";
import { useAdmin } from "../use-admin";

type Role = "রাজনৈতিক কর্মী" | "মাঠকর্মী" | "পর্যালোচক" | "অ্যাডমিন";
const ROLE_STYLE: Record<Role, { fg: string; bg: string }> = {
  "রাজনৈতিক কর্মী": { fg: "#7A3FA8", bg: "rgba(122,63,168,0.12)" },
  মাঠকর্মী: { fg: "#D97706", bg: "rgba(217,119,6,0.12)" },
  পর্যালোচক: { fg: "#1D6FC0", bg: "rgba(29,111,192,0.12)" },
  অ্যাডমিন: { fg: "#006A4E", bg: "rgba(0,106,78,0.12)" },
};
const ROLE_BN = { admin: "অ্যাডমিন", reviewer: "পর্যালোচক", staff: "মাঠকর্মী", politician: "রাজনৈতিক কর্মী", system: "অ্যাডমিন" } as const;

const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date(iso));

export function AdminDashboardView() {
  const { db } = useAdmin();
  const today = new Intl.DateTimeFormat("bn-BD", { day: "2-digit", month: "long", year: "numeric", weekday: "long", timeZone: "Asia/Dhaka" })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  const dateLine = `${today.day} ${today.month} ${today.year} · ${today.weekday}`;

  // Everything below is derived from the live records.
  const pendingSubs = db.submissions.filter((s) => s.state === "Pending");
  const overdueSubs = pendingSubs.filter((s) => daysSince(s.submittedAt) >= 2).length;
  const disputes = openDisputes(db).sort((a, b) => a.filedAt.localeCompare(b.filedAt));
  const ready = db.profiles.filter((p) => analysisStatus(db, p.id).ready);
  const awaitingSignOff = db.reports.filter((r) => r.state === "pending");
  const stranded = pendingSubs.filter((s) => activeReviewersFor(db, s.profileId).length === 0);

  const DISTRICTS = [...db.profiles.reduce((m, p) => m.set(p.district, (m.get(p.district) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const totalProfiles = db.profiles.length;
  const maxDistrict = Math.max(1, ...DISTRICTS.map(([, c]) => c));
  const thinDistricts = DISTRICTS.filter(([, n]) => n === 1).map(([d]) => d);

  const now = new Date();
  const WEEK_SUBMISSIONS: [string, number, number][] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86_400_000);
    const key = dayKey(d.toISOString());
    const onDay = db.submissions.filter((s) => dayKey(s.submittedAt) === key);
    const label = i === 6 ? "আজ" : new Intl.DateTimeFormat("bn-BD", { weekday: "short", timeZone: "Asia/Dhaka" }).format(d);
    return [label, onDay.filter((s) => s.category === "ইতিবাচক").length, onDay.filter((s) => s.category === "নেতিবাচক").length];
  });
  const wPos = WEEK_SUBMISSIONS.reduce((n, d) => n + d[1], 0);
  const wNeg = WEEK_SUBMISSIONS.reduce((n, d) => n + d[2], 0);

  const PIPELINE: { title: string; role: Role; count: number; unit: string; href: string | null }[] = [
    { title: "মাঠে সংগ্রহ", role: "মাঠকর্মী", count: db.assignments.filter((a) => a.open).length, unit: "চলমান কাজ", href: "/admin/field-staff" },
    { title: "পর্যালোচনা", role: "পর্যালোচক", count: pendingSubs.length, unit: "অপেক্ষমাণ", href: "/admin/reviewers" },
    { title: "অভিযোগ নিষ্পত্তি", role: "অ্যাডমিন", count: disputes.length, unit: "খোলা", href: "/admin/disputes" },
    { title: "এআই বিশ্লেষণ", role: "অ্যাডমিন", count: ready.length, unit: "প্রস্তুত", href: "/admin/ai-review" },
    { title: "প্রতিবেদন অনুমোদন", role: "পর্যালোচক", count: awaitingSignOff.length, unit: "অপেক্ষমাণ", href: "/admin/reports?tab=draft" },
  ];

  const ACTIONS: { stage: string; title: string; detail: string; urgency: string; urgent: boolean; href: string }[] = [
    ...stranded.slice(0, 1).map((s) => ({
      stage: "পর্যালোচনা",
      title: `${bn(stranded.length)}টি জমার কোনো সক্রিয় পর্যালোচক নেই`,
      detail: `${profileOf(db, s.profileId)?.district ?? ""} এলাকার পর্যালোচক অনুপস্থিত — কাউকে এলাকাটির দায়িত্ব দিন।`,
      urgency: "জরুরি",
      urgent: true,
      href: "/admin/settings?tab=coverage",
    })),
    ...disputes.map((d) => ({
      stage: "অভিযোগ নিষ্পত্তি",
      title: `${d.code} · ${profileOf(db, d.profileId)?.name} — ${d.reason}`,
      detail: d.claim,
      urgency: `${bn(daysSince(d.filedAt))} দিন খোলা`,
      urgent: daysSince(d.filedAt) >= 2,
      href: "/admin/disputes",
    })),
    ...ready.map((p) => ({
      stage: "এআই বিশ্লেষণ",
      title: `${p.name} — সারি খালি, বিশ্লেষণ শুরু করা যাবে`,
      detail: `${bn(analysisStatus(db, p.id).accepted)}টি জমা গৃহীত হয়েছে এবং পর্যালোচনার সারিতে কিছু বাকি নেই।`,
      urgency: "প্রস্তুত",
      urgent: false,
      href: `/admin/ai-review?profile=${p.id}`,
    })),
    ...awaitingSignOff.map((r) => ({
      stage: "প্রতিবেদন",
      title: `${r.code} · ${r.subject.name} — পর্যালোচকের স্বাক্ষরের অপেক্ষায়`,
      detail: `${nameOf(db, r.reviewerId)} অনুমোদন দিলে প্রতিবেদনটি শেয়ার ও ডাউনলোড করা যাবে।`,
      urgency: "অপেক্ষমাণ",
      urgent: false,
      href: `/admin/reports/${r.code}`,
    })),
  ];
  const urgent = ACTIONS.filter((a) => a.urgent).length;

  const ACTIVITY = db.audit.slice(0, 6).map((a) => {
    const role = ROLE_BN[roleOfId(db, a.actor)] as Role;
    return { role, text: `${nameOf(db, a.actor)} — ${a.action} · ${a.target}`, time: enRelative(a.at) };
  });

  const ADMIN_STATS = {
    openAssignments: db.assignments.filter((a) => a.open).length,
    underReview: pendingSubs.length,
    overdueReview: overdueSubs,
    openDisputes: disputes.length,
  };

  const stats = [
    { label: "নিবন্ধিত প্রোফাইল", value: totalProfiles, color: "#0D1F17", note: `সক্রিয় অ্যাকাউন্ট · ${bn(DISTRICTS.length)}টি জেলায়`, href: "/admin/politicians" },
    { label: "চলমান মাঠ কাজ", value: ADMIN_STATS.openAssignments, color: "#D97706", note: "মাঠকর্মীদের চলমান সংগ্রহ", href: "/admin/field-staff" },
    { label: "পর্যালোচনাধীন জমা", value: ADMIN_STATS.underReview, color: "#1D6FC0", note: `${bn(ADMIN_STATS.overdueReview)}টি ৪৮ ঘণ্টার বেশি`, href: "/admin/reviewers" },
    { label: "খোলা অভিযোগ", value: ADMIN_STATS.openDisputes, color: "#F42A41", note: "আপনার সিদ্ধান্তের অপেক্ষায়", href: "/admin/disputes" },
  ];

  return (
    <>
      <PageHeader
        crumb="অ্যাডমিন পোর্টাল / ড্যাশবোর্ড"
        title="সিস্টেম সারসংক্ষেপ"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[12px] text-muted">{dateLine}</span>
            <Link
              href="/admin/politicians"
              className="inline-flex h-[38px] items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
            >
              প্রোফাইল তালিকা
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <StatTiles stats={stats} linkAs={Link} />

        {/* Workflow pipeline */}
        <section className="rounded-card border border-line bg-white px-[22px] py-5 shadow-card">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[14.5px] font-semibold leading-[1.6]">কাজের প্রবাহ</h2>
            <p className="min-w-[180px] flex-1 text-[12px] leading-[1.65] text-muted text-pretty">প্রতিটি ধাপে এখন কতটি কাজ আছে এবং কে সেটির দায়িত্বে</p>
          </div>
          <ol className="mt-4 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            {PIPELINE.map((p, i) => {
              const role = ROLE_STYLE[p.role];
              const dot = p.role === "অ্যাডমিন" ? "#006A4E" : role.fg;
              const body = (
                <>
                  <div className="flex items-center gap-[9px]">
                    <span className="flex size-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: dot }}>
                      {bn(i + 1)}
                    </span>
                    <span className="whitespace-nowrap rounded-input px-[7px] py-0.5 text-[9.5px] font-semibold tracking-[0.05em]" style={{ color: role.fg, background: role.bg }}>
                      {p.role}
                    </span>
                  </div>
                  <div className="mt-2.5 text-[12.5px] font-semibold leading-[1.55] text-pretty">{p.title}</div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-[20px] font-bold leading-none" style={{ color: dot }}>
                      {bn(p.count)}
                    </span>
                    <span className="text-[11px] text-muted">{p.unit}</span>
                  </div>
                </>
              );
              return (
                <li key={p.title} className="flex min-w-0 items-stretch gap-2.5 sm:flex-[1_1_190px]">
                  {p.href ? (
                    <Link href={p.href} className="block min-w-0 flex-1 rounded-card border border-line bg-white p-3.5 text-ink hover:border-primary">
                      {body}
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1 rounded-card border border-line bg-white p-3.5" title="পর্যালোচক পোর্টালে পরিচালিত হয়">
                      {body}
                    </div>
                  )}
                  {i < PIPELINE.length - 1 && (
                    <span aria-hidden="true" className="hidden flex-none self-center text-[13px] text-line sm:inline">
                      ›
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <div className="flex flex-wrap items-stretch gap-5">
          <ChartCard title="গত ৭ দিনে জমা" sub="মাঠকর্মী ও রাজনৈতিক কর্মীর জমা, শ্রেণি অনুযায়ী" className="flex-[2_1_420px]">
            <StackedDayChart
              caption="গত ৭ দিনে জমা"
              days={WEEK_SUBMISSIONS}
              height={130}
              base={{ label: "ইতিবাচক", color: "#006A4E" }}
              top={{ label: "নেতিবাচক", color: "#F42A41" }}
              footnote={`মোট ${bn(wPos + wNeg)}টি জমা · ${bn(wPos)} ইতিবাচক, ${bn(wNeg)} নেতিবাচক`}
            />
          </ChartCard>

          <ChartCard title="এলাকাভিত্তিক প্রোফাইল" sub="কোন জেলায় কতটি নিবন্ধিত প্রোফাইল" className="flex-[1_1_260px]">
            <ul className="mt-[18px] flex flex-col gap-[13px]">
              {DISTRICTS.map(([name, n]) => (
                <Meter key={name} label={name} value={`${bn(n)}টি প্রোফাইল`} pct={(n / maxDistrict) * 100} color={n >= 5 ? "#006A4E" : n >= 3 ? "#1A7A4A" : "#D97706"} />
              ))}
            </ul>
            <div className="flex-1" />
            <p className="mt-4 border-t border-[#E3EEEA] pt-3.5 text-[11.5px] leading-[1.7] text-muted text-pretty">
              {thinDistricts.length ? `${thinDistricts.join(", ")} — এই জেলাগুলোতে একজন করে রাজনৈতিক কর্মী নিবন্ধিত।` : "প্রতিটি জেলায় একাধিক রাজনৈতিক কর্মী নিবন্ধিত।"}
            </p>
          </ChartCard>
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <section className="min-w-0 flex-[3_1_480px] overflow-hidden rounded-card border border-line bg-white shadow-card">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[14.5px] font-semibold leading-[1.6]">আপনার সিদ্ধান্তের অপেক্ষায়</h2>
              <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">
                {bn(urgent)}টি কাজ অগ্রাধিকার পাওয়ার যোগ্য · বাকিগুলো পরবর্তী ধাপে যাওয়ার জন্য প্রস্তুত
              </p>
            </div>
            {ACTIONS.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-muted">এই মুহূর্তে আপনার সিদ্ধান্তের অপেক্ষায় কিছু নেই।</p>
            ) : (
              <ul className="grid gap-3 px-[18px] pt-4 pb-[18px] 2xl:grid-cols-2">
                {ACTIONS.map((a) => (
                  <li key={a.stage + a.title}>
                    <Link
                      href={a.href}
                      className="block rounded-card border border-l-[3px] border-line p-[15px] text-ink hover:border-primary hover:bg-[#FAFDFC]"
                      style={{ borderLeftColor: a.urgent ? "#F42A41" : "#1A7A4A" }}
                    >
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                        <span className="whitespace-nowrap rounded-input bg-primary/12 px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.05em] text-primary">
                          {a.stage}
                        </span>
                        <span className="min-w-2.5 flex-1" />
                        <span
                          className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold ${
                            a.urgent ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                          }`}
                        >
                          <span className={`size-[5px] rounded-full ${a.urgent ? "bg-danger" : "bg-success"}`} />
                          {a.urgency}
                        </span>
                      </div>
                      <div className="mt-2.5 text-[13.5px] font-semibold leading-[1.65] text-pretty">{a.title}</div>
                      <div className="mt-1.5 text-[12px] leading-[1.65] text-muted text-pretty">{a.detail}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="min-w-0 flex-[2_1_300px] overflow-hidden rounded-card border border-line bg-white shadow-card">
            <div className="px-[18px] pt-4 pb-3">
              <h2 className="text-[14.5px] font-semibold leading-[1.6]">সাম্প্রতিক কার্যকলাপ</h2>
              <p className="mt-0.5 text-[12px] leading-[1.65] text-muted">সব ভূমিকার কাজ · অডিট লগ থেকে</p>
            </div>
            <ul className="flex flex-col px-[18px] pb-1.5">
              {ACTIVITY.map((ev) => (
                <li key={ev.text + ev.time} className="flex gap-[11px] border-t border-[#E3EEEA] py-[11px]">
                  <span className="mt-1.5 size-2 flex-none rounded-full" style={{ background: ROLE_STYLE[ev.role].fg }} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-[1.7] text-pretty">{ev.text}</p>
                    <p className="mt-[3px] text-[11px] text-muted">
                      {ev.role} · {ev.time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-[#E3EEEA] px-[18px] pt-[11px] pb-[15px]">
              <Link href="/admin/settings?tab=audit" className="text-[12.5px] font-semibold text-primary hover:text-primary-hover">
                সম্পূর্ণ অডিট লগ দেখুন →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
