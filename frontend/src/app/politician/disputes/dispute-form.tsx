"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EvidenceDropzone, EvidenceList, useEvidenceFiles } from "@/components/evidence";
import { Field, inputClass, Required } from "@/components/form";
import { RichTextEditor } from "@/components/rich-text";
import { useMe } from "@/lib/auth-client";
import { fileDispute } from "@/lib/db/actions";
import { filesToEvidence } from "@/lib/evidence-files";
import { plainText } from "@/lib/rich-text";

const OTHER = "অন্যান্য";
const REASONS = ["তথ্য ভুল", "পুরো ঘটনা বলা হয়নি", "উৎস বিশ্বাসযোগ্য নয়", "আমার সাথে জড়িত নয়", OTHER];

export function DisputeForm({ reportCode, reportTitle }: { reportCode: string; reportTitle: string }) {
  const router = useRouter();
  const me = useMe();
  const [reason, setReason] = useState(REASONS[0]);
  const [otherReason, setOtherReason] = useState("");
  const [text, setText] = useState("");
  const [attempted, setAttempted] = useState(false);
  const evidence = useEvidenceFiles();

  const isOther = reason === OTHER;
  const reasonOk = !isOther || otherReason.trim().length > 0;
  const textOk = plainText(text).trim().length > 12;
  const ready = reasonOk && textOk;

  return (
    <div className="overflow-hidden rounded-card border border-danger bg-white shadow-card">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[14.5px] font-semibold leading-[1.6]">ভুল তথ্যের অভিযোগ জানান</h2>
        <p className="mt-[3px] text-[12px] leading-[1.65] text-muted text-pretty">
          যে রিপোর্ট নিয়ে অভিযোগ: <strong className="font-semibold text-ink">{reportTitle}</strong>
        </p>
      </div>

      <form
        noValidate
        className="flex flex-col gap-[18px] p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setAttempted(true);
          if (!ready || !me) return;
          // Keep the files themselves so the editors can open them while resolving the dispute.
          const files = await filesToEvidence(evidence.items.map((i) => i.file), "রাজনৈতিক কর্মীর দেওয়া");
          const code = fileDispute(
            { submissionCode: reportCode, reason: isOther ? otherReason.trim() : reason, claim: text, attachments: evidence.items.map((i) => i.file.name), files },
            me.userId,
          );
          router.push(`/politician/disputes?submitted=${code}`);
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[12.5px] font-semibold leading-[1.6]">
            অভিযোগের ধরন <Required />
          </legend>
          <div role="radiogroup" className="flex flex-wrap gap-[9px]">
            {REASONS.map((r) => {
              const on = reason === r;
              return (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setReason(r)}
                  className={`h-10 cursor-pointer rounded-button border px-3.5 text-[12.5px] font-semibold ${
                    on ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:border-primary"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          {isOther && (
            <div className="mt-1 flex flex-col gap-[7px]">
              <label htmlFor="dp-other" className="sr-only">
                অভিযোগের ধরন লিখুন
              </label>
              <input
                id="dp-other"
                type="text"
                autoFocus
                placeholder="অভিযোগের ধরন লিখুন"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                aria-invalid={attempted && !reasonOk}
                className={`${inputClass} max-w-[480px] ${attempted && !reasonOk ? "border-danger!" : ""}`}
              />
              {attempted && !reasonOk && <p className="text-[11.5px] leading-[1.65] text-danger">অভিযোগের ধরন লিখুন।</p>}
            </div>
          )}
        </fieldset>

        <Field
          id="dp-text"
          label="আপনার বক্তব্য"
          required
          hint={attempted && !textOk ? "কেন তথ্যটি ভুল তা আরও স্পষ্ট করে লিখুন।" : undefined}
          hintClassName="text-danger"
        >
          <RichTextEditor
            id="dp-text"
            placeholder="কোন তথ্যটি ভুল এবং কেন, তা স্পষ্ট করে লিখুন। এর উল্টো প্রমাণ থাকলে যোগ করুন।"
            value={text}
            onChange={setText}
            invalid={attempted && !textOk}
            describedBy={attempted && !textOk ? "dp-text-msg" : undefined}
          />
        </Field>

        <EvidenceDropzone
          className="h-[131px]"
          onFiles={evidence.add}
          icon={
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.2 1.6h6.3l3.3 3.3v9.5H3.2z" stroke="#006A4E" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M9.3 1.8v3.4h3.3" stroke="#006A4E" strokeWidth="1.4" />
            </svg>
          }
          title="উল্টো প্রমাণ যোগ করুন"
        />
        <EvidenceList items={evidence.items} error={evidence.error} onRemove={evidence.remove} />

        <div className="flex flex-wrap items-center gap-3">
          <p
            role="status"
            className={`min-w-[190px] flex-1 text-[11.5px] leading-[1.65] text-pretty ${
              ready ? "text-muted" : attempted ? "text-danger" : "text-warning"
            }`}
          >
            {ready
              ? "অভিযোগ জমা দিলে সম্পাদক রিপোর্টটি আবার যাচাই করবেন। যাচাই চলার সময় তথ্যটি প্রোফাইলে থাকবে।"
              : !reasonOk
                ? "অভিযোগের ধরন লিখুন।"
                : "আপনার বক্তব্য লিখুন — কেন তথ্যটি ভুল তা স্পষ্ট করুন।"}
          </p>
          <div className="flex flex-none gap-2.5">
            <Link
              href={`/politician/reports/${reportCode}?from=reports`}
              className="inline-flex h-[42px] items-center rounded-button px-4 text-[13.5px] font-semibold text-muted hover:bg-surface hover:text-ink"
            >
              বাতিল
            </Link>
            <button
              type="submit"
              className={`h-[42px] cursor-pointer rounded-button px-5 text-[13.5px] font-semibold ${
                ready ? "bg-danger text-white hover:bg-danger-hover" : "bg-surface text-muted"
              }`}
            >
              অভিযোগ জমা দিন
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
