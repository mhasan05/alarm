"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { EvidenceManager } from "@/components/evidence-manager";
import { inputClass } from "@/components/form";
import { RecordMissing } from "@/components/record-missing";
import { RichText } from "@/components/rich-text";
import { SubmissionEditor } from "@/components/submission-editor";
import { decideDispute, editSubmission, undoDisputeDecision, type DisputeOutcome } from "@/lib/db/actions";
import { bn, bnAge, bnDate, bnDateTime } from "@/lib/db/format";
import { canResolveDispute, CATEGORY_STYLE, editedSinceDispute, disputeOf, nameOf, profileOf, roleOfId, STATE_CHIP, submissionOf } from "@/lib/db/selectors";
import { useDb } from "@/lib/db/store";
import type { Database, Dispute, Evidence } from "@/lib/db/types";

/** The three ways a dispute can end — the same words everywhere. */
export const OUTCOMES: Record<DisputeOutcome, { label: string; done: string; help: string; tone: string }> = {
  Kept: { label: "অভিযোগ বাতিল", done: "অভিযোগ বাতিল — তথ্য ঠিক আছে", help: "অভিযোগের পক্ষে প্রমাণ নেই। জমাটি যেমন আছে তেমনই থাকবে।", tone: "#4A7060" },
  Removed: { label: "অভিযোগ গ্রহণ", done: "অভিযোগ গ্রহণ — জমা বাতিল", help: "অভিযোগ পুরোপুরি ঠিক। জমাটি বাতিল হবে এবং প্রোফাইল ও স্কোর থেকে সরে যাবে।", tone: "#F42A41" },
  Partial: { label: "অভিযোগ আংশিক গ্রহণ", done: "অভিযোগ আংশিক গ্রহণ — জমা সংশোধন", help: "অভিযোগের কিছু অংশ ঠিক। ধাপ ২-এ জমার ভুল অংশ এডিট করে ঠিক করুন — সংশোধিত জমাটি প্রোফাইলে থাকবে।", tone: "#1D6FC0" },
};

export const disputeStatus = (d: Dispute) => (d.state === "Open" ? { label: "সিদ্ধান্তের অপেক্ষায়", tone: "#D97706" } : { label: OUTCOMES[d.state].done, tone: OUTCOMES[d.state].tone });

/** The রাজনৈতিক কর্মী's attachments: real files when available, otherwise the file names they gave. */
export function disputeFiles(d: Dispute): Evidence[] {
  if (d.files?.length) return d.files;
  return d.attachments.map((name, i) => ({ id: `${d.code}-A${i}`, kind: "কাগজ", title: name, meta: "রাজনৈতিক কর্মীর দেওয়া" }));
}

function Card({ step, title, sub, action, children }: { step?: string; title: string; sub?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-start gap-3 border-b border-line px-5 py-4">
        {step && <span className="flex size-7 flex-none items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-white">{step}</span>}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-[12px] leading-[1.6] text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

const ROLE_BN = { admin: "প্রধান নির্বাহী সম্পাদক", reviewer: "নির্বাহী সম্পাদক", staff: "তদন্ত সম্পাদক", politician: "রাজনৈতিক কর্মী", system: "" } as const;

/**
 * Resolving one dispute, for the প্রধান নির্বাহী সম্পাদক and the area's নির্বাহী সম্পাদক alike:
 * ① read the dispute and its files, ② check (and if needed edit) the disputed submission, ③ decide.
 * `showStaffNames` is false for the নির্বাহী সম্পাদক, who sees a source label instead of staff names.
 */
export function DisputeResolver({ code, actorId, portal, listHref, showStaffNames, submissionHref }: { code: string; actorId: string; portal: string; listHref: string; showStaffNames: boolean; submissionHref?: (code: string) => string }) {
  const db = useDb();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pick, setPick] = useState<DisputeOutcome | null>(null);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [decidedHere, setDecidedHere] = useState(false);

  const d = disputeOf(db, code);
  const s = d ? submissionOf(db, d.submissionCode) : undefined;
  const p = d ? profileOf(db, d.profileId) : undefined;
  if (!d || !s || !p) return <RecordMissing title="অভিযোগটি পাওয়া যায়নি" backHref={listHref} backLabel="অভিযোগের তালিকায় ফিরুন" />;
  if (!canResolveDispute(db, actorId, d)) return <RecordMissing title="এই অভিযোগ আপনার এলাকার নয়" backHref={listHref} backLabel="অভিযোগের তালিকায় ফিরুন" />;

  const open = d.state === "Open";
  const status = disputeStatus(d);
  const cat = CATEGORY_STYLE[s.category];
  const source = s.origin === "self" ? "রাজনৈতিক কর্মীর নিজের দেওয়া তথ্য" : showStaffNames ? `${nameOf(db, s.staffId ?? "")} (${s.staffId}) · তদন্ত সম্পাদক` : "তদন্ত সম্পাদকের তথ্য";
  const trail = historyOf(db, d, showStaffNames);

  const needsEdit = pick === "Partial" && !editedSinceDispute(db, d);
  const decide = () => {
    setTried(true);
    if (!pick || needsEdit || reason.trim().length < 9) return;
    decideDispute(d.code, actorId, pick, reason.trim());
    setDecidedHere(true);
    setPick(null);
    setReason("");
    setTried(false);
  };

  return (
    <>
      <PageHeader
        backHref={listHref}
        crumb={
          <>
            {portal} /{" "}
            <Link href={listHref} className="text-primary hover:text-primary-hover">
              অভিযোগ
            </Link>{" "}
            / {d.code}
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {d.code}
            <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium" style={{ color: status.tone, background: `${status.tone}1A` }}>
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {status.label}
            </span>
          </span>
        }
      />

      <div className="grid flex-1 grid-cols-1 items-start gap-5 px-4 pt-[22px] pb-9 sm:px-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ① The dispute */}
          <Card step="১" title="অভিযোগ" sub={`${p.name} · ${p.post} · ${p.seat} · জমা ${bnDate(d.filedAt)}${open ? ` · ${bnAge(d.filedAt)}` : ""}`}>
            <span className="inline-flex rounded-md bg-surface px-2 py-0.5 text-[12px] font-semibold text-ink">{d.reason}</span>
            <RichText value={d.claim} className="mt-3 text-[14.5px] leading-[1.8] text-ink" />
            <h3 className="mt-4 mb-2 text-[12.5px] font-semibold text-muted">রাজনৈতিক কর্মীর দেওয়া কাগজপত্র</h3>
            <EvidenceManager items={disputeFiles(d)} emptyText="কোনো কাগজ দেওয়া হয়নি।" />
          </Card>

          {/* ② The disputed submission */}
          <Card
            step="২"
            title="যে জমার বিরুদ্ধে অভিযোগ"
            sub={open ? "জমাটি দেখুন। অভিযোগের কাগজ দেখে কিছু ঠিক করতে হলে এডিট করুন — ফাইল যোগ, সরানো বা খুলে দেখা যায়।" : "অভিযোগের সমাধান হয়ে গেছে।"}
            action={
              open && !editing ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setSaved(false);
                  }}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-button border border-primary px-3.5 text-[13px] font-semibold text-primary hover:bg-surface"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M10.8 2.6 13.4 5.2 6 12.6H3.4V10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                  জমা এডিট করুন
                </button>
              ) : undefined
            }
          >
            {saved && !editing && (
              <p role="status" className="mb-3 rounded-button border border-l-[3px] border-line border-l-success bg-success/5 px-3.5 py-2.5 text-[12.5px] text-ink">
                পরিবর্তন সেভ হয়েছে — জমার ইতিহাসে আপনার নাম ও কারণসহ লেখা থাকল।
              </p>
            )}
            {editing ? (
              <SubmissionEditor
                submission={s}
                idPrefix="dr"
                onCancel={() => setEditing(false)}
                onSave={(edits, note) => {
                  editSubmission(s.code, actorId, edits, `${d.code} অভিযোগ যাচাই: ${note.trim()}`);
                  setEditing(false);
                  setSaved(true);
                }}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-semibold" style={{ color: cat.fg, background: cat.bg }}>
                    {s.category}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${STATE_CHIP[s.state].cls}`}>{STATE_CHIP[s.state].label}</span>
                  {submissionHref ? (
                    <Link href={submissionHref(s.code)} className="text-[12px] font-semibold text-primary hover:text-primary-hover">
                      {s.code} — পুরো জমা দেখুন →
                    </Link>
                  ) : (
                    <span className="text-[12px] font-semibold text-muted">{s.code}</span>
                  )}
                </div>
                <h3 className="mt-2.5 text-[16px] font-semibold leading-[1.6] text-ink">{s.title}</h3>
                <RichText value={s.body} className="mt-1.5 text-[14px] leading-[1.8] text-ink" />
                <p className="mt-2 text-[12.5px] text-muted">
                  উৎস: {s.source} · {source}
                </p>
                <h4 className="mt-4 mb-2 text-[12.5px] font-semibold text-muted">জমার প্রমাণ ({bn(s.evidence.length)}টি)</h4>
                <EvidenceManager items={s.evidence} />
              </>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-[92px]">
          {/* ③ The decision */}
          <Card step="৩" title="সিদ্ধান্ত" sub={open ? "একটি বেছে নিন ও কারণ লিখুন। রাজনৈতিক কর্মী কারণটি দেখতে পাবেন।" : undefined}>
            {open ? (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  decide();
                }}
                className="flex flex-col gap-2.5"
              >
                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">সিদ্ধান্ত বেছে নিন</legend>
                  {(Object.keys(OUTCOMES) as DisputeOutcome[]).map((o) => {
                    const on = pick === o;
                    return (
                      <label key={o} className={`flex cursor-pointer gap-3 rounded-button border p-3 ${on ? "border-primary bg-primary/[0.05]" : "border-line hover:border-primary/50"}`}>
                        <input type="radio" name="dr-outcome" checked={on} onChange={() => setPick(o)} className="mt-1 accent-[#006A4E]" />
                        <span>
                          <span className="block text-[13.5px] font-semibold" style={{ color: OUTCOMES[o].tone }}>
                            {OUTCOMES[o].label}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-[1.55] text-muted">{OUTCOMES[o].help}</span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                {tried && !pick && <p className="text-[12px] text-danger">একটি সিদ্ধান্ত বেছে নিন।</p>}
                {needsEdit && (
                  <p role={tried ? "alert" : undefined} className={`rounded-button border border-l-[3px] border-line px-3 py-2 text-[12px] leading-[1.6] ${tried ? "border-l-danger bg-danger/5 text-danger" : "border-l-[#1D6FC0] bg-[#1D6FC0]/5 text-ink"}`}>
                    আংশিক গ্রহণের আগে ধাপ ২-এ “জমা এডিট করুন” চেপে ভুল অংশটি ঠিক করুন।
                    {!editing && (
                      <button type="button" onClick={() => { setEditing(true); setSaved(false); }} className="ml-1 cursor-pointer font-semibold text-primary hover:text-primary-hover">
                        এখন এডিট করুন
                      </button>
                    )}
                  </p>
                )}
                <label htmlFor="dr-reason" className="mt-1 text-[12.5px] font-semibold text-ink">
                  সিদ্ধান্তের কারণ <span className="text-danger">*</span>
                </label>
                <textarea
                  id="dr-reason"
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="কোন প্রমাণ দেখে এই সিদ্ধান্ত — রাজনৈতিক কর্মী এটি দেখতে পাবেন।"
                  className={`${inputClass} h-auto resize-y py-2.5 text-[13px] ${tried && reason.trim().length < 9 ? "border-danger!" : ""}`}
                />
                {tried && reason.trim().length < 9 && <p className="text-[12px] text-danger">কারণ একটু বিস্তারিত লিখুন।</p>}
                <button type="submit" className="mt-1 h-11 cursor-pointer rounded-button bg-primary text-[14px] font-semibold text-white hover:bg-primary-hover">
                  সিদ্ধান্ত নিশ্চিত করুন
                </button>
              </form>
            ) : (
              <div role="status">
                <p className="text-[14px] font-semibold" style={{ color: status.tone }}>
                  {status.label}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-[1.7] text-ink">{d.decisionReason}</p>
                <p className="mt-2 text-[12px] text-muted">
                  {d.decidedBy ? `${nameOf(db, d.decidedBy)} (${ROLE_BN[roleOfId(db, d.decidedBy)]})` : ""}
                  {d.decidedAt ? ` · ${bnDateTime(d.decidedAt)}` : ""}
                </p>
                {decidedHere && (
                  <button
                    type="button"
                    onClick={() => {
                      undoDisputeDecision(d.code, actorId);
                      setDecidedHere(false);
                    }}
                    className="mt-3 cursor-pointer text-[12.5px] font-semibold text-primary hover:text-primary-hover"
                  >
                    আগের মতো করুন
                  </button>
                )}
                <Link href={listHref} className="mt-4 flex h-10 items-center justify-center rounded-button border border-line text-[13px] font-semibold text-primary hover:border-primary">
                  অভিযোগের তালিকায় ফিরুন
                </Link>
              </div>
            )}
          </Card>

          <Card title="যা যা হয়েছে">
            <ol>
              {trail.map((t, i) => (
                <li key={`${t.at}-${i}`} className="flex gap-3 border-b border-line py-2.5 last:border-b-0">
                  <span className="mt-[7px] size-2 flex-none rounded-full" style={{ background: t.dot }} aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-[13px] text-ink">{t.text}</div>
                    {t.note && <div className="mt-0.5 text-[12px] leading-snug text-muted">“{t.note}”</div>}
                    <div className="mt-0.5 text-[11.5px] text-muted">{bnDateTime(t.at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Dispute timeline: filed → edits to the submission while it was looked at → decision. */
function historyOf(db: Database, d: Dispute, showStaffNames: boolean) {
  const s = submissionOf(db, d.submissionCode);
  const who = (id: string) => {
    const r = roleOfId(db, id);
    if (r === "staff" && !showStaffNames) return "তদন্ত সম্পাদক";
    return `${nameOf(db, id)}${ROLE_BN[r] ? ` (${ROLE_BN[r]})` : ""}`;
  };
  const items: { at: string; dot: string; text: string; note?: string }[] = [{ at: d.filedAt, dot: "#D97706", text: `${who(d.profileId)} অভিযোগ জমা দিয়েছেন — ${d.reason}` }];
  for (const e of s?.events ?? []) {
    if (e.type === "edited" && e.at >= d.filedAt) items.push({ at: e.at, dot: "#1D6FC0", text: `${who(e.by)} জমাটি এডিট করেছেন`, note: e.note });
  }
  if (d.state !== "Open" && d.decidedAt) items.push({ at: d.decidedAt, dot: OUTCOMES[d.state].tone, text: `${who(d.decidedBy ?? "")} — ${OUTCOMES[d.state].done}`, note: d.decisionReason });
  return items.sort((a, b) => a.at.localeCompare(b.at));
}
