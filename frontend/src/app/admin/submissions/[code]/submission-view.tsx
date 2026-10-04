"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { EvidenceManager } from "@/components/evidence-manager";
import { inputClass } from "@/components/form";
import { SubmissionEditor } from "@/components/submission-editor";
import { RecordMissing } from "@/components/record-missing";
import { RichText } from "@/components/rich-text";
import { decide, editSubmission, undoDecision, type Decision } from "@/lib/db/actions";
import { bn, bnDateTime, bnRelative } from "@/lib/db/format";
import { disputeForSubmission, nameOf, profileOf, roleOfId, STATE_CHIP, submissionOf, submissionsFor, tierOf } from "@/lib/db/selectors";
import type { Database, Submission, SubmissionEvent } from "@/lib/db/types";
import { useAdmin } from "../../use-admin";

const CHECK_STYLE = {
  ok: { cls: "bg-success/10 text-success", mark: "✓", label: "ঠিক আছে" },
  warn: { cls: "bg-warning/10 text-warning", mark: "!", label: "সতর্কতা" },
  bad: { cls: "bg-danger/10 text-danger", mark: "✕", label: "সমস্যা" },
} as const;

const card = "overflow-hidden rounded-card border border-line bg-white shadow-card";

function CardHead({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="border-b border-line px-5 py-4">
      <h2 className="text-[14.5px] font-semibold text-ink">{title}</h2>
      {sub && <p className="mt-0.5 text-[12px] text-muted">{sub}</p>}
    </div>
  );
}

const ROLE_BN = { reviewer: "নির্বাহী সম্পাদক", admin: "প্রধান নির্বাহী সম্পাদক", staff: "তদন্ত সম্পাদক", politician: "রাজনৈতিক কর্মী", system: "" } as const;

/** One line of the submission's history. The প্রধান নির্বাহী সম্পাদক sees every name. */
function eventText(db: Database, s: Submission, e: SubmissionEvent) {
  const role = ROLE_BN[roleOfId(db, e.by)];
  const who = `${nameOf(db, e.by)}${role ? ` (${role})` : ""}`;
  switch (e.type) {
    case "submitted":
      return { dot: "#006A4E", text: `${who} ${bn(s.evidence.length)}টি প্রমাণসহ জমা দিয়েছেন।` };
    case "edited":
      return { dot: "#1D6FC0", text: `${who} জমাটি এডিট করেছেন।` };
    case "accepted":
      return { dot: "#1A7A4A", text: `${who} গ্রহণ করেছেন।` };
    case "rejected":
      return { dot: "#F42A41", text: `${who} বাতিল করেছেন।` };
  }
}

const ACTIONS: { key: Decision; label: string; cls: string }[] = [
  { key: "Accepted", label: "গ্রহণ করুন", cls: "border-primary bg-primary text-white hover:bg-primary-hover" },
  { key: "Rejected", label: "বাতিল করুন", cls: "border-danger bg-white text-danger hover:bg-danger/5" },
];


/** One submission in full: content (editable by the প্রধান নির্বাহী সম্পাদক), evidence, checks, decision and history. */
export function SubmissionView({ code, startEditing = false }: { code: string; startEditing?: boolean }) {
  const { db, adminId } = useAdmin();
  const [pick, setPick] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [decidedHere, setDecidedHere] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  const s = submissionOf(db, code);
  const profile = s ? profileOf(db, s.profileId) : undefined;
  // `?edit=1` (from the submissions list) opens the editor straight away, once the record is loaded.
  if (startEditing && !autoOpened && s) {
    setAutoOpened(true);
    setEditing(true);
  }
  if (!s || !profile) return <RecordMissing title="জমাটি পাওয়া যায়নি" backHref="/admin/submissions" backLabel="সব জমার তালিকায় ফিরুন" />;

  const siblings = [...submissionsFor(db, s.profileId)].reverse(); // oldest first
  const position = siblings.findIndex((x) => x.code === s.code) + 1;
  const by = s.origin === "self" ? `${profile.name} (নিজে)` : `${nameOf(db, s.staffId ?? "")} (${s.staffId})`;
  const byRole = s.origin === "self" ? "রাজনৈতিক কর্মী" : "তদন্ত সম্পাদক";
  const profileHref = `/admin/politicians/${s.profileId}`;
  const dispute = disputeForSubmission(db, s.code);
  const tier = tierOf(s.state);
  const current: Decision | null = s.state === "Pending" ? null : s.state;

  const checks = s.field?.checks ?? [
    s.evidence.length
      ? { status: "ok" as const, label: "প্রমাণ দেওয়া আছে", detail: `${bn(s.evidence.length)}টি প্রমাণ রেকর্ডে আছে।` }
      : { status: "bad" as const, label: "কোনো প্রমাণ দেওয়া নেই", detail: "এই জমার সাথে কিছু আপলোড করা হয়নি।" },
    { status: "ok" as const, label: "অনুমোদিত অ্যাকাউন্ট থেকে জমা", detail: s.origin === "self" ? "রাজনৈতিক কর্মী নিজের পোর্টাল থেকে যোগ করেছেন।" : `${s.staffId} এই এলাকার দায়িত্বে আছেন।` },
    { status: "ok" as const, label: "কোনো ফাইল দ্বিতীয়বার জমা হয়নি", detail: "এই অডিটে প্রতিটি ফাইল আলাদা, কোনোটি দুবার নেই।" },
  ];
  const meta = [
    { label: "অডিট", value: `প্রোফাইল অডিট · ${profile.audit.code}` },
    ...(s.field ? [{ label: "মাঠের কাজ", value: s.field.task }] : []),
    ...(s.field?.visitTime ? [{ label: "সরেজমিনে দেখার সময়", value: s.field.visitTime }] : []),
    { label: "উৎস", value: s.source },
  ];
  const trail = [...s.events].reverse().map((e) => ({ ...eventText(db, s, e), time: bnRelative(e.at), note: e.note }));
  const note =
    s.state === "Pending"
      ? "যাচাই চলছে — নির্বাহী সম্পাদক সিদ্ধান্ত না দেওয়া পর্যন্ত প্রমাণ “জমা পড়েছে” ধাপে থাকবে।"
      : `${STATE_CHIP[s.state].label} — ${s.reason ?? ""}`;
  const noteTone = s.state === "Accepted" ? "border-l-success" : s.state === "Pending" ? "border-l-warning" : "border-l-danger";

  const openEditor = () => {
    setEditing(true);
    setSaved(false);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.code}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        backHref="/admin/submissions"
        crumb={
          <>
            <Link href="/admin/submissions" className="text-primary hover:text-primary-hover">
              সব জমা
            </Link>{" "}
            / {s.code}
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {s.code}
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium ${STATE_CHIP[s.state].cls}`}>
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {STATE_CHIP[s.state].label}
            </span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2.5">
            {!editing && (
              <button type="button" onClick={openEditor} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M10.8 2.6 13.4 5.2 6 12.6H3.4V10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                জমা এডিট করুন
              </button>
            )}
            <button
              type="button"
              onClick={download}
              className="inline-flex h-10 cursor-pointer items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary hover:bg-surface max-md:hidden"
            >
              ডাউনলোড
            </button>
          </div>
        }
      />

      <div className="grid flex-1 grid-cols-1 items-start gap-5 px-4 pt-[22px] pb-9 sm:px-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {saved && (
            <p role="status" className="rounded-card border border-l-[3px] border-line border-l-success bg-white px-5 py-3.5 text-[13px] text-ink shadow-card">
              পরিবর্তন সেভ হয়েছে। জমার ইতিহাস ও অডিট লগে আপনার নামসহ লেখা থাকল।
            </p>
          )}

          {editing ? (
            <section className={`${card} ring-2 ring-primary/20`}>
              <CardHead title="জমা এডিট" sub="লেখা, ধরন ও প্রমাণের ফাইল ঠিক করুন — ফাইল যোগ, সরানো বা খুলে দেখা যায়। সিদ্ধান্ত বদলাবে না।" />
              <div className="px-5 py-5">
                <SubmissionEditor
                  submission={s}
                  onCancel={() => setEditing(false)}
                  onSave={(edits, note) => {
                    editSubmission(s.code, adminId, edits, note);
                    setEditing(false);
                    setSaved(true);
                  }}
                />
              </div>
            </section>
          ) : (
            <section className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <div className="text-[12px] text-muted">
                    {byRole} ·{" "}
                    {s.staffId && roleOfId(db, s.staffId) === "staff" ? (
                      <Link href={`/admin/field-staff/${s.staffId}`} className="font-semibold text-ink hover:text-primary">
                        {by}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink">{by}</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {profile.seat} · {profile.thana} · {profile.wards}
                  </div>
                </div>
                <div className="text-[12px] leading-relaxed text-muted sm:text-right">
                  <div>জমা: {bnDateTime(s.submittedAt)}</div>
                  <div>{s.field?.device ?? (s.origin === "self" ? "রাজনৈতিক কর্মী পোর্টাল · ওয়েব" : "ALARM মাঠ অ্যাপ")}</div>
                </div>
              </div>

              <div className="px-5 py-4">
                <span className={`inline-flex rounded-md px-2 py-0.5 text-[12px] font-semibold ${s.category === "ইতিবাচক" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{s.category}</span>
                <h2 className="mt-2 text-[17px] font-semibold leading-[1.6] text-ink">{s.title}</h2>
                <RichText value={s.body} className="mt-2 text-[14px] leading-[1.8] text-ink" />
                {s.facts.length > 0 && (
                  <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {s.facts.map(([k, v]) => (
                      <div key={k} className="rounded-button bg-surface px-3 py-2.5">
                        <dt className="text-[11px] text-muted">{k}</dt>
                        <dd className="mt-0.5 text-[13px] font-semibold text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p role="status" className={`mt-4 rounded-button border border-l-[3px] border-line bg-surface/60 px-4 py-3 text-[12.5px] leading-relaxed text-ink ${noteTone}`}>
                  {note}
                </p>
                {dispute && (
                  <p className="mt-3 text-[12.5px] text-muted">
                    রাজনৈতিক কর্মী এই তথ্যে অভিযোগ করেছেন —{" "}
                    <Link href="/admin/disputes?tab=all" className="font-semibold text-primary hover:text-primary-hover">
                      {dispute.code} · {dispute.state === "Open" ? "খোলা" : "সমাধান হয়েছে"}
                    </Link>
                  </p>
                )}
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-line px-5 py-4 sm:grid-cols-2">
                {meta.map((m) => (
                  <div key={m.label}>
                    <dt className="text-[11.5px] font-semibold text-muted">{m.label}</dt>
                    <dd className="mt-1 text-[13.5px] font-semibold text-ink">{m.value}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-[11.5px] font-semibold text-muted">রাজনৈতিক কর্মী</dt>
                  <dd className="mt-1 text-[13.5px] font-semibold">
                    <Link href={profileHref} className="text-primary hover:text-primary-hover">
                      {profile.name}
                    </Link>
                  </dd>
                </div>
              </dl>
            </section>
          )}

          <section className={card}>
            <CardHead title="দেওয়া প্রমাণ" sub={`${bn(s.evidence.length)}টি প্রমাণ · ${tier} · চাপ দিলে খুলে দেখা যাবে`} />
            <div className="px-5 py-4">
              <EvidenceManager items={s.evidence} />
            </div>
          </section>

          <section className={card}>
            <CardHead title="এই রাজনৈতিক কর্মীর সব জমা" sub={`এটি ${bn(position)} নম্বর জমা · মোট ${bn(siblings.length)}টি`} />
            <ul>
              {[...siblings].reverse().map((x) => {
                const on = x.code === s.code;
                return (
                  <li key={x.code} className="border-b border-line last:border-b-0">
                    <Link
                      href={`/admin/submissions/${x.code}`}
                      aria-current={on ? "page" : undefined}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-l-[3px] px-4 py-3 ${on ? "border-primary bg-surface" : "border-transparent hover:bg-surface/60"}`}
                    >
                      <span className={`text-[12.5px] font-semibold ${on ? "text-primary" : "text-muted"}`}>{x.code}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{x.title}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${STATE_CHIP[x.state].cls}`}>{STATE_CHIP[x.state].label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Decision, checks, history */}
        <div className="flex min-w-0 flex-col gap-5">
          <section className={card}>
            <CardHead title="সিদ্ধান্ত" sub="নির্বাহী সম্পাদকের সিদ্ধান্ত — দরকার হলে আপনি বদলাতে পারেন" />
            <div className="flex flex-col gap-2.5 px-5 py-4">
              {pick ? (
                <form
                  className="flex flex-col gap-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (reason.trim().length < 9) return;
                    decide(s.code, adminId, pick, reason.trim());
                    setDecidedHere(true);
                    setPick(null);
                    setReason("");
                  }}
                >
                  <label htmlFor="fr-reason" className="text-[12.5px] font-semibold">
                    “{ACTIONS.find((a) => a.key === pick)?.label}” — কারণ লিখুন
                  </label>
                  <textarea
                    id="fr-reason"
                    autoFocus
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="প্রমাণ কী দেখায় — অডিট লগে লেখা থাকবে এবং তদন্ত সম্পাদক দেখতে পাবেন।"
                    className={`${inputClass} h-auto resize-y py-2.5 text-[13px]`}
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={reason.trim().length < 9} className="h-10 flex-1 cursor-pointer rounded-button bg-primary text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
                      নিশ্চিত করুন
                    </button>
                    <button type="button" onClick={() => setPick(null)} className="h-10 cursor-pointer rounded-button border border-line px-4 text-[13.5px] font-semibold text-muted">
                      বাতিল
                    </button>
                  </div>
                </form>
              ) : (
                ACTIONS.map((a) => {
                  const isCurrent = current === a.key;
                  return (
                    <button
                      key={a.key}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => setPick(a.key)}
                      className={`h-11 cursor-pointer rounded-button border text-[14px] font-semibold transition-colors disabled:cursor-default disabled:border-line disabled:bg-surface disabled:text-muted ${a.cls}`}
                    >
                      {a.label}
                      {isCurrent && " · এখনকার"}
                    </button>
                  );
                })
              )}
              <p className="mt-1 text-[12px] leading-normal text-muted text-pretty">
                {s.state === "Pending"
                  ? "এখনও সিদ্ধান্ত হয়নি। গ্রহণ করলে প্রমাণগুলো “যাচাই করা” হিসেবে প্রোফাইলে যোগ হবে।"
                  : s.decidedBy
                    ? `${nameOf(db, s.decidedBy)} সিদ্ধান্ত দিয়েছেন · ${bnRelative(s.decidedAt!)}।`
                    : ""}
              </p>
              {decidedHere && (
                <button
                  type="button"
                  onClick={() => {
                    undoDecision(s.code, adminId);
                    setDecidedHere(false);
                  }}
                  className="cursor-pointer self-start text-[12.5px] font-semibold text-primary hover:text-primary-hover"
                >
                  আগের মতো করুন
                </button>
              )}
            </div>
          </section>

          <section className={card}>
            <CardHead title="সত্যতা যাচাই" />
            <ul className="px-5">
              {checks.map((c) => {
                const st = CHECK_STYLE[c.status];
                return (
                  <li key={c.label} className="flex gap-3 border-b border-line py-3.5 last:border-b-0">
                    <span role="img" aria-label={st.label} className={`mt-0.5 flex size-[18px] flex-none items-center justify-center rounded-full text-[10px] font-bold ${st.cls}`}>
                      {st.mark}
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold text-ink">{c.label}</div>
                      <p className="mt-0.5 text-[12px] leading-normal text-muted text-pretty">{c.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={card}>
            <CardHead title="জমার ইতিহাস" />
            <ol className="px-5">
              {trail.map((t, i) => (
                <li key={`${t.time}-${i}`} className="flex gap-3 border-b border-line py-3 last:border-b-0">
                  <span className="mt-[7px] size-2 flex-none rounded-full" style={{ background: t.dot }} aria-hidden="true" />
                  <div>
                    <div className="text-[13px] text-ink">{t.text}</div>
                    {t.note && <div className="mt-0.5 text-[12px] leading-snug text-muted">“{t.note}”</div>}
                    <div className="mt-0.5 text-[11.5px] text-muted">{t.time}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
