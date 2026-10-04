"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { AccountActions, StaffStatusBadge, type AccountStatus } from "@/components/account-actions";
import { inputClass, selectClass } from "@/components/form";
import { RecordMissing } from "@/components/record-missing";
import { assign, resetPassword, setStaffStatus } from "@/lib/db/actions";
import { bn, bnDate, bnDayMonth, phoneMasked } from "@/lib/db/format";
import { coverageKey, profileOf, staffAssignments, staffOf, staffSubmissions, STATE_CHIP } from "@/lib/db/selectors";
import type { StaffStatus, SubmissionState } from "@/lib/db/types";
import { useAdmin } from "../../use-admin";

type AssignmentStage = "Collecting" | "Submitted" | "Closed";
const STAGE_STYLE: Record<AssignmentStage, string> = {
  Collecting: "bg-warning/10 text-warning",
  Submitted: "bg-role-reviewer/10 text-role-reviewer",
  Closed: "bg-surface text-muted",
};
const STAGE_LABEL: Record<AssignmentStage, string> = { Collecting: "তথ্য সংগ্রহ চলছে", Submitted: "জমা দেওয়া হয়েছে", Closed: "শেষ হয়েছে" };
const STATE_DOT: Record<SubmissionState, string> = { Accepted: "bg-success", Pending: "bg-warning", Rejected: "bg-danger" };

const card = "rounded-card border border-line bg-white shadow-card";

export function FieldStaffDetailView({ id }: { id: string }) {
  const { db, adminId } = useAdmin();
  const [assigning, setAssigning] = useState(false);
  const [form, setForm] = useState({ profileId: "", due: "", brief: "" });
  const [formError, setFormError] = useState("");
  const staff = staffOf(db, id);
  if (!staff) return <RecordMissing title="তদন্ত সম্পাদক পাওয়া যায়নি" backHref="/admin/field-staff" backLabel="তদন্ত সম্পাদক তালিকায় ফিরুন" />;

  // Every submission this person filed, newest first.
  const reports = staffSubmissions(db, staff.id);
  const all = staffAssignments(db, staff.id).sort((a, b) => Number(b.open) - Number(a.open) || a.due.localeCompare(b.due));
  const assignments = all.map((a) => {
    const profile = profileOf(db, a.profileId);
    const mine = reports.filter((r) => r.profileId === a.profileId);
    const stage: AssignmentStage = !a.open
      ? "Closed"
      : mine.some((r) => r.state === "Pending")
        ? "Submitted"
        : "Collecting";
    return { ...a, stage, name: profile?.name ?? a.profileId, audit: profile?.audit.code ?? a.profileId };
  });
  const open = all.filter((a) => a.open).length;
  const limit = db.settings.rules.caseload;
  const s = { ...staff, open };
  const p = { nid: staff.nid, seat: staff.seat, wards: `${staff.thana} · ${staff.wards}`, completed: staff.completed, ...staff.device };
  const inReview = reports.filter((r) => r.state === "Pending").length;
  const accepted = reports.filter((r) => r.state === "Accepted").length;
  const rejected = reports.filter((r) => r.state === "Rejected").length;
  const items = reports.reduce((n, r) => n + r.evidence.length, 0);
  const auditOf = (profileId: string) => profileOf(db, profileId)?.audit.code ?? profileId;
  // Profiles in this staff member's area they aren't already assigned to.
  const assignable = db.profiles.filter((x) => coverageKey(x) === `${staff.district} · ${staff.thana}` || x.district === staff.district).filter((x) => !all.some((a) => a.open && a.profileId === x.id));

  const stats = [
    { label: "মোট মাঠের কাজ", value: s.open + p.completed, color: "#0D1F17", note: "যোগ দেওয়ার পর থেকে" },
    {
      label: "চলমান",
      value: s.open,
      color: s.open > limit ? "#F42A41" : s.open >= limit - 1 ? "#D97706" : "#0D1F17",
      note: s.open > limit ? "কাজের চাপের সীমা ছাড়িয়েছে" : s.open >= limit - 1 ? "সীমার কাছাকাছি" : "স্বাভাবিক সীমার মধ্যে",
    },
    { label: "শেষ হয়েছে", value: p.completed, color: "#1A7A4A", note: "শেষ হওয়া অডিট" },
    { label: "মোট জমা", value: reports.length, color: "#0D1F17", note: `${bn(items)}টি প্রমাণ` },
    { label: "যাচাই চলছে", value: inReview, color: "#D97706", note: "নির্বাহী সম্পাদকের অপেক্ষায়" },
    { label: "গ্রহণ হয়েছে", value: accepted, color: "#1A7A4A", note: `${bn(rejected)}টি বাতিল` },
  ];

  const facts = [
    { k: "ALARM আইডি", v: s.id },
    { k: "মোবাইল", v: phoneMasked(s.phone) },
    { k: "এনআইডি", v: `${p.nid} · লুকানো` },
    { k: "যোগ দিয়েছেন", v: bnDate(s.joined) },
    { k: "নির্বাচনী আসন", v: p.seat },
    { k: "দায়িত্বের ওয়ার্ড", v: p.wards },
  ];

  return (
    <>
      <PageHeader
        backHref="/admin/field-staff"
        crumb={
          <>
            <Link href="/admin/field-staff" className="text-primary hover:text-primary-hover">
              তদন্ত সম্পাদক
            </Link>{" "}
            / {s.id}
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {s.nameBn || s.name}
            <StaffStatusBadge status={s.status} />
            <span className="rounded-md bg-warning/10 px-2 py-0.5 text-[12px] font-medium text-warning">তদন্ত সম্পাদক</span>
            <span className="block w-full font-bn text-[12.5px] font-normal text-muted max-md:hidden">
              {p.seat} · {p.wards}
            </span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={`/admin/field-staff/new?edit=${s.id}`}
              className="inline-flex h-10 items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary hover:bg-surface"
            >
              প্রোফাইল এডিট
            </Link>
            <button
              type="button"
              disabled={s.status === "Deactivated"}
              onClick={() => setAssigning(true)}
              className="inline-flex h-10 cursor-pointer items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              মাঠের কাজ দিন
            </button>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        {s.note && (
          <p role="note" className="rounded-card border border-warning/40 bg-warning/8 px-5 py-3 text-[13px] text-ink">
            {s.note}
          </p>
        )}

        <section className={`${card} flex flex-wrap gap-5 px-5 py-5`}>
          <div className="flex h-[102px] w-[86px] flex-none flex-col items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-center text-[10.5px] leading-tight text-muted">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="5.5" r="2.6" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3 14c.6-2.8 2.6-4.3 5-4.3s4.4 1.5 5 4.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            আইডি ছবি
            <br />
            আপলোড হয়নি
          </div>
          <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
            {facts.map((f) => (
              <div key={f.k} className={f.k === "দায়িত্বের ওয়ার্ড" ? "sm:col-span-2" : ""}>
                <dt className="text-[10.5px] font-semibold text-muted">{f.k}</dt>
                <dd className="mt-1 font-bn text-[13.5px] font-semibold text-ink">{f.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
          {stats.map((st) => (
            <div key={st.label} className={`${card} p-3 md:p-[18px]`}>
              <div className="text-[11px] font-semibold text-muted">{st.label}</div>
              <div className="mt-1.5 text-[22px] font-bold leading-none md:text-[26px]" style={{ color: st.color }}>
                {bn(st.value)}
              </div>
              <div className="mt-1.5 font-bn text-[11.5px] leading-snug text-muted max-md:hidden">{st.note}</div>
            </div>
          ))}
        </div>

        <section className={`${card} overflow-hidden`}>
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">চলমান মাঠের কাজ</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-muted">
                {bn(open)}টি চলমান · সীমা {bn(limit)}
              </span>
              {!assigning && s.status !== "Deactivated" && (
                <button
                  type="button"
                  onClick={() => setAssigning(true)}
                  className="h-8 cursor-pointer rounded-button border border-line px-3 text-[12.5px] font-semibold text-primary hover:border-primary"
                >
                  + মাঠের কাজ দিন
                </button>
              )}
            </div>
          </div>
          {assigning && (
            <form
              className="grid grid-cols-1 gap-3 border-b border-line bg-surface/50 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_160px]"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.profileId || !form.due || form.brief.trim().length < 10) {
                  setFormError("একটি প্রোফাইল ও শেষ তারিখ বেছে নিন, এবং কী সংগ্রহ করতে হবে তা লিখুন (অন্তত একটি বাক্য)।");
                  return;
                }
                const prof = profileOf(db, form.profileId);
                assign({ staffId: staff.id, profileId: form.profileId, due: form.due, brief: form.brief.trim(), wards: prof ? `${prof.wards}, ${prof.thana}` : "" }, adminId);
                setAssigning(false);
                setForm({ profileId: "", due: "", brief: "" });
                setFormError("");
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold">প্রোফাইল</span>
                <select value={form.profileId} onChange={(e) => setForm({ ...form, profileId: e.target.value })} className={`${selectClass} h-10`}>
                  <option value="">{staff.district}-এর একটি প্রোফাইল বেছে নিন</option>
                  {assignable.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {x.seat}, {x.thana}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold">শেষ তারিখ</span>
                <input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} className={`${inputClass} h-10 px-[11px]`} />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-[12px] font-semibold">কী সংগ্রহ করতে হবে</span>
                <textarea rows={2} value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} placeholder="কী সংগ্রহ করতে হবে — তদন্ত সম্পাদক তাঁর কাজের তালিকায় এটি দেখবেন।" className={`${inputClass} h-auto resize-y py-2 font-bn`} />
              </label>
              {formError && <p className="text-[12px] text-danger sm:col-span-2">{formError}</p>}
              {open >= limit && <p className="text-[12px] text-warning sm:col-span-2">এতে {staff.nameBn || staff.name}-এর চলমান কাজ হবে {bn(open + 1)}টি — কাজের চাপের সীমা {bn(limit)} ছাড়িয়ে যাবে।</p>}
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className="h-9 cursor-pointer rounded-button bg-primary px-4 text-[13px] font-semibold text-white hover:bg-primary-hover">
                  কাজ দিন
                </button>
                <button type="button" onClick={() => setAssigning(false)} className="h-9 cursor-pointer rounded-button border border-line px-3 text-[13px] font-semibold text-muted">
                  বাতিল
                </button>
              </div>
            </form>
          )}
          {assignments.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-muted">{s.status === "On leave" ? "ছুটিতে থাকায় কোনো মাঠের কাজ নেই।" : "কোনো মাঠের কাজ নেই।"}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-line bg-surface/60 text-[11px] font-semibold text-muted">
                    <th scope="col" className="px-5 py-3 font-semibold">অডিট আইডি</th>
                    <th scope="col" className="px-3 py-3 font-semibold">রাজনৈতিক কর্মী</th>
                    <th scope="col" className="px-3 py-3 font-semibold">ধাপ</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">শেষ তারিখ</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="relative cursor-pointer border-b border-line last:border-b-0 hover:bg-surface/40">
                      <td className="px-5 py-3.5 align-middle font-mono text-[12.5px] font-semibold text-primary">{a.audit}</td>
                      <td className="px-3 py-3.5 align-middle">
                        <Link href={`/admin/politicians/${a.profileId}`} className="font-bn text-[14px] font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary">
                          {a.name}
                        </Link>
                        <div className="font-bn text-[12px] text-muted">{a.wards}</div>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium ${STAGE_STYLE[a.stage]}`}>
                          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                          {STAGE_LABEL[a.stage]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right align-middle text-[13px] text-muted">{bnDayMonth(`${a.due}T12:00:00+06:00`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,536px)]">
          <section className={`${card} overflow-hidden`}>
            <div className="px-5 pt-4">
              <h2 className="text-[15px] font-semibold text-ink">সাম্প্রতিক জমা</h2>
            </div>
            {reports.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-muted">এখনও কোনো জমা নেই।</p>
            ) : (
              <ul className="px-5 pt-2">
                {reports.slice(0, 5).map((r) => (
                  <li key={r.code} className="relative flex cursor-pointer gap-3 border-b border-line py-3 last:border-b-0 hover:bg-surface/60">
                    <span className={`mt-[7px] size-2 flex-none rounded-full ${STATE_DOT[r.state]}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/submissions/${r.code}`} className="font-bn text-[13.5px] text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary">
                        {r.title}
                      </Link>
                      <div className="mt-0.5 font-bn text-[11.5px] text-muted">
                        {r.code} · {auditOf(r.profileId)} · {bn(r.evidence.length)}টি প্রমাণ · {bnDate(r.submittedAt)}
                      </div>
                    </div>
                    <span className={`h-fit whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${STATE_CHIP[r.state].cls}`}>{STATE_CHIP[r.state].label}</span>
                  </li>
                ))}
              </ul>
            )}
            {reports.length > 0 && (
              <div className="border-t border-line px-5 py-3.5">
                <Link href={`/admin/submissions/${reports[0].code}`} className="text-[13px] font-semibold text-primary hover:text-primary-hover">
                  সর্বশেষ জমা খুলুন →
                </Link>
              </div>
            )}
          </section>

          <div className="flex flex-col gap-5">
            <section className={`${card} px-5 py-4`}>
              <h2 className="text-[15px] font-semibold text-ink">ডিভাইস ও সিঙ্ক</h2>
              <dl className="mt-3">
                {[
                  { k: "অ্যাপ ভার্সন", v: p.app, ok: p.app === "v1.8" },
                  { k: "সর্বশেষ সিঙ্ক", v: p.lastSync, ok: !p.lastSync.includes("day") },
                  { k: "বাকি আপলোড", v: bn(p.pending), ok: p.pending === 0 },
                ].map((d) => (
                  <div key={d.k} className="flex items-center justify-between border-b border-line py-2.5 last:border-b-0">
                    <dt className="flex items-center gap-2.5 text-[13px] text-ink">
                      <span className={`size-2 rounded-full ${d.ok ? "bg-success" : "bg-warning"}`} aria-hidden="true" />
                      {d.k}
                    </dt>
                    <dd className={`text-[13px] font-semibold ${d.ok ? "text-ink" : "text-warning"}`}>{d.v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <AccountActions
              name={s.nameBn || s.name}
              status={s.status as AccountStatus}
              maskedPhone={phoneMasked(s.phone)}
              open={s.open}
              activeLabel="On duty"
              onStatus={(st) => setStaffStatus(s.id, adminId, st as StaffStatus)}
              onReset={() => resetPassword(s.id, adminId)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
