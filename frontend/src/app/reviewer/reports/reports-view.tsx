"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { bn, bnDate } from "@/lib/db/format";
import { useReviewer } from "../use-reviewer";

/** Final reports assigned to this reviewer for sign-off: waiting first, then signed. */
export function ReviewerReportsView() {
  const { reports } = useReviewer();
  const waiting = reports.filter((r) => r.state === "pending");
  const signed = reports.filter((r) => r.state === "approved");

  const Row = ({ r }: { r: (typeof reports)[number] }) => {
    const v = r.versions[0];
    const pending = r.state === "pending";
    return (
      <li className="flex">
        <Link
          href={`/reviewer/reports/${r.code}`}
          className="group flex w-full flex-col rounded-card border border-l-[3px] border-line bg-white p-[15px] hover:border-primary hover:bg-[#FAFDFC]"
          style={{ borderLeftColor: pending ? "#1D6FC0" : "#1A7A4A" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11.5px] font-semibold text-muted">
              {r.code} · v{v.v}
            </span>
            <span className="min-w-2.5 flex-1" />
            <span className={`inline-flex items-center gap-[5px] rounded-input px-[9px] py-[3px] text-[11px] font-semibold ${pending ? "bg-role-reviewer/10 text-role-reviewer" : "bg-success/10 text-success"}`}>
              <span className="size-[5px] rounded-full bg-current" />
              {pending ? "স্বাক্ষরের অপেক্ষায়" : "স্বাক্ষরিত"}
            </span>
          </div>
          <div className="mt-2.5 text-[14px] font-semibold leading-[1.6]">{r.subject.name}</div>
          <div className="mt-1 text-[12px] text-muted">
            {bn(v.positive)}টি ইতিবাচক · {bn(v.negative)}টি নেতিবাচক · তৈরি {bnDate(r.published)}
            {r.approval && ` · স্বাক্ষর ${bnDate(r.approval.at)}`}
          </div>
          <div aria-hidden="true" className="min-h-[11px] flex-1" />
          <div className="flex justify-end border-t border-[#E3EEEA] pt-2.5">
            <span className="inline-flex h-8 items-center rounded-button border border-line px-3 text-[11.5px] font-semibold text-primary group-hover:border-primary group-hover:bg-surface">
              {pending ? "পড়ুন ও স্বাক্ষর দিন" : "প্রতিবেদন দেখুন"}
            </span>
          </div>
        </Link>
      </li>
    );
  };

  return (
    <>
      <PageHeader crumb="পর্যালোচক পোর্টাল / প্রতিবেদন অনুমোদন" title="প্রতিবেদন অনুমোদন" />
      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[14.5px] font-semibold leading-[1.6]">স্বাক্ষরের অপেক্ষায়</h2>
            <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">অ্যাডমিন বিশ্লেষণ থেকে তৈরি প্রতিবেদন — আপনার মন্তব্য ও স্বাক্ষরের পর চূড়ান্ত হবে</p>
          </div>
          {waiting.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13px] text-muted">এই মুহূর্তে কোনো প্রতিবেদন আপনার স্বাক্ষরের অপেক্ষায় নেই।</p>
          ) : (
            <ul className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {waiting.map((r) => (
                <Row key={r.code} r={r} />
              ))}
            </ul>
          )}
        </section>

        {signed.length > 0 && (
          <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[14.5px] font-semibold leading-[1.6]">আপনার স্বাক্ষরিত প্রতিবেদন</h2>
            </div>
            <ul className="grid gap-4 px-[18px] pt-4 pb-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {signed.map((r) => (
                <Row key={r.code} r={r} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
