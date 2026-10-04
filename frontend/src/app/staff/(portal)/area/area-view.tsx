"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { bn } from "@/lib/db/format";
import { NewSubmissionButton } from "../new-submission-button";
import { URGENCY_STYLE, useStaff } from "../use-staff";

const DO = [
  "প্রতিটি তথ্যের সাথে ছবি, নথি বা প্রত্যক্ষদর্শীর বক্তব্য সংযুক্ত করুন — প্রমাণ ছাড়া তথ্য বাতিল হয়।",
  "জমা দেওয়ার আগে শ্রেণি — ইতিবাচক না নেতিবাচক — ঠিকভাবে বেছে নিন।",
  "উৎসের নাম, তারিখ ও নথির নম্বর স্পষ্ট করে লিখুন, যাতে নির্বাহী সম্পাদক মিলিয়ে দেখতে পারেন।",
];

const DONT = [
  "নিজের এলাকার বাইরের প্রোফাইল নিয়ে তথ্য জমা দেবেন না।",
  "বেনামি পোস্ট বা শোনা কথা জমা দেবেন না — নির্বাহী সম্পাদক এগুলো বাতিল করবেন।",
  "জমা দেওয়ার পর তথ্য সম্পাদনা করা যায় না — ভুল হলে নতুন করে জমা দিন।",
];

// Staff see what happens to a submission, never who reviews it.
const AFTER = [
  { title: "আপনি জমা দেন", body: "তথ্য ও প্রমাণ পর্যালোচনার সারিতে যায়।" },
  { title: "পর্যালোচনা", body: "এলাকার নির্বাহী সম্পাদক প্রমাণ মিলিয়ে দেখেন।" },
  { title: "সিদ্ধান্ত", body: "গৃহীত হলে প্রোফাইলে প্রকাশিত হয়; বাতিল হলে কারণ জানানো হয়।" },
];

const ICON: Record<string, ReactNode> = {
  division: <path d="M3.5 5.2 7.8 3.5l4.4 1.7 4.3-1.7v11.3l-4.3 1.7-4.4-1.7-4.3 1.7ZM7.8 3.5v11.3M12.2 5.2v11.3" strokeLinejoin="round" />,
  city: (
    <>
      <rect x="3.5" y="7" width="6" height="10" rx="1" />
      <rect x="9.5" y="3.5" width="7" height="13.5" rx="1" />
      <path d="M12 7h2M12 10h2M12 13h2M5.8 10h1.4M5.8 13h1.4" strokeLinecap="round" />
    </>
  ),
  pin: (
    <>
      <path d="M10 17.5s5.5-5 5.5-9.3A5.5 5.5 0 0 0 4.5 8.2c0 4.3 5.5 9.3 5.5 9.3Z" strokeLinejoin="round" />
      <circle cx="10" cy="8.2" r="2" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1" />
      <rect x="11" y="3.5" width="5.5" height="5.5" rx="1" />
      <rect x="3.5" y="11" width="5.5" height="5.5" rx="1" />
      <rect x="11" y="11" width="5.5" height="5.5" rx="1" />
    </>
  ),
  seat: (
    <>
      <path d="M4 16.5h12M5.5 16.5V9M10 16.5V9M14.5 16.5V9M3.5 9 10 4l6.5 5Z" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  id: (
    <>
      <rect x="3" y="4.5" width="14" height="11" rx="1.6" />
      <circle cx="7.5" cy="9.3" r="1.7" />
      <path d="M5 13c.5-1.1 1.4-1.6 2.5-1.6s2 .5 2.5 1.6M12 8.5h3M12 11.5h2" strokeLinecap="round" />
    </>
  ),
};

function Svg({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="flex-none">
      {children}
    </svg>
  );
}

function RuleCard({ tone, title, rules }: { tone: "do" | "dont"; title: string; rules: string[] }) {
  const ok = tone === "do";
  return (
    <section className={`overflow-hidden rounded-card border border-line border-t-[3px] bg-white shadow-card ${ok ? "border-t-success" : "border-t-danger"}`}>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className={`flex size-9 items-center justify-center rounded-full ${ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
          <Svg size={16}>{ok ? <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" strokeLinecap="round" />}</Svg>
        </span>
        <h2 className="text-[15px] font-semibold leading-[1.5]">{title}</h2>
      </div>
      <ol className="flex flex-col">
        {rules.map((r, i) => (
          <li key={r} className="flex gap-3.5 border-b border-line/70 px-5 py-3.5 last:border-b-0">
            <span className={`mt-0.5 flex size-6 flex-none items-center justify-center rounded-full text-[12px] font-bold ${ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
              {bn(i + 1)}
            </span>
            <p className="min-w-0 flex-1 text-[13px] leading-[1.75] text-ink text-pretty">{r}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function StaffAreaView() {
  const { staff, tasks } = useStaff();
  if (!staff) return <RecordMissing title="অ্যাকাউন্ট পাওয়া যায়নি" backHref="/login" backLabel="আবার লগইন করুন" />;

  // The assigned reviewer is intentionally not shown to staff.
  const details: { label: string; value: string; icon: string }[] = [
    { label: "বিভাগ · জেলা", value: `${staff.division} · ${staff.district}`, icon: "division" },
    { label: "উপজেলা / সিটি কর্পোরেশন", value: staff.upazila, icon: "city" },
    { label: "থানা / ইউনিয়ন", value: staff.thana, icon: "pin" },
    { label: "ওয়ার্ড", value: staff.wards, icon: "grid" },
    { label: "সংসদীয় আসন", value: staff.seat, icon: "seat" },
    { label: "ALARM আইডি", value: staff.id, icon: "id" },
  ];
  const open = tasks.filter((t) => t.open).length;

  return (
    <>
      <PageHeader crumb="তদন্ত সম্পাদক পোর্টাল / কর্মএলাকা" title="কর্মএলাকা ও কাজের নিয়ম" action={<NewSubmissionButton />} />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* Work area */}
          <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            <div className="relative overflow-hidden bg-[linear-gradient(120deg,#006A4E_0%,#045C44_50%,#003D2C_100%)] px-6 py-6 text-white">
              <div aria-hidden="true" className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_18px)]" />
              <div className="relative flex flex-wrap items-center gap-4">
                <span className="flex size-12 flex-none items-center justify-center rounded-card bg-white/12 ring-1 ring-white/20">
                  <Svg size={22}>{ICON.pin}</Svg>
                </span>
                <div className="min-w-[200px] flex-1">
                  <div className="text-[12px] font-semibold text-primary-soft">আমার কর্মএলাকা</div>
                  <div className="mt-0.5 text-[22px] font-bold leading-[1.45]">
                    {staff.thana}, {staff.district}
                  </div>
                  <div className="mt-0.5 text-[13px] text-primary-soft">
                    {staff.seat} · {staff.wards}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11.5px] font-semibold ring-1 ring-white/20">
                  <Svg size={12}>
                    <rect x="4.5" y="9" width="11" height="8" rx="1.6" />
                    <path d="M7 9V6.8a3 3 0 0 1 6 0V9" strokeLinecap="round" />
                  </Svg>
                  প্রধান নির্বাহী সম্পাদক নির্ধারিত
                </span>
              </div>
            </div>
            <dl className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
              {details.map((d) => (
                <div key={d.label} className="flex items-center gap-3 bg-white px-5 py-4">
                  <span className="flex size-9 flex-none items-center justify-center rounded-button bg-surface text-primary ring-1 ring-line">
                    <Svg size={16}>{ICON[d.icon]}</Svg>
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[11.5px] leading-[1.5] text-muted">{d.label}</dt>
                    <dd className="text-[14px] font-semibold leading-[1.55] break-words">{d.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <p className="border-t border-line bg-surface/60 px-5 py-3 text-[12px] leading-[1.7] text-muted text-pretty">
              শুধু এই এলাকার প্রোফাইল নিয়ে তথ্য জমা দিন। এলাকা পরিবর্তনের প্রয়োজন হলে প্রধান নির্বাহী সম্পাদকের সাথে যোগাযোগ করুন।
            </p>
          </section>

          {/* Assigned profiles */}
          <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold leading-[1.5]">দায়িত্বপ্রাপ্ত প্রোফাইল</h2>
                <p className="text-[12px] leading-[1.6] text-muted">
                  {bn(tasks.length)}টি প্রোফাইল · {bn(open)}টিতে সংগ্রহ চলছে
                </p>
              </div>
            </div>
            {tasks.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12.5px] leading-[1.7] text-muted">এখনও কোনো প্রোফাইল দেওয়া হয়নি। প্রধান নির্বাহী সম্পাদক কাজ দিলে এখানে দেখা যাবে।</p>
            ) : (
              <ul>
                {tasks.map((t) => {
                  const u = URGENCY_STYLE[t.due.urgency];
                  return (
                    <li key={t.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-3.5 last:border-b-0">
                      <span className="flex size-9 flex-none items-center justify-center rounded-full bg-surface text-[14px] font-semibold text-primary">
                        {t.profile?.name.replace(/^মোঃ\s*/, "").slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold leading-[1.5]">{t.profile?.name}</div>
                        <div className="truncate text-[11.5px] leading-[1.5] text-muted">
                          {t.profile?.post} · {t.profile?.seat}
                        </div>
                        <span className="mt-1 inline-flex items-center gap-1 rounded-input px-2 py-px text-[10.5px] font-semibold" style={{ color: u.fg, background: u.bg }}>
                          <span className="size-[5px] rounded-full" style={{ background: u.fg }} />
                          {t.due.label}
                        </span>
                      </div>
                      {t.open && (
                        <Link
                          href={`/staff/submissions/new?profile=${t.profileId}`}
                          className="inline-flex h-8 flex-none items-center rounded-button border border-line px-2.5 text-[12px] font-semibold text-primary hover:border-primary hover:bg-surface"
                        >
                          জমা দিন
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Rules */}
        <div className="grid gap-5 lg:grid-cols-2">
          <RuleCard tone="do" title="করণীয়" rules={DO} />
          <RuleCard tone="dont" title="বর্জনীয়" rules={DONT} />
        </div>

        {/* After submitting */}
        <section className="rounded-card border border-line bg-white px-5 py-5 shadow-card">
          <h2 className="text-[15px] font-semibold leading-[1.5]">জমা দেওয়ার পর</h2>
          <p className="text-[12px] leading-[1.6] text-muted">প্রতিটি জমার অবস্থা ও সিদ্ধান্তের কারণ “আমার জমা” পাতায় দেখা যায়।</p>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {AFTER.map((s, i) => (
              <li key={s.title} className="relative flex gap-3">
                <span className="flex size-8 flex-none items-center justify-center rounded-full border-2 border-primary bg-white text-[13px] font-bold text-primary">{bn(i + 1)}</span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold leading-[1.5]">{s.title}</div>
                  <p className="mt-0.5 text-[12.5px] leading-[1.7] text-muted text-pretty">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
