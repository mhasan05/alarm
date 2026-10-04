"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { bn } from "@/lib/db/format";
import { useReviewer } from "../use-reviewer";

export function ReviewerProfilesView() {
  const { reviewer, profiles: rows } = useReviewer();
  // Coverage areas, grouped by district.
  const byDistrict = new Map<string, string[]>();
  for (const a of reviewer?.areas ?? []) {
    const [district, thana] = a.split(" · ");
    byDistrict.set(district, [...(byDistrict.get(district) ?? []), thana]);
  }
  const JURISDICTION: [string, string][] = [...byDistrict].map(([d, t]) => [`জেলা · ${d}`, t.join(", ")]);

  return (
    <>
      <PageHeader crumb="নির্বাহী সম্পাদক পোর্টাল / আমার প্রোফাইল" title="আমার দায়িত্বের প্রোফাইল" action={
          <Link href="/reviewer/politicians/new" className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
            + নতুন রাজনৈতিক কর্মী
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <section className="rounded-card border border-l-[3px] border-line border-l-primary bg-white px-5 py-[18px] shadow-card">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none">
              <path d="M2.4 3.2 6 2l4 1.4 3.6-1.2v10.6L10 14l-4-1.4-3.6 1.2zM6 2v10.6M10 3.4V14" stroke="#006A4E" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            <h2 className="text-[14px] font-semibold leading-[1.6]">আমার নির্ধারিত এলাকা</h2>
            <span className="inline-flex flex-none items-center gap-[7px] whitespace-nowrap text-[11px] font-semibold text-muted">
              <svg width="12" height="13" viewBox="0 0 13 15" fill="none" aria-hidden="true">
                <rect x="1.4" y="6.1" width="10.2" height="7.6" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
                <path d="M4 6.1V4.2a2.5 2.5 0 0 1 5 0v1.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              প্রধান নির্বাহী সম্পাদক নির্ধারিত
            </span>
          </div>
          <dl className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-[22px] gap-y-3.5">
            {JURISDICTION.length === 0 && <p className="text-[12.5px] text-muted">কোনো এলাকা নির্ধারিত হয়নি — প্রধান নির্বাহী সম্পাদকের সাথে যোগাযোগ করুন।</p>}
            {JURISDICTION.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[10px] font-semibold tracking-[0.05em] text-muted">{label}</dt>
                <dd className="mt-1 text-[13.5px] font-semibold leading-[1.6] text-pretty">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3.5 border-t border-[#E3EEEA] pt-[13px] text-[11.5px] leading-[1.7] text-muted text-pretty">
            এই এলাকার সব রাজনৈতিক কর্মীর জমা আপনার সারিতে আসে। এলাকা পরিবর্তন করতে পারেন কেবল প্রধান নির্বাহী সম্পাদক।
          </p>
        </section>

        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[14.5px] font-semibold leading-[1.6]">আমার দায়িত্বের প্রোফাইল</h2>
            <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">
              আপনার এলাকার {bn(rows.length)}টি প্রোফাইল · এলাকা অনুযায়ী প্রধান নির্বাহী সম্পাদক এই দায়িত্ব দিয়েছেন
            </p>
          </div>

          {/* Scrolls sideways on narrow screens instead of squeezing the columns. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface text-[11px] font-semibold tracking-[0.05em] text-muted">
                  <th scope="col" className="w-[38%] px-5 py-2.5 font-semibold">PROFILE</th>
                  <th scope="col" className="px-2 py-2.5 font-semibold">PENDING</th>
                  <th scope="col" className="px-2 py-2.5 font-semibold">ACCEPTED</th>
                  <th scope="col" className="px-2 py-2.5 font-semibold">REJECTED</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const busy = p.pending > 0;
                  return (
                    <tr key={p.id} className="border-b border-[#E3EEEA] text-[13px] hover:bg-[#FAFDFC]">
                      <td className="px-5 py-[13px]">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex size-8 flex-none items-center justify-center rounded-full bg-primary/12 text-[13px] font-semibold text-primary">
                            {p.initial}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold leading-normal">{p.name}</span>
                            <span className="mt-px block truncate text-[11px] text-muted">{p.post} · {p.seat}, {p.thana}</span>
                          </span>
                        </div>
                      </td>
                      <td className={`px-2 font-semibold ${busy ? "text-warning" : "text-muted"}`}>{bn(p.pending)}</td>
                      <td className="px-2 font-semibold text-success">{bn(p.accepted)}</td>
                      <td className="px-2 font-semibold text-muted">{bn(p.rejected)}</td>
                      <td className="px-5 text-right">
                        <span
                          className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11.5px] font-semibold ${
                            busy ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                          }`}
                        >
                          <span className={`size-[5px] rounded-full ${busy ? "bg-warning" : "bg-success"}`} />
                          {busy ? "সারি বাকি" : "সারি খালি"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-[13px] text-[11.5px] leading-[1.7] text-muted text-pretty">
            সারি খালি না হওয়া পর্যন্ত প্রধান নির্বাহী সম্পাদক ওই প্রোফাইলে এআই বিশ্লেষণ শুরু করতে পারেন না।
          </p>
        </section>
      </div>
    </>
  );
}
