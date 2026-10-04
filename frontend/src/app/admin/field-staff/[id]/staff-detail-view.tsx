"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { AccountActions, StaffStatusBadge, type AccountStatus } from "@/components/account-actions";
import { inputClass, selectClass } from "@/components/form";
import { RecordMissing } from "@/components/record-missing";
import { assign, resetPassword, setStaffStatus } from "@/lib/db/actions";
import { bn, enDate, enDayMonth, phoneMasked } from "@/lib/db/format";
import { coverageKey, profileOf, staffAssignments, staffOf, staffSubmissions, STATE_EN } from "@/lib/db/selectors";
import type { StaffStatus, SubmissionState } from "@/lib/db/types";
import { useAdmin } from "../../use-admin";

type AssignmentStage = "Collecting" | "Submitted" | "Re-visit" | "Closed";
const STAGE_STYLE: Record<AssignmentStage, string> = {
  Collecting: "bg-warning/10 text-warning",
  Submitted: "bg-role-reviewer/10 text-role-reviewer",
  "Re-visit": "bg-danger/10 text-danger",
  Closed: "bg-surface text-muted",
};
const STATE_DOT: Record<SubmissionState, string> = { Accepted: "bg-success", Pending: "bg-warning", Held: "bg-danger", Rejected: "bg-danger", Withdrawn: "bg-muted" };

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
      : mine.some((r) => r.state === "Pending" && r.events.at(-1)?.type === "revisit")
        ? "Re-visit"
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
  const held = reports.filter((r) => r.state === "Held" || r.state === "Rejected").length;
  const items = reports.reduce((n, r) => n + r.evidence.length, 0);
  const auditOf = (profileId: string) => profileOf(db, profileId)?.audit.code ?? profileId;
  // Profiles in this staff member's area they aren't already assigned to.
  const assignable = db.profiles.filter((x) => coverageKey(x) === `${staff.district} · ${staff.thana}` || x.district === staff.district).filter((x) => !all.some((a) => a.open && a.profileId === x.id));

  const stats = [
    { label: "TOTAL ASSIGNED", value: s.open + p.completed, color: "#0D1F17", note: "মোট নিয়োগ · since joining" },
    {
      label: "ONGOING",
      value: s.open,
      color: s.open > limit ? "#F42A41" : s.open >= limit - 1 ? "#D97706" : "#0D1F17",
      note: `চলমান · ${s.open > limit ? "over the caseload limit" : s.open >= limit - 1 ? "approaching the limit" : "within the normal range"}`,
    },
    { label: "COMPLETED", value: p.completed, color: "#1A7A4A", note: "সম্পন্ন · closed audits" },
    { label: "TOTAL SUBMISSIONS", value: reports.length, color: "#0D1F17", note: `মোট জমা · ${items} evidence items` },
    { label: "IN REVIEW", value: inReview, color: "#D97706", note: "পর্যালোচনাধীন · awaiting executive editor" },
    { label: "ACCEPTED", value: accepted, color: "#1A7A4A", note: `গৃহীত · ${held} held or rejected` },
  ];

  const facts = [
    { k: "ALARM ID", v: s.id },
    { k: "MOBILE", v: phoneMasked(s.phone) },
    { k: "NID", v: `${p.nid} · গোপনকৃত` },
    { k: "JOINED", v: enDate(s.joined) },
    { k: "ELECTION SEAT", v: p.seat },
    { k: "WARDS COVERED", v: p.wards },
  ];

  return (
    <>
      <PageHeader
        backHref="/admin/field-staff"
        crumb={
          <>
            <Link href="/admin/field-staff" className="text-primary hover:text-primary-hover">
              Field Staff
            </Link>{" "}
            / {s.id}
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {s.name}
            <StaffStatusBadge status={s.status} />
            <span className="rounded-md bg-warning/10 px-2 py-0.5 text-[12px] font-medium text-warning">Investigation Editor</span>
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
              Edit profile
            </Link>
            <button
              type="button"
              disabled={s.status === "Deactivated"}
              onClick={() => setAssigning(true)}
              className="inline-flex h-10 cursor-pointer items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Assign a profile
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
            ID photo
            <br />
            not uploaded
          </div>
          <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
            {facts.map((f) => (
              <div key={f.k} className={f.k === "WARDS COVERED" ? "sm:col-span-2" : ""}>
                <dt className="text-[10.5px] font-semibold tracking-[0.06em] text-muted">{f.k}</dt>
                <dd className="mt-1 font-bn text-[13.5px] font-semibold text-ink">{f.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
          {stats.map((st) => (
            <div key={st.label} className={`${card} p-3 md:p-[18px]`}>
              <div className="text-[11px] font-semibold tracking-[0.04em] text-muted">{st.label}</div>
              <div className="mt-1.5 text-[22px] font-bold leading-none md:text-[26px]" style={{ color: st.color }}>
                {st.value}
              </div>
              <div className="mt-1.5 font-bn text-[11.5px] leading-snug text-muted max-md:hidden">{st.note}</div>
            </div>
          ))}
        </div>

        <section className={`${card} overflow-hidden`}>
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Current Assignments</h2>
              <p className="mt-0.5 font-bn text-[12px] text-muted">চলমান কাজ</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-muted">
                {open} open · limit {limit}
              </span>
              {!assigning && s.status !== "Deactivated" && (
                <button
                  type="button"
                  onClick={() => setAssigning(true)}
                  className="h-8 cursor-pointer rounded-button border border-line px-3 text-[12.5px] font-semibold text-primary hover:border-primary"
                >
                  + Assign profile
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
                  setFormError("Choose a profile, a due date and write what to collect (at least a sentence).");
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
                <span className="text-[12px] font-semibold">Profile</span>
                <select value={form.profileId} onChange={(e) => setForm({ ...form, profileId: e.target.value })} className={`${selectClass} h-10`}>
                  <option value="">Choose a profile in {staff.district}</option>
                  {assignable.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {x.seat}, {x.thana}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold">Due date</span>
                <input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} className={`${inputClass} h-10 px-[11px]`} />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-[12px] font-semibold">What to collect</span>
                <textarea rows={2} value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} placeholder="কী সংগ্রহ করতে হবে — স্টাফ তাঁর কাজের তালিকায় এটি দেখবেন।" className={`${inputClass} h-auto resize-y py-2 font-bn`} />
              </label>
              {formError && <p className="text-[12px] text-danger sm:col-span-2">{formError}</p>}
              {open >= limit && <p className="text-[12px] text-warning sm:col-span-2">This takes {staff.name} to {open + 1} open assignments — over the caseload limit of {limit}.</p>}
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className="h-9 cursor-pointer rounded-button bg-primary px-4 text-[13px] font-semibold text-white hover:bg-primary-hover">
                  Assign
                </button>
                <button type="button" onClick={() => setAssigning(false)} className="h-9 cursor-pointer rounded-button border border-line px-3 text-[13px] font-semibold text-muted">
                  Cancel
                </button>
              </div>
            </form>
          )}
          {assignments.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-muted">No assignments{s.status === "On leave" ? " while on leave" : ""}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-line bg-surface/60 text-[11px] font-semibold tracking-[0.06em] text-muted">
                    <th scope="col" className="px-5 py-3 font-semibold">REQUEST ID</th>
                    <th scope="col" className="px-3 py-3 font-semibold">SUBJECT</th>
                    <th scope="col" className="px-3 py-3 font-semibold">STAGE</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">DUE</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="relative border-b border-line last:border-b-0 hover:bg-surface/40">
                      <td className="px-5 py-3.5 align-middle font-mono text-[12.5px] font-semibold text-primary">{a.audit}</td>
                      <td className="px-3 py-3.5 align-middle">
                        <Link href={`/admin/politicians/${a.profileId}`} className="font-bn text-[14px] font-semibold text-ink after:absolute after:inset-0 hover:text-primary">
                          {a.name}
                        </Link>
                        <div className="font-bn text-[12px] text-muted">{a.wards}</div>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium ${STAGE_STYLE[a.stage]}`}>
                          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                          {a.stage}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right align-middle text-[13px] text-muted">{enDayMonth(`${a.due}T12:00:00+06:00`)}</td>
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
              <h2 className="text-[15px] font-semibold text-ink">Recent Submissions</h2>
              <p className="mt-0.5 font-bn text-[12px] text-muted">সাম্প্রতিক জমা</p>
            </div>
            {reports.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-muted">No submissions yet.</p>
            ) : (
              <ul className="px-5 pt-2">
                {reports.slice(0, 5).map((r) => (
                  <li key={r.code} className="relative flex gap-3 border-b border-line py-3 last:border-b-0">
                    <span className={`mt-[7px] size-2 flex-none rounded-full ${STATE_DOT[r.state]}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/field-reports/${r.code}`} className="font-bn text-[13.5px] text-ink after:absolute after:inset-0 hover:text-primary">
                        {r.title}
                      </Link>
                      <div className="mt-0.5 font-bn text-[11.5px] text-muted">
                        {r.code} · {auditOf(r.profileId)} · {bn(r.evidence.length)} items · {enDate(r.submittedAt)}
                      </div>
                    </div>
                    <span className={`h-fit whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${STATE_EN[r.state].cls}`}>{STATE_EN[r.state].label}</span>
                  </li>
                ))}
              </ul>
            )}
            {reports.length > 0 && (
              <div className="border-t border-line px-5 py-3.5">
                <Link href={`/admin/field-reports/${reports[0].code}`} className="text-[13px] font-semibold text-primary hover:text-primary-hover">
                  Open latest field report →
                </Link>
              </div>
            )}
          </section>

          <div className="flex flex-col gap-5">
            <section className={`${card} px-5 py-4`}>
              <h2 className="text-[15px] font-semibold text-ink">Device &amp; Sync</h2>
              <p className="mt-0.5 font-bn text-[12px] text-muted">ডিভাইস ও সিঙ্ক</p>
              <dl className="mt-3">
                {[
                  { k: "App version", v: p.app, ok: p.app === "v1.8" },
                  { k: "Last sync", v: p.lastSync, ok: !p.lastSync.includes("day") },
                  { k: "Pending uploads", v: String(p.pending), ok: p.pending === 0 },
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
              name={s.name}
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
