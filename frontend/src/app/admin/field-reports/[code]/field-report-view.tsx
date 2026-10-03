"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { inputClass } from "@/components/form";
import { RecordMissing } from "@/components/record-missing";
import { decide, undoDecision, type Decision } from "@/lib/db/actions";
import { enDateTime, enRelative } from "@/lib/db/format";
import { disputeForSubmission, nameOf, profileOf, STATE_EN, submissionOf, submissionsFor, tierOf } from "@/lib/db/selectors";
import type { Database, Submission, SubmissionEvent } from "@/lib/db/types";
import { useAdmin } from "../../use-admin";

const TIER_STYLE: Record<string, string> = {
  যাচাইকৃত: "bg-success/10 text-success",
  রিপোর্টেড: "bg-warning/10 text-warning",
  অযাচাইকৃত: "bg-danger/10 text-danger",
};

const CHECK_STYLE = {
  ok: { cls: "bg-success/10 text-success", mark: "✓", label: "Passed" },
  warn: { cls: "bg-warning/10 text-warning", mark: "!", label: "Warning" },
  bad: { cls: "bg-danger/10 text-danger", mark: "✕", label: "Failed" },
} as const;

const card = "overflow-hidden rounded-card border border-line bg-white shadow-card";

function CardHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="border-b border-line px-5 py-4">
      <h2 className="text-[14.5px] font-semibold text-ink">{title}</h2>
      <p className="mt-0.5 font-bn text-[12px] text-muted">{sub}</p>
    </div>
  );
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Admin-facing text for one history event. Admins see every name. */
function eventText(db: Database, s: Submission, e: SubmissionEvent) {
  const who = nameOf(db, e.by);
  const role = e.by.startsWith("REV") ? " (Reviewer)" : e.by.startsWith("ADM") ? " (Admin)" : "";
  switch (e.type) {
    case "submitted":
      return { dot: "#006A4E", text: `Submitted by ${who} with ${s.evidence.length} item${s.evidence.length === 1 ? "" : "s"}.` };
    case "edited":
      return { dot: "#1D6FC0", text: `Edited by ${who}${role} before the decision.` };
    case "accepted":
      return { dot: "#1A7A4A", text: `Accepted by ${who}${role}.` };
    case "rejected":
      return { dot: "#F42A41", text: `Rejected by ${who}${role}.` };
    case "held":
      return { dot: "#F42A41", text: `Held by ${who}${role} — source unclear.` };
    case "revisit":
      return { dot: "#D97706", text: `Re-visit requested by ${who}${role}.` };
    case "withdrawn":
      return { dot: "#4A7060", text: `Withdrawn from the profile by ${who}${role} after a dispute.` };
  }
}

const ACTIONS: { key: Decision; label: string; cls: string }[] = [
  { key: "Accepted", label: "Accept submission", cls: "border-primary bg-primary text-white hover:bg-primary-hover" },
  { key: "Revisit", label: "Request a re-visit", cls: "border-line bg-white text-primary hover:border-primary hover:bg-surface" },
  { key: "Held", label: "Hold — source unclear", cls: "border-danger bg-white text-danger hover:bg-danger/5" },
];

/** One submission in full: evidence, integrity checks, decision and history. Admins see all names. */
export function FieldReportView({ code }: { code: string }) {
  const { db, adminId } = useAdmin();
  const [pick, setPick] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [decidedHere, setDecidedHere] = useState(false);

  const s = submissionOf(db, code);
  const profile = s ? profileOf(db, s.profileId) : undefined;
  if (!s || !profile) return <RecordMissing title="রিপোর্টটি পাওয়া যায়নি" backHref="/admin/politicians" backLabel="রাজনৈতিক কর্মী তালিকায় ফিরুন" />;

  const siblings = [...submissionsFor(db, s.profileId)].reverse(); // oldest first
  const visit = siblings.findIndex((x) => x.code === s.code) + 1;
  const by = s.origin === "self" ? `${profile.name} (self)` : `${nameOf(db, s.staffId ?? "")} (${s.staffId})`;
  const byInitials = s.origin === "self" ? profile.initial : initialsOf(nameOf(db, s.staffId ?? ""));
  const profileHref = `/admin/politicians/${s.profileId}`;
  const dispute = disputeForSubmission(db, s.code);
  const tier = tierOf(s.state);
  const lastRevisit = s.state === "Pending" && s.events.at(-1)?.type === "revisit";
  const current: Decision | null = s.state === "Accepted" ? "Accepted" : s.state === "Held" ? "Held" : lastRevisit ? "Revisit" : null;

  const checks = s.field?.checks ?? [
    s.evidence.length ? { status: "ok" as const, label: "Evidence attached", detail: `${s.evidence.length} item${s.evidence.length === 1 ? "" : "s"} on record.` } : { status: "bad" as const, label: "No evidence attached", detail: "Nothing was uploaded with this submission." },
    { status: "ok" as const, label: "Submitted by an assigned account", detail: s.origin === "self" ? "The political activist added this from their own portal." : `${s.staffId} is assigned to this area.` },
    { status: "ok" as const, label: "No duplicate uploads", detail: "File hashes are unique across the audit." },
  ];
  const meta = [
    { label: "ENQUIRY", value: `প্রোফাইল নিরীক্ষা · ${profile.audit.code}` },
    ...(s.field ? [{ label: "TASK", value: s.field.task }] : []),
    ...(s.field?.visitTime ? [{ label: "VISIT TIME", value: s.field.visitTime }] : []),
    { label: "SOURCE", value: s.source },
  ];
  const trail = [...s.events].reverse().map((e) => ({ ...eventText(db, s, e), time: enRelative(e.at), note: e.note }));
  const note =
    s.state === "Pending"
      ? lastRevisit
        ? `Re-visit requested — ${s.reason}`
        : "In review — the items sit at রিপোর্টেড until a reviewer decides."
      : `${STATE_EN[s.state].label} — ${s.reason ?? ""}`;
  const noteTone = s.state === "Accepted" ? "border-l-success" : s.state === "Pending" ? "border-l-warning" : "border-l-danger";

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
        backHref={profileHref}
        crumb={
          <>
            <Link href="/admin/politicians" className="text-primary hover:text-primary-hover">
              রাজনৈতিক কর্মী
            </Link>{" "}
            /{" "}
            <Link href={profileHref} className="text-primary hover:text-primary-hover">
              {profile.audit.code}
            </Link>{" "}
            / Field Reports / {s.code}
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {s.code}
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium ${STATE_EN[s.state].cls}`}>
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {STATE_EN[s.state].label}
            </span>
            <span className="text-[12.5px] font-normal text-muted max-md:hidden">
              Visit {visit} · {by}
            </span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={download}
              className="inline-flex h-10 cursor-pointer items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary hover:bg-surface max-md:hidden"
            >
              Download submission
            </button>
            <Link href={profileHref} className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
              Back to audit
            </Link>
          </div>
        }
      />

      <div className="grid flex-1 grid-cols-1 items-start gap-5 px-4 pt-[22px] pb-9 sm:px-7 xl:grid-cols-[270px_minmax(0,1fr)_330px]">
        {/* Sibling submissions */}
        <aside className={`${card} max-xl:order-3`}>
          <CardHead title="Submitted reports" sub={`জমা দেওয়া প্রতিবেদন · ${visit} of ${siblings.length}`} />
          <ul>
            {siblings.map((x, i) => {
              const on = x.code === s.code;
              const who = x.origin === "self" ? `${profile.name} (self)` : `${nameOf(db, x.staffId ?? "")} (${x.staffId})`;
              return (
                <li key={x.code} className="border-b border-line">
                  <Link
                    href={`/admin/field-reports/${x.code}`}
                    aria-current={on ? "page" : undefined}
                    className={`flex gap-3 border-l-[3px] px-4 py-3.5 ${on ? "border-primary bg-surface" : "border-transparent hover:bg-surface/60"}`}
                  >
                    <span className="flex size-8 flex-none items-center justify-center rounded-full bg-warning/10 text-[11px] font-semibold text-warning">
                      {x.origin === "self" ? profile.initial : initialsOf(nameOf(db, x.staffId ?? ""))}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[13px] font-semibold ${on ? "text-primary" : "text-ink"}`}>
                        {x.code} · Visit {i + 1}
                      </span>
                      <span className="block truncate text-[12px] text-muted">{who}</span>
                      <span className={`mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${STATE_EN[x.state].cls}`}>{STATE_EN[x.state].label}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="px-4 py-3.5 text-[11.5px] leading-normal text-muted text-pretty">All submissions are locked. Field staff cannot edit a report after submitting.</p>
        </aside>

        {/* Submission */}
        <div className="flex min-w-0 flex-col gap-5">
          <section className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 flex-none items-center justify-center rounded-full bg-warning/10 text-[13px] font-semibold text-warning">{byInitials}</span>
                <div>
                  {s.staffId?.startsWith("FS") ? (
                    <Link href={`/admin/field-staff/${s.staffId}`} className="text-[14.5px] font-semibold text-ink hover:text-primary">
                      {by}
                    </Link>
                  ) : (
                    <div className="text-[14.5px] font-semibold text-ink">{by}</div>
                  )}
                  <div className="font-bn text-[12px] text-muted">
                    {profile.seat} · {profile.thana} · {profile.wards}
                  </div>
                </div>
              </div>
              <div className="text-[12px] leading-relaxed text-muted sm:text-right">
                <div>Submitted {enDateTime(s.submittedAt)}</div>
                <div>{s.field?.device ?? (s.origin === "self" ? "Political Activist portal · web" : "ALARM field app")}</div>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-b border-line px-5 py-4 sm:grid-cols-2">
              {meta.map((m) => (
                <div key={m.label}>
                  <dt className="text-[10.5px] font-semibold tracking-[0.06em] text-muted">{m.label}</dt>
                  <dd className="mt-1 font-bn text-[13.5px] font-semibold text-ink">{m.value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-[10.5px] font-semibold tracking-[0.06em] text-muted">SUBJECT</dt>
                <dd className="mt-1 text-[13.5px] font-semibold">
                  <Link href={profileHref} className="font-bn text-primary hover:text-primary-hover">
                    {profile.name}
                  </Link>
                </dd>
              </div>
            </dl>

            <div className="px-5 py-4">
              <h2 className="text-[14px] font-semibold text-ink">
                Field narrative · <span className="font-bn">মাঠ বিবরণ</span>
              </h2>
              <p className="mt-1 font-bn text-[13px] font-semibold text-ink">{s.title}</p>
              <p className="mt-2 font-bn text-[14px] leading-[1.75] text-ink">{s.body}</p>
              <p role="status" className={`mt-4 rounded-button border border-l-[3px] border-line bg-surface/60 px-4 py-3 font-bn text-[12.5px] leading-relaxed text-ink ${noteTone}`}>
                {note}
              </p>
              {dispute && (
                <p className="mt-3 text-[12.5px] text-muted">
                  Disputed by the political activist —{" "}
                  <Link href="/admin/disputes?tab=all" className="font-semibold text-primary hover:text-primary-hover">
                    {dispute.code} · {dispute.state === "Open" ? "open" : "decided"}
                  </Link>
                </p>
              )}
            </div>
          </section>

          <section className={card}>
            <CardHead title="Evidence in this submission" sub={`সংগৃহীত এভিডেন্স · ${s.evidence.length} item${s.evidence.length === 1 ? "" : "s"}`} />
            {s.evidence.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-muted">No evidence attached.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface/60 text-[10.5px] font-semibold tracking-[0.06em] text-muted">
                      <th scope="col" className="px-5 py-2.5 font-semibold">ITEM</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">TYPE</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-semibold">TIER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.evidence.map((it) => (
                      <tr key={it.id} className="border-b border-line last:border-b-0">
                        <td className="px-5 py-3.5 align-middle">
                          <div className="font-bn text-[13px] text-ink">{it.title}</div>
                          <div className="mt-1 font-bn text-[11.5px] text-muted">{it.meta}</div>
                        </td>
                        <td className="px-3 py-3.5 align-middle">
                          <span className="whitespace-nowrap rounded-md bg-surface px-2 py-1 font-bn text-[12px] text-ink">{it.kind}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right align-middle">
                          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 font-bn text-[12px] ${TIER_STYLE[tier]}`}>
                            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                            {tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Checks, decision, trail */}
        <div className="flex min-w-0 flex-col gap-5">
          <section className={card}>
            <CardHead title="Integrity checks" sub="সত্যতা যাচাই" />
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
            <CardHead title="Reviewer decision" sub="পর্যালোচকের সিদ্ধান্ত" />
            <div className="flex flex-col gap-2.5 px-5 py-4">
              {s.state === "Withdrawn" ? (
                <p className="text-[12.5px] text-muted">Withdrawn after a dispute — decisions are closed.</p>
              ) : pick ? (
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
                    Reason for “{ACTIONS.find((a) => a.key === pick)?.label}”
                  </label>
                  <textarea
                    id="fr-reason"
                    autoFocus
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="What the evidence shows — recorded in the audit log and shown to the field staff."
                    className={`${inputClass} h-auto resize-y py-2.5 font-bn text-[13px]`}
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={reason.trim().length < 9} className="h-10 flex-1 cursor-pointer rounded-button bg-primary text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
                      Confirm
                    </button>
                    <button type="button" onClick={() => setPick(null)} className="h-10 cursor-pointer rounded-button border border-line px-4 text-[13.5px] font-semibold text-muted">
                      Cancel
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
                      {isCurrent && " · current"}
                    </button>
                  );
                })
              )}
              <p className="mt-1 text-[12px] leading-normal text-muted text-pretty">
                {s.state === "Pending" && !lastRevisit
                  ? "No decision recorded yet. Accepting adds these items to the evidence set at the tiers shown."
                  : s.decidedBy
                    ? `Decided by ${nameOf(db, s.decidedBy)} · ${enRelative(s.decidedAt!)}. You can change it.`
                    : "Waiting for the field staff's re-visit."}
              </p>
              {decidedHere && s.state !== "Withdrawn" && (
                <button
                  type="button"
                  onClick={() => {
                    undoDecision(s.code, adminId);
                    setDecidedHere(false);
                  }}
                  className="cursor-pointer self-start text-[12.5px] font-semibold text-primary hover:text-primary-hover"
                >
                  Undo
                </button>
              )}
            </div>
          </section>

          <section className={card}>
            <CardHead title="Submission trail" sub="জমা দেওয়ার লগ" />
            <ol className="px-5">
              {trail.map((t, i) => (
                <li key={`${t.time}-${i}`} className="flex gap-3 border-b border-line py-3 last:border-b-0">
                  <span className="mt-[5px] size-2 flex-none rounded-full" style={{ background: t.dot }} aria-hidden="true" />
                  <div>
                    <div className="text-[13px] text-ink">{t.text}</div>
                    {t.note && <div className="mt-0.5 font-bn text-[12px] leading-snug text-muted">“{t.note}”</div>}
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
