"use client";

import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { bn } from "@/lib/db/format";
import { AddActivityButton } from "../add-activity-button";
import { ReportCard } from "../report-card";
import { usePolitician } from "../use-politician";
import { ProfileHero } from "./profile-hero";

export function DashboardView() {
  const { profile, summary, published, disputeOf } = usePolitician();
  if (!profile) return <RecordMissing title="প্রোফাইল পাওয়া যায়নি" backHref="/login" backLabel="আবার লগইন করুন" />;

  const stats = [
    { label: "প্রকাশিত কার্যক্রম", value: summary.accepted, color: "#1A7A4A", note: "নির্বাহী সম্পাদক গ্রহণ করেছেন" },
    { label: "ইতিবাচক", value: summary.positive, color: "#1A7A4A", note: "প্রোফাইলে প্রকাশিত" },
    { label: "নেতিবাচক", value: summary.negative, color: "#F42A41", note: "প্রোফাইলে প্রকাশিত" },
  ];

  return (
    <>
      <PageHeader crumb="রাজনৈতিক কর্মী পোর্টাল / ড্যাশবোর্ড" title="ড্যাশবোর্ড" action={<AddActivityButton />} />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <ProfileHero profile={profile} summary={summary} />

        {/* Compact tiles on phones, full cards from md up. */}
        <div className="grid grid-cols-3 gap-2.5 md:gap-4">
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

        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[14.5px] font-semibold leading-[1.6]">প্রোফাইলে প্রকাশিত কার্যক্রম</h2>
            <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">নির্বাহী সম্পাদক গ্রহণ করেছেন এমন তথ্য · প্রধান নির্বাহী সম্পাদক, নির্বাহী সম্পাদক ও দায়িত্বপ্রাপ্ত তদন্ত সম্পাদক দেখতে পান</p>
          </div>

          {published.length === 0 ? (
            <div className="flex flex-col items-center gap-[15px] px-6 pt-10 pb-11 text-center">
              <div className="flex size-[62px] items-center justify-center rounded-full bg-role-politician/12">
                <svg width="28" height="28" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="5.4" r="2.8" stroke="#7A3FA8" strokeWidth="1.4" />
                  <path d="M2.8 13.6c0-2.8 2.3-4.6 5.2-4.6s5.2 1.8 5.2 4.6" stroke="#7A3FA8" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="text-[16px] font-semibold leading-[1.6]">এখনও কোনো কার্যক্রম প্রকাশিত হয়নি</div>
                <p className="mt-2 max-w-[440px] text-[12.5px] leading-[1.85] text-muted text-pretty">
                  আপনার প্রোফাইল তৈরি হয়েছে। আপনি নিজের কার্যক্রম যোগ করতে পারেন — নির্বাহী সম্পাদক গ্রহণ করলে এখানে দেখা যাবে।
                </p>
              </div>
              <AddActivityButton className="h-[42px] px-[18px]" />
            </div>
          ) : (
            <div className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {published.map((r) => (
                <ReportCard key={r.code} report={r} dispute={disputeOf(r.code)} from="dashboard" />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
