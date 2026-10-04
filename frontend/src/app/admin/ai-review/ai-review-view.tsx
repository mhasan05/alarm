"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { StatTiles } from "@/components/charts";
import { inputClass } from "@/components/form";
import { generateReport } from "@/lib/db/actions";

export type Finding = {
  id: string;
  kind: "staff" | "ai";
  category: "ইতিবাচক" | "নেতিবাচক";
  title: string;
  meta: string;
  sources: number;
  href?: string;
  suggested: "keep" | "exclude";
};

export type Analysis = {
  profileId: string;
  name: string;
  post: string;
  area: string;
  wards: string;
  audit: string;
  staffCount: number;
  findings: Finding[];
  reportCode: string;
  version: number;
};

type Choice = "keep" | "exclude";

const today = () => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date());

/**
 * Keep or exclude each finding before the report is written. Excluding anything needs a note,
 * because excluded items stay on the audit record with the admin's reason.
 */
export function AiReviewView({ analysis, admin, adminId, onGenerated }: { analysis: Analysis; admin: string; adminId: string; onGenerated: () => void }) {
  // Frozen on open, so the numbers don't shift once the report is cut.
  const [a] = useState(analysis);
  const initial = () => Object.fromEntries(a.findings.map((f) => [f.id, f.suggested])) as Record<string, Choice>;
  const [choice, setChoice] = useState<Record<string, Choice>>(initial);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const kept = a.findings.filter((f) => choice[f.id] === "keep");
  const excluded = a.findings.length - kept.length;
  const aiAll = a.findings.filter((f) => f.kind === "ai");
  const staffAll = a.findings.length - aiAll.length;
  const pos = kept.filter((f) => f.category === "ইতিবাচক").length;
  const neg = kept.length - pos;
  const sources = kept.reduce((n, f) => n + f.sources, 0);
  const locked = generated !== null;

  const set = (id: string, c: Choice) => !locked && setChoice((m) => ({ ...m, [id]: c }));
  const setAll = (pick: (f: Finding) => Choice) => !locked && setChoice(Object.fromEntries(a.findings.map((f) => [f.id, pick(f)])));

  const generate = () => {
    if (kept.length === 0) return;
    if (excluded > 0 && !note.trim()) {
      setNoteError(true);
      noteRef.current?.focus();
      noteRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    generateReport(
      a.profileId,
      adminId,
      kept.filter((f) => f.kind === "staff").map((f) => f.id),
      kept.filter((f) => f.kind === "ai").map((f) => f.id),
      note,
    );
    onGenerated();
    setGenerated(today());
  };

  const stats = [
    { label: "ACCEPTED SUBMISSIONS", value: String(staffAll), color: "#0D1F17", note: `গৃহীত জমা · from ${a.staffCount} investigation editors, queue clear` },
    { label: "AI FOUND ITSELF", value: String(aiAll.length), color: "#1D6FC0", note: `পাবলিক রেকর্ড · ${aiAll.filter((f) => choice[f.id] === "keep").length} kept` },
    { label: "KEPT FOR REPORT", value: String(kept.length), color: "#1A7A4A", note: `রাখা হয়েছে · of ${a.findings.length} findings` },
    { label: "EXCLUDED", value: String(excluded), color: "#4A7060", note: "বাদ · stays on the audit record" },
  ];

  const generateButton = (full = false) => (
    <button
      type="button"
      onClick={generate}
      disabled={kept.length === 0 || locked}
      className={`inline-flex cursor-pointer items-center justify-center rounded-button bg-primary font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 ${
        full ? "h-12 w-full text-[15px]" : "h-10 px-4 text-[13.5px]"
      }`}
    >
      Generate Final Report
    </button>
  );

  return (
    <>
      <PageHeader
        backHref={`/admin/politicians/${a.profileId}`}
        crumb={
          <>
            <Link href={`/admin/politicians/${a.profileId}`} className="text-primary hover:text-primary-hover">
              {a.audit}
            </Link>{" "}
            / <span className="font-bn">এআই বিশ্লেষণ · ধাপ ৫</span>
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bn">{a.name}</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium ${
                locked ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {locked ? "Report generated" : "Awaiting your selection"}
            </span>
            <span className="block w-full font-bn text-[12.5px] font-normal text-muted max-md:hidden">
              {a.post} · {a.area}
              {a.wards && ` · ${a.wards}`}
            </span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={`/admin/politicians/${a.profileId}`}
              className="inline-flex h-10 items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary hover:bg-surface"
            >
              Back to audit
            </Link>
            {generateButton()}
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <div className="flex gap-3 rounded-card border border-line border-l-[3px] border-l-primary bg-white px-5 py-4 shadow-card">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 flex-none text-primary">
            <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 7.2v3.6M8 5.2v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-[13px] leading-relaxed text-ink text-pretty">
            The AI grouped every accepted submission into positive and negative findings, and searched public records for anything it could add.{" "}
            <strong className="font-semibold">Nothing here is in the report yet.</strong> Keep what belongs and exclude the rest — only kept items are written
            to the report.
          </p>
        </div>

        <StatTiles stats={stats} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white px-5 py-3.5 shadow-card">
          <p role="status" className="text-[13px] text-muted">
            {excluded === 0
              ? `All ${a.findings.length} findings are kept for the report.`
              : `${excluded} of ${a.findings.length} findings are excluded. They stay on the audit record with your note.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={locked}
              onClick={() => setAll(() => "keep")}
              className="h-9 cursor-pointer rounded-button border border-line bg-white px-3.5 text-[13px] font-semibold text-primary hover:border-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Keep all
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => setAll((f) => (f.kind === "staff" ? "keep" : "exclude"))}
              className="h-9 cursor-pointer rounded-button border border-line bg-white px-3.5 text-[13px] font-semibold text-primary hover:border-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Keep investigation evidence only
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          {(["ইতিবাচক", "নেতিবাচক"] as const).map((cat) => {
            const list = a.findings.filter((f) => f.category === cat);
            const keptHere = list.filter((f) => choice[f.id] === "keep").length;
            const positive = cat === "ইতিবাচক";
            return (
              <section key={cat} className="overflow-hidden rounded-card border border-line bg-white shadow-card">
                <div className={`flex items-start justify-between gap-3 border-b border-line px-5 py-4 ${positive ? "bg-success/8" : "bg-danger/8"}`}>
                  <div>
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                      <span className={`size-2 rounded-full ${positive ? "bg-success" : "bg-danger"}`} aria-hidden="true" />
                      {positive ? "Positive Activities" : "Negative Activities"}
                    </h2>
                    <p className="mt-0.5 pl-4 font-bn text-[12px] text-muted">{positive ? "ইতিবাচক কার্যক্রম" : "নেতিবাচক কার্যক্রম"}</p>
                  </div>
                  <span className={`text-[12.5px] font-semibold ${positive ? "text-success" : "text-danger"}`}>
                    {keptHere} of {list.length} kept
                  </span>
                </div>
                {list.length === 0 ? (
                  <p className="px-5 py-8 text-center text-[13px] text-muted">No {positive ? "positive" : "negative"} findings for this profile.</p>
                ) : (
                  <ul className="flex flex-col gap-3 p-4">
                    {list.map((f) => (
                      <FindingCard key={f.id} finding={f} choice={choice[f.id]} locked={locked} onChoose={(c) => set(f.id, c)} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,445px)]">
          <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
            <label htmlFor="ai-note" className="block">
              <span className="block text-[15px] font-semibold text-ink">Chief Executive Editor&apos;s note on this selection</span>
              <span className="mt-0.5 block text-[12px] text-muted">
                <span className="font-bn">নির্বাচনের ব্যাখ্যা</span> · Saved with the report version, visible to the executive editor
                {excluded > 0 && <span className="text-danger"> · required when anything is excluded</span>}
              </span>
            </label>
            <textarea
              id="ai-note"
              ref={noteRef}
              rows={8}
              value={note}
              disabled={locked}
              aria-invalid={noteError}
              aria-describedby="ai-note-error"
              onChange={(e) => {
                setNote(e.target.value);
                if (e.target.value.trim()) setNoteError(false);
              }}
              placeholder="Say why anything was excluded — a missing source, an unresolved response, or a claim the evidence does not carry."
              className={`${inputClass} mt-3 h-auto resize-y py-2.5 disabled:bg-surface ${noteError ? "border-danger!" : ""}`}
            />
            {noteError && (
              <p id="ai-note-error" className="mt-2 text-[12px] text-danger">
                Add a note explaining the {excluded} excluded finding{excluded === 1 ? "" : "s"} before generating the report.
              </p>
            )}
          </section>

          <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
            <h2 className="text-[15px] font-semibold text-ink">Report preview</h2>
            <p className="mt-0.5 font-bn text-[12px] text-muted">প্রতিবেদনে যা যাবে</p>
            <dl className="mt-4 flex flex-col gap-3 border-b border-line pb-4 text-[13px]">
              {[
                { label: "Positive activities", value: pos, dot: "bg-success", fg: "text-success" },
                { label: "Negative activities", value: neg, dot: "bg-danger", fg: "text-danger" },
                { label: "Sources cited", value: sources, dot: "bg-primary", fg: "text-ink" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <dt className="flex items-center gap-2.5 text-ink">
                    <span className={`size-2 rounded-full ${r.dot}`} aria-hidden="true" />
                    {r.label}
                  </dt>
                  <dd className={`text-[14px] font-semibold ${r.fg}`}>{r.value}</dd>
                </div>
              ))}
            </dl>

            {locked ? (
              <div role="status" className="mt-4">
                <p className="text-[13px] font-semibold text-success">
                  {a.reportCode} v{a.version} generated · {kept.length} findings, {sources} sources.
                </p>
                <p className="mt-1 text-[12px] leading-normal text-muted">
                  The selection is locked and the report waits for the executive editor&apos;s sign-off. A new version is only created if more data is added and re-analysed.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/reports/${a.reportCode}`}
                    className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
                  >
                    Open the report
                  </Link>
                  <Link
                    href="/admin/ai-review"
                    className="inline-flex h-10 items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary hover:bg-surface"
                  >
                    Other profiles
                  </Link>
                </div>
                <p className="mt-3 text-[11.5px] text-muted">
                  Signed as {admin} · Admin · {generated}
                </p>
              </div>
            ) : (
              <>
                <p className="mt-4 text-[12px] leading-normal text-muted text-pretty">
                  This will be cut as {a.reportCode} v{a.version}
                  {a.version > 1 ? " — a new version, because new accepted data arrived since the last cut." : ". A new version is only created if more data is added and re-analysed."}
                </p>
                <div className="mt-4">{generateButton(true)}</div>
                <p className="mt-2.5 text-center text-[11.5px] text-muted">
                  {kept.length === 0 ? "Keep at least one finding to generate the report." : `Signed as ${admin} · Chief Executive Editor · ${today()}`}
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function FindingCard({ finding: f, choice, locked, onChoose }: { finding: Finding; choice: Choice; locked: boolean; onChoose: (c: Choice) => void }) {
  const keep = choice === "keep";
  return (
    <li className={`rounded-card border border-line p-4 ${keep ? "bg-white" : "bg-[#FAFDFC]"}`}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.05em] ${
            f.kind === "staff" ? "bg-success/10 text-success" : "bg-role-reviewer/10 text-role-reviewer"
          }`}
        >
          {f.kind === "staff" ? "STAFF EVIDENCE" : "AI FOUND — PUBLIC RECORD"}
        </span>
        <span className={`text-[11.5px] font-semibold ${keep ? "text-success" : "text-muted"}`}>{keep ? "In the report" : "Excluded"}</span>
      </div>
      {f.href ? (
        <Link href={f.href} className={`mt-2.5 block font-bn text-[14px] font-semibold hover:text-primary ${keep ? "text-ink" : "text-muted"}`}>
          {f.title}
        </Link>
      ) : (
        <p className={`mt-2.5 font-bn text-[14px] font-semibold ${keep ? "text-ink" : "text-muted"}`}>{f.title}</p>
      )}
      <p className="mt-1 font-bn text-[12px] text-muted">{f.meta}</p>
      <div role="group" aria-label={`Keep or exclude: ${f.title}`} className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={keep}
          disabled={locked}
          onClick={() => onChoose("keep")}
          className={`h-10 cursor-pointer rounded-button border text-[13.5px] font-semibold disabled:cursor-not-allowed ${
            keep ? "border-primary bg-primary text-white" : "border-line bg-white text-primary hover:border-primary"
          }`}
        >
          Keep
        </button>
        <button
          type="button"
          aria-pressed={!keep}
          disabled={locked}
          onClick={() => onChoose("exclude")}
          className={`h-10 cursor-pointer rounded-button border text-[13.5px] font-semibold disabled:cursor-not-allowed ${
            !keep ? "border-muted bg-muted text-white" : "border-line bg-white text-muted hover:border-muted"
          }`}
        >
          Exclude
        </button>
      </div>
    </li>
  );
}
