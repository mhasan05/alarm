"use client";

import { useState } from "react";
import { EvidenceManager } from "./evidence-manager";
import { inputClass } from "./form";
import { RichTextEditor } from "./rich-text";
import type { SubmissionEdits } from "@/lib/db/actions";
import type { Category, Evidence, Submission } from "@/lib/db/types";
import { plainText, toSafeHtml } from "@/lib/rich-text";

type Draft = { title: string; category: Category; source: string; body: string; evidence: Evidence[] };
const draftOf = (s: Submission): Draft => ({ title: s.title, category: s.category, source: s.source, body: s.body, evidence: s.evidence.map((x) => ({ ...x })) });

/**
 * Edit a submission's text and evidence (add, remove, preview files). A reason is required and is
 * kept in the submission's history. The decision is not changed here.
 */
export function SubmissionEditor({ submission: s, onSave, onCancel, idPrefix = "ed" }: { submission: Submission; onSave: (edits: SubmissionEdits, note: string) => void; onCancel: () => void; idPrefix?: string }) {
  const [d, setD] = useState<Draft>(() => draftOf(s));
  const [why, setWhy] = useState("");
  const id = (k: string) => `${idPrefix}-${k}`;

  const changed =
    d.title.trim() !== s.title ||
    d.category !== s.category ||
    d.source.trim() !== s.source ||
    toSafeHtml(d.body) !== toSafeHtml(s.body) ||
    JSON.stringify(d.evidence.map((x) => [x.id, x.title])) !== JSON.stringify(s.evidence.map((x) => [x.id, x.title]));
  const bodyOk = plainText(d.body).trim().length >= 10;
  const valid = d.title.trim().length >= 6 && bodyOk && d.source.trim().length >= 3;
  const canSave = valid && changed && why.trim().length >= 5;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        onSave({ title: d.title.trim(), category: d.category, source: d.source.trim(), body: d.body, evidence: d.evidence }, why);
      }}
      className="flex flex-col gap-4"
    >
      <fieldset>
        <legend className="text-[12.5px] font-semibold text-ink">ধরন</legend>
        <div className="mt-2 flex gap-2">
          {(["ইতিবাচক", "নেতিবাচক"] as Category[]).map((c) => (
            <label
              key={c}
              className={`flex h-10 flex-1 cursor-pointer items-center justify-center rounded-button border text-[13.5px] font-semibold ${
                d.category === c ? (c === "ইতিবাচক" ? "border-success bg-success/10 text-success" : "border-danger bg-danger/10 text-danger") : "border-line text-muted hover:border-primary"
              }`}
            >
              <input type="radio" name={id("category")} className="sr-only" checked={d.category === c} onChange={() => setD({ ...d, category: c })} />
              {c}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-[7px]">
        <label htmlFor={id("title")} className="text-[12.5px] font-semibold text-ink">
          শিরোনাম
        </label>
        <input id={id("title")} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} className={`${inputClass} ${d.title.trim().length < 6 ? "border-danger!" : ""}`} />
      </div>
      <div className="flex flex-col gap-[7px]">
        <label htmlFor={id("source")} className="text-[12.5px] font-semibold text-ink">
          উৎস
        </label>
        <input id={id("source")} value={d.source} onChange={(e) => setD({ ...d, source: e.target.value })} className={`${inputClass} ${d.source.trim().length < 3 ? "border-danger!" : ""}`} />
      </div>
      <div className="flex flex-col gap-[7px]">
        <label htmlFor={id("body")} className="text-[12.5px] font-semibold text-ink">
          বিস্তারিত
        </label>
        <RichTextEditor id={id("body")} minHeight={180} value={d.body} onChange={(body) => setD((cur) => ({ ...cur, body }))} invalid={!bodyOk} />
      </div>
      <div className="flex flex-col gap-[7px]">
        <span className="text-[12.5px] font-semibold text-ink">প্রমাণ ও কাগজপত্র</span>
        <EvidenceManager items={d.evidence} onChange={(evidence) => setD({ ...d, evidence })} />
      </div>
      <div className="flex flex-col gap-[7px]">
        <label htmlFor={id("why")} className="text-[12.5px] font-semibold text-ink">
          এডিটের কারণ <span className="text-danger">*</span>
        </label>
        <input id={id("why")} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="যেমন: অভিযোগের কাগজ দেখে জমির পরিমাণ ঠিক করা হলো" className={inputClass} />
        <p className="text-[11.5px] text-muted">কারণটি জমার ইতিহাস ও অডিট লগে লেখা থাকবে।</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={!canSave} className="h-11 cursor-pointer rounded-button bg-primary px-6 text-[14px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
          পরিবর্তন সেভ করুন
        </button>
        <button type="button" onClick={onCancel} className="h-11 cursor-pointer rounded-button border border-line px-5 text-[14px] font-semibold text-muted hover:text-ink">
          বাতিল
        </button>
        <span className="text-[12px] text-muted">{!changed ? "কিছু বদলালে সেভ বোতাম চালু হবে।" : !valid ? "শিরোনাম, উৎস ও বিস্তারিত ঠিকমতো লিখুন।" : why.trim().length < 5 ? "সেভের আগে এডিটের কারণ লিখুন।" : ""}</span>
      </div>
    </form>
  );
}
