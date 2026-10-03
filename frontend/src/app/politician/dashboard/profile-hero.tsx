"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { PhotoInput, useProfile } from "@/components/profile";
import { bn } from "@/lib/db/format";
import type { ProfileSummary } from "@/lib/db/selectors";
import type { Profile } from "@/lib/db/types";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const COVER_MAX_MB = 5;
/** Shown to the user: the cover box is roughly 5:1 on desktop and is cropped at the sides on phones. */
const COVER_HINT = "প্রস্তাবিত মাপ ১৬০০ × ৩০০ পিক্সেল · JPG, PNG বা WebP · সর্বোচ্চ ৫ MB";

/** Local object-URL preview for the chosen cover; uploading is wired to the backend later. */
function useCover() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) return setError("শুধু JPG, PNG বা WebP ছবি দেওয়া যাবে।");
    if (f.size > COVER_MAX_MB * 1024 * 1024) return setError(`ছবিটি ${bn(COVER_MAX_MB)} MB-এর বেশি — ছোট ছবি দিন।`);
    setError("");
    setFile(f);
  };
  return { url, error, onChange, clear: () => setFile(null) };
}

function CoverInput({ onChange }: { onChange: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return <input type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" onChange={onChange} />;
}

const ImageIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2.6" y="4.6" width="18.8" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="8.4" cy="9.6" r="1.7" stroke="currentColor" strokeWidth="1.6" />
    <path d="m3.4 16.6 4.8-4.1 4.2 3.6 3.3-2.6 5.2 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-9 flex-none items-center justify-center rounded-button bg-surface text-primary ring-1 ring-line">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          {icon}
        </svg>
      </span>
      <div className="min-w-0">
        <dt className="text-[11.5px] leading-[1.5] text-muted">{label}</dt>
        <dd className="text-[13.5px] font-semibold leading-[1.5] text-ink">{value}</dd>
      </div>
    </div>
  );
}

export function ProfileHero({ profile, summary }: { profile: Profile; summary: ProfileSummary }) {
  const cover = useCover();
  const { photo } = useProfile();
  const { positive, negative, score, band, accepted } = summary;
  const verified = profile.account === "Active";

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      {/* Cover: the politician's own upload; no default artwork. */}
      <div className="relative h-[150px] overflow-hidden md:h-[200px]">
        {cover.url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={cover.url} alt="কভার ছবি" className="absolute inset-0 size-full object-cover" />
            <div className="absolute top-3 right-3 flex gap-2">
              <label className="inline-flex h-8 cursor-pointer items-center gap-[7px] rounded-button border border-white/30 bg-ink/50 px-3 text-[12px] font-semibold text-white backdrop-blur-sm hover:bg-ink/70">
                <ImageIcon />
                কভার পরিবর্তন
                <CoverInput onChange={cover.onChange} />
              </label>
              <button
                type="button"
                onClick={cover.clear}
                className="inline-flex h-8 cursor-pointer items-center rounded-button border border-white/30 bg-ink/50 px-3 text-[12px] font-semibold text-white backdrop-blur-sm hover:bg-ink/70"
              >
                সরান
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-surface bg-[radial-gradient(#C8DDD6_1px,transparent_1px)] bg-[length:18px_18px]">
            <div className="absolute inset-3 flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line bg-white/60 px-4 pb-8 text-center md:pb-4">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-button border border-line bg-white px-3.5 text-[12.5px] font-semibold text-primary shadow-card hover:border-primary">
                <ImageIcon size={15} />
                কভার ছবি যোগ করুন
                <CoverInput onChange={cover.onChange} />
              </label>
              <p className="text-[11.5px] leading-[1.6] text-muted text-pretty">{COVER_HINT}</p>
            </div>
          </div>
        )}
        {cover.error && (
          <p role="alert" className="absolute inset-x-3 bottom-3 rounded-button bg-danger px-3 py-1.5 text-center text-[12px] font-semibold text-white md:right-auto md:left-1/2 md:-translate-x-1/2">
            {cover.error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 px-6 pb-6">
        <label
          title="প্রোফাইল ছবি পরিবর্তন"
          className="group relative -mt-10 flex size-[88px] flex-none cursor-pointer items-center justify-center self-start overflow-hidden rounded-xl border-4 border-white bg-surface shadow-card md:-mt-[52px] md:size-[124px]"
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-chosen photo
            <img src={photo} alt="প্রোফাইল ছবি" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-muted">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8.4" r="3.6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4.8 20.2c0-3.9 3.2-6.4 7.2-6.4s7.2 2.5 7.2 6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[11px] leading-normal">প্রোফাইল ছবি</span>
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-ink/60 py-1 text-center text-[10.5px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
            পরিবর্তন করুন
          </span>
          <PhotoInput />
        </label>

        <div className="min-w-[260px] flex-1 md:pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 className="text-[22px] font-bold leading-[1.45] md:text-[25px]">{profile.name}</h2>
            {verified && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-[11.5px] font-semibold text-primary">
                <svg width="12" height="13" viewBox="0 0 19 21" fill="none" aria-hidden="true">
                  <path d="M9.5 1.2 17.3 4v7.2c0 4.6-3.2 7.6-7.8 8.9-4.6-1.3-7.8-4.3-7.8-8.9V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M6.2 10.6l2.4 2.5 4.4-4.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                যাচাইকৃত প্রোফাইল
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[14px] leading-[1.65] text-muted">
            <span className="font-semibold text-ink">{profile.post}</span>
            {profile.party && <> · {profile.party}</>}
          </p>
          <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
            <Detail
              label="নির্বাচনী এলাকা"
              value={profile.seat}
              icon={
                <>
                  <path d="M10 17.5s5.5-5 5.5-9.3A5.5 5.5 0 0 0 4.5 8.2c0 4.3 5.5 9.3 5.5 9.3Z" strokeLinejoin="round" />
                  <circle cx="10" cy="8.2" r="2" />
                </>
              }
            />
            <Detail
              label="এলাকা ও ওয়ার্ড"
              value={`${profile.thana} · ${profile.wards}`}
              icon={
                <>
                  <path d="M3.5 5.2 7.8 3.5l4.4 1.7 4.3-1.7v11.3l-4.3 1.7-4.4-1.7-4.3 1.7Z" strokeLinejoin="round" />
                  <path d="M7.8 3.5v11.3M12.2 5.2v11.3" />
                </>
              }
            />
            <Detail
              label="ALARM আইডি"
              value={profile.audit.code}
              icon={
                <>
                  <rect x="3" y="4.5" width="14" height="11" rx="1.6" />
                  <circle cx="7.5" cy="9.3" r="1.7" />
                  <path d="M5 13c.5-1.1 1.4-1.6 2.5-1.6s2 .5 2.5 1.6M12 8.5h3M12 11.5h2" strokeLinecap="round" />
                </>
              }
            />
            <Detail
              label="দায়িত্বে"
              value={`${profile.since} সাল থেকে`}
              icon={
                <>
                  <rect x="3.5" y="4.5" width="13" height="12" rx="1.6" />
                  <path d="M3.5 8.5h13M7 3v3M13 3v3" strokeLinecap="round" />
                </>
              }
            />
          </dl>
        </div>

        <div className="flex flex-none items-center gap-3.5 rounded-card border border-line px-[17px] py-[13px] md:mt-4">
          <div
            role="img"
            aria-label={`প্রোফাইল স্কোর ${bn(score)}`}
            className="flex size-[74px] flex-none items-center justify-center rounded-full"
            style={{ background: accepted ? `conic-gradient(#1A7A4A 0% ${score}%, #F42A41 ${score}% 100%)` : "#E3EEEA" }}
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-white text-[19px] font-bold">{bn(score)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold leading-normal text-muted">প্রোফাইল স্কোর</div>
            <div className="mt-[3px] text-[13px] font-semibold leading-[1.6]" style={{ color: band.color }}>
              {band.label}
            </div>
            <div className="mt-0.5 text-[11px] leading-[1.6] text-muted">
              {bn(positive)} ইতিবাচক · {bn(negative)} নেতিবাচক
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
