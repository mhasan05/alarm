"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { bn } from "@/lib/db/format";
import { NewSubmissionButton } from "../new-submission-button";
import { URGENCY_STYLE, useStaff } from "../use-staff";

export function StaffDashboardView() {
  const { staff, subs, tasks, openTasks, counts } = useStaff();
  if (!staff) return <RecordMissing title="অ্যাকাউন্ট পাওয়া যায়নি" backHref="/login" backLabel="আবার লগইন করুন" />;

  const nearest = openTasks.filter((t) => t.due.urgency !== "done").sort((a, b) => a.due.days - b.due.days)[0];
  const lastRejected = subs.find((s) => s.state === "Rejected");

  const stats = [
    { label: "চলতি কাজ", value: openTasks.length, color: "#0D1F17", note: nearest ? `সবচেয়ে কাছের: ${nearest.due.label}` : "কোনো চলতি কাজ নেই" },
    { label: "যাচাই চলছে", value: counts.pending, color: "#D97706", note: "নির্বাহী সম্পাদকের সিদ্ধান্তের অপেক্ষায়" },
    { label: "গ্রহণ হয়েছে", value: counts.accepted, color: "#1A7A4A", note: "প্রোফাইলে দেখা যাচ্ছে" },
    { label: "বাতিল", value: counts.rejected, color: "#F42A41", note: "কারণসহ বন্ধ করা হয়েছে" },
  ];

  return (
    <>
      <PageHeader crumb="তদন্ত সম্পাদক পোর্টাল / ড্যাশবোর্ড" title="ড্যাশবোর্ড" action={<NewSubmissionButton />} />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        {/* Compact 2×2 tiles on phones (mobile design), full cards from md up. */}
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(185px,1fr))] md:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-card border border-line bg-white p-3 shadow-card md:p-[18px]">
              <div className="text-[11.5px] font-semibold leading-[1.6] text-muted">{s.label}</div>
              <div className="mt-1.5 text-[22px] font-bold leading-none tracking-[-0.02em] md:mt-2 md:text-[28px]" style={{ color: s.color }}>
                {bn(s.value)}
              </div>
              <div className="mt-1.5 hidden text-[11.5px] leading-[1.6] text-muted text-pretty md:block">{s.note}</div>
            </div>
          ))}
        </div>

        {lastRejected && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-l-[3px] border-line border-l-danger bg-white px-[18px] py-[15px] shadow-card">
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none">
              <circle cx="8" cy="8" r="6.3" stroke="#F42A41" strokeWidth="1.4" />
              <path d="M8 4.6v4.2M8 11.2v.2" stroke="#F42A41" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="min-w-[220px] flex-1 text-[12.5px] leading-[1.75] text-pretty">
              আপনার {bn(counts.rejected)}টি জমা বাতিল হয়েছে — সবশেষ: “{lastRejected.title}”। কারণ দেখে পরের জমায় প্রমাণ মজবুত করুন।
            </p>
            <Link
              href={`/staff/submissions/${lastRejected.code}`}
              className="inline-flex h-9 flex-none items-center rounded-button border border-danger bg-white px-3.5 text-[12.5px] font-semibold text-danger hover:bg-danger/6"
            >
              কারণ দেখুন
            </Link>
          </div>
        )}

        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[14.5px] font-semibold leading-[1.6]">আমার কাজের তালিকা</h2>
            <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">{bn(openTasks.length)}টি প্রোফাইলে সংগ্রহ চলছে · প্রধান নির্বাহী সম্পাদক আপনাকে এই কাজগুলো দিয়েছেন</p>
          </div>

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 pt-10 pb-11 text-center">
              <div className="text-[15px] font-semibold leading-[1.6]">কোনো দায়িত্ব দেওয়া হয়নি</div>
              <p className="max-w-[420px] text-[12.5px] leading-[1.8] text-muted text-pretty">আপনার এলাকায় এখনও কোনো প্রোফাইল দেওয়া হয়নি। প্রধান নির্বাহী সম্পাদক দায়িত্ব দিলে এখানে দেখা যাবে।</p>
            </div>
          ) : (
            <ul className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {tasks.map((t) => {
                const due = URGENCY_STYLE[t.due.urgency];
                const mine = subs.filter((s) => s.profileId === t.profileId);
                const acc = mine.filter((s) => s.state === "Accepted").length;
                const pend = mine.filter((s) => s.state === "Pending").length;
                const counts = [
                  { value: mine.length, label: "আমার জমা", color: "#0D1F17" },
                  { value: acc, label: "গ্রহণ হয়েছে", color: "#1A7A4A" },
                  { value: pend, label: "যাচাই চলছে", color: pend ? "#D97706" : "#4A7060" },
                ];
                return (
                  <li key={t.id} className={`relative flex flex-col rounded-card border border-l-[3px] border-line p-4 ${t.open ? "cursor-pointer bg-white hover:bg-[#FAFDFC]" : "bg-[#FAFDFC]"}`} style={{ borderLeftColor: due.accent }}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
                      <span className="flex size-[38px] flex-none items-center justify-center rounded-full bg-primary/12 text-[15px] font-semibold text-primary">{t.profile?.initial}</span>
                      <div className="min-w-[200px] flex-1">
                        <h3 className="text-[15px] font-semibold leading-[1.6]">{t.profile?.name}</h3>
                        <p className="mt-[3px] text-[12px] leading-[1.65] text-muted text-pretty">
                          {t.profile?.post} · {t.profile?.seat}, {t.profile?.thana} · {t.wards}
                        </p>
                      </div>
                      <span className="inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-input px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: due.fg, background: due.bg }}>
                        <span className="size-[5px] rounded-full" style={{ background: due.fg }} />
                        {t.due.label}
                      </span>
                    </div>

                    <div className="mt-[13px] rounded-button border border-line bg-surface px-3.5 py-3">
                      <div className="text-[10px] font-semibold tracking-[0.05em] text-muted">কী সংগ্রহ করতে হবে</div>
                      <p className="mt-1.5 text-[12.5px] leading-[1.75] text-pretty">{t.brief}</p>
                    </div>

                    <div aria-hidden="true" className="min-h-[13px] flex-1" />
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-[#E3EEEA] pt-3">
                      {counts.map((c) => (
                        <div key={c.label} className="flex items-baseline gap-1.5">
                          <span className="text-[14px] font-bold" style={{ color: c.color }}>
                            {bn(c.value)}
                          </span>
                          <span className="text-[11.5px] leading-[1.6] text-muted">{c.label}</span>
                        </div>
                      ))}
                      <span className="min-w-2 flex-1" />
                      {t.open ? (
                        <Link
                          href={`/staff/submissions/new?profile=${t.profileId}`}
                          className="inline-flex h-9 flex-none items-center gap-[7px] rounded-button border border-primary bg-primary px-[15px] text-[12.5px] font-semibold text-white after:absolute after:inset-0 after:content-[''] hover:bg-primary-hover"
                        >
                          তথ্য জমা দিন
                        </Link>
                      ) : (
                        <span className="inline-flex h-9 flex-none items-center gap-[7px] rounded-button border border-line bg-surface px-[15px] text-[12.5px] font-semibold text-muted">
                          <svg width="12" height="13" viewBox="0 0 13 15" fill="none" aria-hidden="true">
                            <rect x="1.4" y="6.1" width="10.2" height="7.6" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M4 6.1V4.2a2.5 2.5 0 0 1 5 0v1.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                          সংগ্রহ বন্ধ
                        </span>
                      )}
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
