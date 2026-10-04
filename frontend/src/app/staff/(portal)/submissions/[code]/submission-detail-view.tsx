"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { bnDate } from "@/lib/db/format";
import { CATEGORY_STYLE, profileOf } from "@/lib/db/selectors";
import { NewSubmissionButton } from "../../new-submission-button";
import { STAFF_STATE, useStaff } from "../../use-staff";

function SectionLabel({ num, children }: { num: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.05em] text-muted">
      <span className="flex size-[18px] items-center justify-center rounded-full bg-surface text-[10px] text-primary">{num}</span>
      {children}
    </div>
  );
}

function Badge({ fg, bg, children }: { fg: string; bg: string; children: ReactNode }) {
  return (
    <span className="inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-input px-[9px] py-[3px] text-[11px] font-semibold" style={{ color: fg, background: bg }}>
      <span className="size-[5px] rounded-full" style={{ background: fg }} />
      {children}
    </span>
  );
}

/** One submission with its evidence and the review decision and reason. No reviewer identities. */
export function StaffSubmissionDetailView({ code }: { code: string }) {
  const { db, subs } = useStaff();
  const sub = subs.find((s) => s.code === code);
  if (!sub) return <RecordMissing title="জমাটি পাওয়া যায়নি" backHref="/staff/submissions" backLabel="আমার জমায় ফিরুন" />;

  const profile = profileOf(db, sub.profileId);
  const cat = CATEGORY_STYLE[sub.category];
  const st = STAFF_STATE[sub.state];
  const pending = sub.state === "Pending";
  const closed = sub.state === "Rejected" || sub.state === "Held";
  const revisit = pending && sub.events.at(-1)?.type === "revisit";

  return (
    <>
      <PageHeader backHref="/staff/submissions" crumb="তদন্ত সম্পাদক পোর্টাল / আমার জমা / বিস্তারিত" title="জমার বিস্তারিত" action={<NewSubmissionButton />} />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <Link
          href="/staff/submissions"
          className="inline-flex h-[34px] items-center gap-2 self-start rounded-button border border-line bg-white px-[13px] text-[12.5px] font-semibold text-primary hover:border-primary hover:bg-surface max-md:hidden"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M8.6 2.4 4 7l4.6 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          আমার জমায় ফিরুন
        </Link>

        <article className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-l-4 border-line px-[22px] py-[18px]" style={{ borderLeftColor: closed ? "#C8DDD6" : cat.fg }}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge fg={cat.fg} bg={cat.bg}>
                {sub.category}
              </Badge>
              <span className="flex-none whitespace-nowrap font-mono text-[11px] font-semibold text-muted">{sub.code}</span>
              <span className="min-w-2.5 flex-1" />
              <Badge fg={st.fg} bg={st.bg}>
                {st.label}
              </Badge>
            </div>
            <h2 className={`mt-3 text-[18px] font-semibold leading-[1.65] text-pretty ${closed ? "text-muted" : "text-ink"}`}>{sub.title}</h2>
            <p className="mt-1.5 text-[12px] leading-[1.65] text-muted">জমা: {bnDate(sub.submittedAt)}</p>
          </div>

          <div className="flex flex-col gap-5 px-[22px] py-5">
            <div className="flex flex-wrap items-center gap-3 rounded-input border border-line bg-surface px-3.5 py-3">
              <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-primary/12 text-[14px] font-semibold text-primary">{profile?.initial}</span>
              <div className="min-w-[180px] flex-1">
                <div className="text-[10px] font-semibold tracking-[0.05em] text-muted">কোন রাজনৈতিক কর্মী সম্পর্কে</div>
                <div className="text-[14px] font-semibold leading-[1.6]">{profile?.name}</div>
                <div className="mt-0.5 text-[11.5px] leading-[1.6] text-muted text-pretty">
                  {profile?.post} · {profile?.seat}, {profile?.thana}
                </div>
              </div>
            </div>

            <div>
              <SectionLabel num="১">সূত্র ও বিবরণ</SectionLabel>
              <p className="mt-2 text-[13.5px] leading-[1.8] text-pretty">{sub.body}</p>
              <p className="mt-1.5 text-[12px] text-muted">সূত্র: {sub.source}</p>
            </div>

            <div>
              <SectionLabel num="২">সংযুক্ত প্রমাণ · EVIDENCE</SectionLabel>
              {sub.evidence.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-muted">কোনো প্রমাণ সংযুক্ত নেই।</p>
              ) : (
                <ul className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
                  {sub.evidence.map((e) => (
                    <li key={e.id} className="overflow-hidden rounded-card border border-line">
                      <div className="flex h-[92px] items-center justify-center border-b border-line bg-surface px-2 text-center text-[11px] text-muted">{e.kind}</div>
                      <div className="px-[11px] py-2.5">
                        <div className="text-[12px] font-semibold leading-[1.55] text-pretty">{e.title}</div>
                        <div className="mt-1 text-[10.5px] leading-[1.55] text-muted">{e.meta}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </article>

        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-l-4 border-line px-[22px] py-[16px]" style={{ borderLeftColor: st.fg }}>
            <h2 className="text-[15px] font-semibold leading-[1.6]">পর্যালোচনার সিদ্ধান্ত</h2>
            <span className="min-w-2.5 flex-1" />
            <Badge fg={st.fg} bg={st.bg}>
              {st.label}
            </Badge>
          </div>
          <div className="flex flex-col gap-4 px-[22px] py-5">
            {pending ? (
              <p className="text-[13px] leading-[1.75] text-muted text-pretty">
                {revisit
                  ? `পুনরায় পরিদর্শনের অনুরোধ: ${sub.reason ?? ""} — আরও প্রমাণ সংগ্রহ করে নতুন তথ্য হিসেবে জমা দিন।`
                  : "নির্বাহী সম্পাদকের সিদ্ধান্তের অপেক্ষায়। সিদ্ধান্ত হলে কারণসহ এখানে দেখা যাবে — গ্রহণ করা হলে সংশ্লিষ্ট প্রোফাইলে প্রকাশিত হবে।"}
              </p>
            ) : (
              <>
                {sub.decidedAt && (
                  <dl>
                    <dt className="text-[10.5px] font-semibold tracking-[0.05em] text-muted">সিদ্ধান্তের তারিখ</dt>
                    <dd className="mt-1 text-[13px] leading-[1.6]">{bnDate(sub.decidedAt)}</dd>
                  </dl>
                )}
                <div className="rounded-card border border-l-[3px] border-line bg-surface px-4 py-3" style={{ borderLeftColor: st.fg }}>
                  <div className="text-[10.5px] font-semibold tracking-[0.05em] text-muted">{closed ? "বাতিলের কারণ" : "সিদ্ধান্তের কারণ"}</div>
                  <p className="mt-1 text-[13px] font-semibold leading-[1.7] text-pretty" style={{ color: closed ? st.fg : "#0D1F17" }}>
                    {sub.reason}
                  </p>
                </div>
                {sub.state === "Withdrawn" && (
                  <p className="text-[12.5px] leading-[1.7] text-muted">রাজনৈতিক কর্মীর অভিযোগের পর প্রধান নির্বাহী সম্পাদক এই তথ্যটি প্রোফাইল থেকে প্রত্যাহার করেছেন।</p>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
