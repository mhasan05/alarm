"use client";

import Link from "next/link";
import { useState } from "react";
import { EvidenceDropzone, EvidenceList, filesToEvidence, useEvidenceFiles } from "@/components/evidence";
import { Field, inputClass } from "@/components/form";
import { RichTextEditor } from "@/components/rich-text";
import { useMe } from "@/lib/auth-client";
import { submit } from "@/lib/db/actions";
import { bnDate } from "@/lib/db/format";
import { plainText } from "@/lib/rich-text";

export function AddActivityForm() {
  const me = useMe();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [place, setPlace] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const evidence = useEvidenceFiles();

  const titleOk = title.trim().length > 6;
  const descOk = plainText(description).trim().length > 0;
  const ready = titleOk && descOk;

  const note = ready
    ? "জমা দেওয়ার পর যাচাইয়ের তালিকায় যাবে।"
    : !titleOk
      ? "একটি শিরোনাম লিখুন — অন্তত কয়েকটি শব্দ।"
      : "কাজটির বিস্তারিত লিখুন।";

  const reset = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setPlace("");
    evidence.reset();
    setAttempted(false);
    setSubmitted(false);
    setCode("");
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-10 pb-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-warning/10">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-[17px] font-semibold leading-[1.6]">যাচাইয়ের জন্য জমা হয়েছে · {code}</h2>
        <p className="max-w-[480px] text-[12.5px] leading-[1.75] text-muted text-pretty">
          “{title.trim()}” যাচাইয়ের তালিকায় গেছে। এটি “নিজের দেওয়া তথ্য” হিসেবে দেখানো হবে এবং গ্রহণ না করা পর্যন্ত
          প্রোফাইল স্কোরে যোগ হবে না।
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-[12px] font-semibold text-warning">
          <span className="size-1.5 rounded-full bg-warning" />
          যাচাই চলছে
        </span>
        <div className="mt-3 flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="h-[42px] cursor-pointer rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-muted hover:border-primary hover:text-primary"
          >
            আরেকটি যোগ করুন
          </button>
          <Link
            href="/politician/reports"
            className="inline-flex h-[42px] items-center rounded-button bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
          >
            আমার রিপোর্ট দেখুন
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
        if (!ready || !me?.profile) return;
        const facts: [string, string][] = [];
        if (date) facts.push(["কাজের তারিখ", bnDate(`${date}T12:00:00+06:00`)]);
        if (place.trim()) facts.push(["স্থান", place.trim()]);
        const files = filesToEvidence(evidence.items, "রাজনৈতিক কর্মীর আপলোড");
        setCode(
          submit(
            {
              profileId: me.profile.id,
              origin: "self",
              // A রাজনৈতিক কর্মী adds only their own work, so it is always ইতিবাচক.
              category: "ইতিবাচক",
              title,
              body: description,
              source: files.length ? `${files.length}টি প্রমাণ দেওয়া আছে${place.trim() ? ` · ${place.trim()}` : ""}` : place.trim() || "কোনো প্রমাণ দেওয়া হয়নি",
              facts,
              evidence: files,
            },
            me.userId,
          ),
        );
        setSubmitted(true);
      }}
    >
      <Field
        id="mp-title"
        label="শিরোনাম"
        required
        hint={attempted && !titleOk ? "শিরোনামটি আরও পরিষ্কার করুন — অন্তত কয়েকটি শব্দ।" : undefined}
        hintClassName="text-danger"
      >
        <input
          id="mp-title"
          type="text"
          placeholder="যেমন: ওয়ার্ড ১৪-এ নতুন পানির লাইন বসানো শেষ"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={attempted && !titleOk}
          className={`${inputClass} ${attempted && !titleOk ? "border-danger!" : ""}`}
        />
      </Field>

      <Field
        id="mp-desc"
        label="বিস্তারিত"
        required
        hint={attempted && !descOk ? "এই ঘরটি পূরণ করতে হবে।" : undefined}
        hintClassName="text-danger"
      >
        <RichTextEditor
          id="mp-desc"
          placeholder="কাজটি কখন, কোথায় ও কীভাবে হয়েছে লিখুন। বাজেট, প্রকল্প নম্বর বা অফিসের নাম থাকলে তা-ও লিখুন।"
          value={description}
          onChange={setDescription}
          invalid={attempted && !descOk}
          describedBy={attempted && !descOk ? "mp-desc-msg" : undefined}
        />
      </Field>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[18px]">
        <Field id="mp-date" label="কাজের তারিখ">
          <input id="mp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} px-[11px]`} />
        </Field>
        <Field id="mp-place" label="স্থান">
          <input
            id="mp-place"
            type="text"
            placeholder="ওয়ার্ড ১৪, সাগরপাড়া"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4">
        <EvidenceDropzone
          className="h-[143px] flex-[1_1_250px]"
          onFiles={evidence.add}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2.6" y="4.6" width="18.8" height="15" rx="2.2" stroke="#006A4E" strokeWidth="1.5" />
              <path d="m3.4 16.6 4.8-4.1 4.2 3.6 3.3-2.6 5.2 4.2" stroke="#006A4E" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          }
          title="ছবি বা কাগজ যোগ করুন"
          note="প্রমাণ ছাড়া তথ্য নির্বাহী সম্পাদক বাতিল করতে পারেন"
        />
        <div className="flex min-w-0 flex-[1_1_250px] flex-col justify-center gap-[9px] rounded-card border border-l-[3px] border-line border-l-warning p-[15px]">
          <div className="flex items-center gap-2">
            <span className="size-[7px] flex-none rounded-full bg-warning" />
            <span className="text-[12.5px] font-semibold leading-[1.6]">যাচাইয়ের জন্য জমা হবে</span>
          </div>
          <p className="text-[11.5px] leading-[1.7] text-muted text-pretty">
            জমা দেওয়ার পর এটি “নিজের দেওয়া তথ্য” হিসেবে দেখানো হবে। নির্বাহী সম্পাদক গ্রহণ না করা পর্যন্ত প্রোফাইল স্কোরে যোগ হবে না।
          </p>
        </div>
      </div>

      <EvidenceList items={evidence.items} error={evidence.error} onRemove={evidence.remove} />

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <p
          role="status"
          className={`min-w-[190px] flex-1 text-[11.5px] leading-[1.65] text-pretty ${
            ready ? "text-muted" : attempted ? "text-danger" : "text-warning"
          }`}
        >
          {note}
        </p>
        <div className="flex flex-none gap-2.5">
          <Link
            href="/politician/dashboard"
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
            যাচাইয়ের জন্য জমা দিন
          </button>
        </div>
      </div>
    </form>
  );
}
