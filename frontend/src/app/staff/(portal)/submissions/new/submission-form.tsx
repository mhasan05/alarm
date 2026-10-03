"use client";

import Link from "next/link";
import { useState } from "react";
import { EvidenceDropzone, EvidenceList, filesToEvidence, useEvidenceFiles } from "@/components/evidence";
import { Field, inputClass, Required, selectClass } from "@/components/form";
import { useMe } from "@/lib/auth-client";
import { submit } from "@/lib/db/actions";
import { bnDate, nowIso } from "@/lib/db/format";
import { CATEGORY_STYLE } from "@/lib/db/selectors";
import type { Category } from "@/lib/db/types";

/** An assignment the staff member can submit against. */
export type Task = { id: string; name: string; office: string; initial: string };

const CATEGORIES: Category[] = ["ইতিবাচক", "নেতিবাচক"];

const FILE_TYPES = [
  { label: "ছবি · JPG, PNG", color: "#006A4E" },
  { label: "ভিডিও · MP4", color: "#1D6FC0" },
  { label: "অডিও · MP3, M4A", color: "#7A3FA8" },
  { label: "নথি · PDF", color: "#D97706" },
  { label: "স্ক্যান · DOCX", color: "#4A7060" },
];
const ACCEPT = "image/jpeg,image/png,video/mp4,audio/mpeg,audio/mp4,audio/x-m4a,.m4a,application/pdf,.docx";

/**
 * Field-staff submission form. With `locked`, the profile comes from a task and can't be changed;
 * otherwise the staff member picks one of their open assignments.
 */
export function SubmissionForm({ locked, openTasks }: { locked: Task | null; openTasks: Task[] }) {
  const me = useMe();
  const [code, setCode] = useState("");
  const [profileId, setProfileId] = useState(locked?.id ?? "");
  const [category, setCategory] = useState<Category>("ইতিবাচক");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const evidence = useEvidenceFiles({ maxFiles: 10, maxMB: 50 });

  const target = openTasks.find((t) => t.id === profileId) ?? locked;
  const targetOk = !!target;
  const titleOk = title.trim().length > 6;
  const sourceOk = source.trim().length > 0;
  const filesOk = evidence.items.length > 0;
  const ready = targetOk && titleOk && sourceOk && filesOk;

  const note = ready
    ? "জমা দেওয়ার পর তথ্যটি “পর্যালোচনাধীন” অবস্থায় আপনার তালিকায় যুক্ত হবে।"
    : !targetOk
      ? "কোন রাজনৈতিক কর্মী সম্পর্কে তথ্য, তা আগে বেছে নিন।"
      : !titleOk
        ? "একটি স্পষ্ট শিরোনাম লিখুন।"
        : !sourceOk
          ? "সূত্র ও বিবরণ লিখুন — নথি, দপ্তর বা প্রত্যক্ষদর্শীর পরিচয়।"
          : "কমপক্ষে একটি প্রমাণ ফাইল সংযুক্ত করুন।";

  const reset = () => {
    setProfileId(locked?.id ?? "");
    setCategory("ইতিবাচক");
    setTitle("");
    setSource("");
    evidence.reset();
    setAttempted(false);
    setSubmitted(false);
    setCode("");
  };

  if (submitted && target) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-10 pb-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-warning/10">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-[17px] font-semibold leading-[1.6]">পর্যালোচনার জন্য জমা হয়েছে · {code}</h2>
        <p className="max-w-[500px] text-[12.5px] leading-[1.75] text-muted text-pretty">
          {target.name} সম্পর্কে “{title.trim()}” পর্যালোচনার সারিতে গেছে। পর্যালোচক গ্রহণ করলেই প্রোফাইলে প্রকাশিত হবে।
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-[12px] font-semibold text-warning">
          <span className="size-1.5 rounded-full bg-warning" />
          পর্যালোচনাধীন
        </span>
        <div className="mt-3 flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="h-[42px] cursor-pointer rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-muted hover:border-primary hover:text-primary"
          >
            আরেকটি জমা দিন
          </button>
          <Link
            href={`/staff/submissions?filter=${encodeURIComponent("পর্যালোচনাধীন")}`}
            className="inline-flex h-[42px] items-center rounded-button bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
          >
            আমার জমা দেখুন
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-[18px] p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setAttempted(true);
        if (!ready || !target || !me?.staff) return;
        const text = source.trim();
        const firstLine = text.split(/[।\n]/)[0].trim();
        setCode(
          submit(
            {
              profileId: target.id,
              origin: "staff",
              staffId: me.staff.id,
              category,
              title,
              source: firstLine.length > 90 ? `${firstLine.slice(0, 88)}…` : firstLine,
              body: text,
              evidence: filesToEvidence(evidence.items, `মাঠ থেকে আপলোড · ${bnDate(nowIso())}`),
            },
            me.userId,
          ),
        );
        setSubmitted(true);
      }}
    >
      <div className="flex flex-col gap-[7px]">
        <label htmlFor="sf-profile" className="text-[12.5px] font-semibold leading-[1.6]">
          কোন রাজনৈতিক কর্মী সম্পর্কে{!locked && <> <Required /></>}
        </label>
        {locked ? (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-input border border-line bg-surface px-3.5 py-3">
              <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-primary/12 text-[14px] font-semibold text-primary">
                {locked.initial}
              </span>
              <div className="min-w-[180px] flex-1">
                <div className="text-[14px] font-semibold leading-[1.6]">{locked.name}</div>
                <div className="mt-0.5 text-[11.5px] leading-[1.6] text-muted text-pretty">{locked.office}</div>
              </div>
              <span className="inline-flex flex-none items-center gap-[7px] whitespace-nowrap text-[11px] font-semibold text-muted">
                <svg width="12" height="13" viewBox="0 0 13 15" fill="none" aria-hidden="true">
                  <rect x="1.4" y="6.1" width="10.2" height="7.6" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M4 6.1V4.2a2.5 2.5 0 0 1 5 0v1.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                অ্যাডমিন নির্ধারিত
              </span>
            </div>
            <p className="text-[11.5px] leading-[1.65] text-muted text-pretty">
              মাঠকর্মী এখান থেকে রাজনৈতিক কর্মী পরিবর্তন করতে পারেন না। অন্য প্রোফাইলে তথ্য দিতে হলে “ড্যাশবোর্ড” থেকে সেই কাজটি খুলুন।
            </p>
          </>
        ) : (
          <>
            <select
              id="sf-profile"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              aria-invalid={attempted && !targetOk}
              className={`${selectClass} ${profileId ? "text-ink" : "text-[#6B7885]"} ${attempted && !targetOk ? "border-danger!" : ""}`}
            >
              <option value="">আপনার নির্ধারিত প্রোফাইল বেছে নিন</option>
              {openTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-[11.5px] leading-[1.65] text-muted text-pretty">
              কেবল অ্যাডমিন আপনাকে যে প্রোফাইলগুলো দিয়েছেন সেগুলোই এখানে আছে — অন্য কারও নাম যোগ করা যায় না।
            </p>
          </>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[12.5px] font-semibold leading-[1.6]">
          শ্রেণি <Required />
        </legend>
        <div role="radiogroup" className="flex flex-wrap gap-2.5">
          {CATEGORIES.map((c) => {
            const on = category === c;
            const color = CATEGORY_STYLE[c].fg;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setCategory(c)}
                className={`flex h-11 cursor-pointer items-center gap-[9px] rounded-button border px-4 text-[13.5px] font-semibold ${
                  on ? "bg-[#FAFDFC] text-ink" : "border-line bg-white text-muted hover:border-primary"
                }`}
                style={on ? { borderColor: color } : undefined}
              >
                <span className="size-[15px] flex-none rounded-full border-[4.5px] bg-white" style={{ borderColor: on ? color : "#C8DDD6" }} />
                {c}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field
        id="sf-title"
        label="শিরোনাম"
        required
        hint={attempted && !titleOk ? "শিরোনামটি আরও স্পষ্ট করুন — কমপক্ষে কয়েকটি শব্দ।" : undefined}
        hintClassName="text-danger"
      >
        <input
          id="sf-title"
          type="text"
          placeholder="যেমন: ওয়ার্ড ১৩-এ সড়ক সংস্কার প্রকল্প সম্পন্ন"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={attempted && !titleOk}
          className={`${inputClass} ${attempted && !titleOk ? "border-danger!" : ""}`}
        />
      </Field>

      <Field
        id="sf-source"
        label="সূত্র ও বিবরণ"
        required
        hint={attempted && !sourceOk ? "এই ঘরটি পূরণ করা আবশ্যক।" : undefined}
        hintClassName="text-danger"
      >
        <textarea
          id="sf-source"
          rows={4}
          placeholder="নথির নাম ও তারিখ, দপ্তরের নাম, অথবা প্রত্যক্ষদর্শীর পরিচয় লিখুন। প্রমাণ ছাড়া তথ্য পর্যালোচক বাতিল করবেন।"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          aria-invalid={attempted && !sourceOk}
          className={`${inputClass} h-auto! resize-y py-3 leading-[1.75] ${attempted && !sourceOk ? "border-danger!" : ""}`}
        />
      </Field>

      <div className="flex flex-col gap-[9px]">
        <div className="text-[12.5px] font-semibold leading-[1.6]">
          প্রমাণ সংযুক্ত করুন <Required />
        </div>
        <EvidenceDropzone
          accept={ACCEPT}
          onFiles={evidence.add}
          invalid={attempted && !filesOk}
          className="gap-2.5 px-[18px] py-[22px]"
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 16.4V4.8M7.6 9.2 12 4.8l4.4 4.4" stroke="#006A4E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3.6 15.2v2.8a1.6 1.6 0 0 0 1.6 1.6h13.6a1.6 1.6 0 0 0 1.6-1.6v-2.8" stroke="#006A4E" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          title="ফাইল টেনে আনুন বা বেছে নিন"
          note="প্রতি ফাইল সর্বোচ্চ ৫০ MB · একসাথে ১০টি পর্যন্ত · ক্যামেরা বা রেকর্ডার থেকে সরাসরি নেওয়া যায়"
        >
          <span className="flex flex-wrap justify-center gap-2">
            {FILE_TYPES.map((ft) => (
              <span
                key={ft.label}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white px-[11px] py-[5px] text-[11.5px] font-semibold text-muted"
              >
                <span className="size-1.5 rounded-full" style={{ background: ft.color }} />
                {ft.label}
              </span>
            ))}
          </span>
        </EvidenceDropzone>
        <EvidenceList items={evidence.items} error={evidence.error} onRemove={evidence.remove} />
        {!evidence.items.length && (
          <p className={`text-[11.5px] leading-[1.65] text-pretty ${attempted ? "text-danger" : "text-warning"}`}>
            প্রমাণ ছাড়া জমা দেওয়া যাবে না — পর্যালোচক এমন তথ্য বাতিল করবেন।
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <p
          role="status"
          className={`min-w-[190px] flex-1 text-[11.5px] leading-[1.7] text-pretty ${
            ready ? "text-muted" : attempted ? "text-danger" : "text-warning"
          }`}
        >
          {note}
        </p>
        <div className="flex flex-none gap-2.5">
          <Link
            href="/staff/dashboard"
            className="inline-flex h-[42px] items-center rounded-button px-4 text-[13.5px] font-semibold text-muted hover:bg-surface hover:text-ink"
          >
            বাতিল
          </Link>
          <button
            type="submit"
            className={`h-[42px] cursor-pointer rounded-button px-5 text-[13.5px] font-semibold ${
              ready ? "bg-primary text-white hover:bg-primary-hover" : "bg-surface text-muted"
            }`}
          >
            পর্যালোচনার জন্য জমা দিন
          </button>
        </div>
      </div>
    </form>
  );
}
