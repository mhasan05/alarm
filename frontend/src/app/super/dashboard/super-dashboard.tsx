"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { inputClass } from "@/components/form";
import { actAsAdmin } from "@/lib/auth-client";
import { bn, bnDate, bnRelative, phoneBn } from "@/lib/db/format";
import { setOrgStatus } from "@/lib/db/super";
import { useRoot } from "@/lib/db/store";
import type { Org } from "@/lib/db/types";

/** Headline figures for one organisation, from its own records only. */
function statsOf(org: Org) {
  const db = org.db;
  return {
    politicians: db.profiles.length,
    staff: db.staff.filter((x) => x.status !== "Deactivated").length,
    reviewers: db.reviewers.filter((r) => r.status !== "Deactivated").length,
    submissions: db.submissions.length,
    pending: db.submissions.filter((s) => s.state === "Pending").length,
    disputes: db.disputes.filter((d) => d.state === "Open").length,
    lastActive: db.audit[0]?.at,
  };
}

/** The সুপার অ্যাডমিন's home: every প্রধান নির্বাহী সম্পাদক and their system, with one-click access. */
export function SuperDashboard() {
  const root = useRoot();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suspending, setSuspending] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const orgs = root.orgs;
  const active = orgs.filter((o) => o.status === "Active").length;
  const needle = q.trim().toLowerCase();
  const shown = orgs.filter((o) => {
    if (!needle) return true;
    const a = o.db.admins.find((x) => x.id === o.adminId);
    return [o.name, o.id, o.adminId, a?.nameBn ?? "", a?.name ?? "", a?.phone ?? ""].some((v) => v.toLowerCase().includes(needle));
  });

  const enter = (org: Org) => {
    setError("");
    const r = actAsAdmin(org.id);
    if (!r.ok) return setError(r.error);
    router.replace(r.to);
    router.refresh();
  };

  const tiles = [
    { label: "মোট প্রধান নির্বাহী সম্পাদক", value: orgs.length },
    { label: "চালু সিস্টেম", value: active },
    { label: "বন্ধ সিস্টেম", value: orgs.length - active },
    { label: "সব সিস্টেমে মোট ব্যবহারকারী", value: orgs.reduce((n, o) => n + o.db.users.length, 0) },
  ];

  return (
    <>
      <PageHeader
        crumb="সুপার অ্যাডমিন পোর্টাল"
        title="প্রধান নির্বাহী সম্পাদকগণ"
        action={
          <Link href="/super/admins/new" className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
            + নতুন প্রধান নির্বাহী সম্পাদক
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <p className="rounded-card border border-l-[3px] border-line border-l-[#3B2A6B] bg-white px-5 py-3.5 text-[13px] leading-[1.7] text-ink shadow-card">
          প্রত্যেক প্রধান নির্বাহী সম্পাদকের নিজের আলাদা সিস্টেম — তাঁর নির্বাহী সম্পাদক, তদন্ত সম্পাদক, রাজনৈতিক কর্মী, জমা, প্রতিবেদন ও মিটিং অন্য কেউ দেখতে পান না।{" "}
          <strong className="font-semibold">“অ্যাকাউন্টে প্রবেশ”</strong> চাপলে এক ক্লিকে তাঁর অ্যাকাউন্ট খুলবে; উপরের বেগুনি বার থেকে আবার সুপার অ্যাডমিনে ফিরতে পারবেন।
        </p>

        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t) => (
            <li key={t.label} className="rounded-card border border-line bg-white px-4 py-4 shadow-card">
              <div className="text-[26px] font-bold leading-none text-ink">{bn(t.value)}</div>
              <div className="mt-2 text-[12.5px] text-muted">{t.label}</div>
            </li>
          ))}
        </ul>

        {(error || notice) && (
          <p role={error ? "alert" : "status"} className={`rounded-card border border-l-[3px] border-line bg-white px-5 py-3 text-[13px] shadow-card ${error ? "border-l-danger text-danger" : "border-l-success text-ink"}`}>
            {error || notice}
          </p>
        )}

        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <h2 className="flex-1 text-[15px] font-semibold text-ink">সব প্রধান নির্বাহী সম্পাদক ও তাঁদের সিস্টেম</h2>
            <label className="w-full sm:w-[280px]">
              <span className="sr-only">খুঁজুন</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম, প্রতিষ্ঠান, মোবাইল বা আইডি…" className={`${inputClass} h-10`} />
            </label>
          </div>

          {shown.length === 0 ? (
            <p className="px-5 py-12 text-center text-[13px] text-muted">{needle ? "এই খোঁজে কিছু পাওয়া যায়নি।" : "এখনও কোনো প্রধান নির্বাহী সম্পাদক নেই।"}</p>
          ) : (
            <ul>
              {shown.map((org) => {
                const a = org.db.admins.find((x) => x.id === org.adminId);
                const st = statsOf(org);
                const suspended = org.status === "Suspended";
                return (
                  <li key={org.id} className={`border-b border-line px-5 py-5 last:border-b-0 ${suspended ? "bg-danger/[0.03]" : ""}`}>
                    <div className="flex flex-wrap items-start gap-4">
                      <span className={`flex size-11 flex-none items-center justify-center rounded-full text-[15px] font-semibold ${suspended ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"}`}>
                        {(a?.nameBn ?? a?.name ?? "?").slice(0, 2)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold text-ink">{a?.nameBn ?? a?.name}</span>
                          <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${suspended ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>{suspended ? "বন্ধ" : "চালু"}</span>
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-muted">
                          {org.name} · {org.id} · {org.adminId} · {a ? phoneBn(a.phone) : ""}
                        </div>
                        <div className="mt-0.5 text-[12px] text-muted">
                          তৈরি: {bnDate(org.createdAt)}
                          {st.lastActive && ` · শেষ কাজ: ${bnRelative(st.lastActive)}`}
                        </div>
                        {suspended && (
                          <p className="mt-2 text-[12.5px] text-danger">
                            পুরো সিস্টেম বন্ধ{org.suspendedAt ? ` (${bnDate(org.suspendedAt)})` : ""} — এই প্রতিষ্ঠানের কেউ লগইন বা কাজ করতে পারবেন না।{org.suspendReason ? ` কারণ: ${org.suspendReason}` : ""}
                          </p>
                        )}
                        <dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                          {[
                            ["রাজনৈতিক কর্মী", st.politicians],
                            ["তদন্ত সম্পাদক", st.staff],
                            ["নির্বাহী সম্পাদক", st.reviewers],
                            ["মোট জমা", st.submissions],
                            ["যাচাই চলছে", st.pending],
                            ["খোলা অভিযোগ", st.disputes],
                          ].map(([k, v]) => (
                            <div key={k} className="rounded-button bg-surface px-2.5 py-2">
                              <dt className="text-[11px] leading-tight text-muted">{k}</dt>
                              <dd className="mt-0.5 text-[15px] font-semibold text-ink">{bn(v)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-[200px]">
                        <button
                          type="button"
                          disabled={suspended}
                          title={suspended ? "বন্ধ সিস্টেমে প্রবেশ করা যায় না — আগে আবার চালু করুন" : undefined}
                          onClick={() => enter(org)}
                          className="h-10 cursor-pointer rounded-button bg-primary text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          অ্যাকাউন্টে প্রবেশ →
                        </button>
                        {suspended ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOrgStatus(org.id, "Active");
                              setNotice(`${a?.nameBn ?? org.name}-এর সিস্টেম আবার চালু হয়েছে।`);
                              setError("");
                            }}
                            className="h-10 cursor-pointer rounded-button border border-primary bg-white text-[13.5px] font-semibold text-primary hover:bg-surface"
                          >
                            আবার চালু করুন
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSuspending(org.id);
                              setReason("");
                            }}
                            className="h-10 cursor-pointer rounded-button border border-danger bg-white text-[13.5px] font-semibold text-danger hover:bg-danger/5"
                          >
                            বন্ধ করুন
                          </button>
                        )}
                        <Link href={`/super/admins/new?reset=${org.id}`} className="text-center text-[12.5px] font-semibold text-muted hover:text-primary">
                          পাসওয়ার্ড রিসেট
                        </Link>
                      </div>
                    </div>

                    {suspending === org.id && (
                      <form
                        role="alertdialog"
                        aria-label="সিস্টেম বন্ধ"
                        onSubmit={(e) => {
                          e.preventDefault();
                          setOrgStatus(org.id, "Suspended", reason);
                          setSuspending(null);
                          setNotice(`${a?.nameBn ?? org.name}-এর পুরো সিস্টেম বন্ধ করা হয়েছে।`);
                          setError("");
                        }}
                        className="mt-4 flex flex-col gap-2.5 rounded-button border border-danger/40 bg-danger/[0.04] p-4"
                      >
                        <p className="text-[13px] font-semibold text-ink">{a?.nameBn} ও তাঁর পুরো সিস্টেম বন্ধ করবেন?</p>
                        <p className="text-[12.5px] leading-[1.6] text-muted">তাঁর নির্বাহী সম্পাদক, তদন্ত সম্পাদক ও রাজনৈতিক কর্মী সহ এই প্রতিষ্ঠানের কেউ লগইন বা কোনো কাজ করতে পারবেন না। ডেটা মুছবে না — আবার চালু করলে সব আগের মতো ফিরবে।</p>
                        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="কারণ (না দিলেও চলবে)" aria-label="বন্ধ করার কারণ" className={inputClass} />
                        <div className="flex gap-2">
                          <button type="submit" className="h-10 cursor-pointer rounded-button bg-danger px-4 text-[13.5px] font-semibold text-white hover:bg-danger-hover">
                            হ্যাঁ, বন্ধ করুন
                          </button>
                          <button type="button" onClick={() => setSuspending(null)} className="h-10 cursor-pointer rounded-button border border-line px-4 text-[13.5px] font-semibold text-muted">
                            বাতিল
                          </button>
                        </div>
                      </form>
                    )}
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
