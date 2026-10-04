"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { PhotoInput, useProfile } from "@/components/profile";
import { bn } from "@/lib/db/format";
import type { ProfileSummary } from "@/lib/db/selectors";
import type { Profile } from "@/lib/db/types";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const COVER_MAX_MB = 5;
/** Shown to the user: the cover box is roughly 5:1 on desktop and is cropped at the sides on phones. */
const COVER_HINT = "ভালো মাপ ১৬০০ × ৩০০ পিক্সেল · JPG, PNG বা WebP · ৫ MB পর্যন্ত";

type Pos = { x: number; y: number };
const CENTER: Pos = { x: 50, y: 50 };

/**
 * The cover: a local object-URL preview (uploading is wired to the backend later), its position inside
 * the frame, and an "adjust" mode where the user drags the image to the best fit.
 */
function useCover() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [pos, setPos] = useState<Pos>(CENTER);
  const [draft, setDraft] = useState<Pos | null>(null);
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
    setPos(CENTER);
    setDraft(CENTER); // a new cover opens straight in "adjust" mode
  };
  return {
    url,
    error,
    onChange,
    /** Position shown now: the draft while adjusting, else the saved one. */
    shown: draft ?? pos,
    adjusting: !!draft,
    startAdjust: () => setDraft(pos),
    moveTo: (p: Pos) => setDraft(p),
    saveAdjust: () => {
      if (draft) setPos(draft);
      setDraft(null);
    },
    cancelAdjust: () => setDraft(null),
    clear: () => {
      setFile(null);
      setDraft(null);
      setPos(CENTER);
    },
  };
}

type Cover = ReturnType<typeof useCover>;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** The uploaded cover with a small edit menu; in adjust mode the image follows the finger or mouse. */
function CoverImage({ cover }: { cover: Cover }) {
  const [menu, setMenu] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number; start: Pos; w: number; h: number } | null>(null);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
      <img
        src={cover.url}
        alt="কভার ছবি"
        draggable={false}
        style={{ objectPosition: `${cover.shown.x}% ${cover.shown.y}%` }}
        className={`absolute inset-0 size-full object-cover select-none ${cover.adjusting ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
        onPointerDown={(e) => {
          if (!cover.adjusting) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const r = e.currentTarget.getBoundingClientRect();
          setDrag({ x: e.clientX, y: e.clientY, start: cover.shown, w: r.width, h: r.height });
        }}
        onPointerMove={(e) => {
          if (!drag) return;
          // Dragging the picture down shows more of its top, so the position moves the other way.
          cover.moveTo({ x: clamp(drag.start.x - ((e.clientX - drag.x) / drag.w) * 100), y: clamp(drag.start.y - ((e.clientY - drag.y) / drag.h) * 100) });
        }}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      />

      {cover.adjusting ? (
        <>
          <span className="pointer-events-none absolute top-1/2 left-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-ink/60 px-3.5 py-1.5 text-[12px] font-semibold whitespace-nowrap text-white backdrop-blur-sm">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1.6v12.8M1.6 8h12.8M8 1.6 6.2 3.4M8 1.6l1.8 1.8M8 14.4l-1.8-1.8M8 14.4l1.8-1.8M1.6 8l1.8-1.8M1.6 8l1.8 1.8M14.4 8l-1.8-1.8M14.4 8l-1.8 1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            টেনে ছবিটি ঠিক জায়গায় আনুন
          </span>
          <div className="absolute top-3 right-3 flex gap-2">
            <button type="button" onClick={cover.cancelAdjust} className="h-8 cursor-pointer rounded-button bg-white/90 px-3 text-[12px] font-semibold text-ink hover:bg-white">
              বাতিল
            </button>
            <button type="button" onClick={cover.saveAdjust} className="h-8 cursor-pointer rounded-button bg-primary px-3.5 text-[12px] font-semibold text-white hover:bg-primary-hover">
              সেভ করুন
            </button>
          </div>
        </>
      ) : (
        <div className="absolute top-3 right-3">
          <button
            type="button"
            aria-label="কভার ছবি এডিট করুন"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink shadow-card backdrop-blur-sm hover:bg-white"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10.8 2.6 13.4 5.2 6 12.6H3.4V10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden="true" />
              <div role="menu" className="absolute top-0 right-11 z-30 w-44 overflow-hidden rounded-card border border-line bg-white py-1 shadow-card">
                <label role="menuitem" className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink hover:bg-surface">
                  <ImageIcon size={14} />
                  নতুন ছবি দিন
                  <CoverInput
                    onChange={(e) => {
                      setMenu(false);
                      cover.onChange(e);
                    }}
                  />
                </label>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    cover.startAdjust();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-ink hover:bg-surface"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 1.6v12.8M1.6 8h12.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  জায়গা ঠিক করুন
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    cover.clear();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-danger hover:bg-danger/5"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 4.5h10M6.4 4.5V3h3.2v1.5M4.6 4.5l.6 8.5h5.6l.6-8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  ছবি সরান
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
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

const ICON = {
  seat: (
    <>
      <path d="M10 17.5s5.5-5 5.5-9.3A5.5 5.5 0 0 0 4.5 8.2c0 4.3 5.5 9.3 5.5 9.3Z" strokeLinejoin="round" />
      <circle cx="10" cy="8.2" r="2" />
    </>
  ),
  area: (
    <>
      <path d="M3.5 5.2 7.8 3.5l4.4 1.7 4.3-1.7v11.3l-4.3 1.7-4.4-1.7-4.3 1.7Z" strokeLinejoin="round" />
      <path d="M7.8 3.5v11.3M12.2 5.2v11.3" />
    </>
  ),
  id: (
    <>
      <rect x="3" y="4.5" width="14" height="11" rx="1.6" />
      <circle cx="7.5" cy="9.3" r="1.7" />
      <path d="M5 13c.5-1.1 1.4-1.6 2.5-1.6s2 .5 2.5 1.6M12 8.5h3M12 11.5h2" strokeLinecap="round" />
    </>
  ),
  since: (
    <>
      <rect x="3.5" y="4.5" width="13" height="12" rx="1.6" />
      <path d="M3.5 8.5h13M7 3v3M13 3v3" strokeLinecap="round" />
    </>
  ),
};

const VerifiedBadge = () => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-[11.5px] font-semibold text-primary">
    <svg width="12" height="13" viewBox="0 0 19 21" fill="none" aria-hidden="true">
      <path d="M9.5 1.2 17.3 4v7.2c0 4.6-3.2 7.6-7.8 8.9-4.6-1.3-7.8-4.3-7.8-8.9V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6.2 10.6l2.4 2.5 4.4-4.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    যাচাই করা প্রোফাইল
  </span>
);

/** Profile photo picker; `className` sets the size, shape and position for each layout. */
function ProfilePhoto({ photo, className }: { photo: string | null | undefined; className: string }) {
  return (
    <label title="প্রোফাইল ছবি বদলান" className={`group relative flex flex-none cursor-pointer items-center justify-center overflow-hidden border-4 border-white bg-surface shadow-card ${className}`}>
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
      <span className="absolute inset-x-0 bottom-0 bg-ink/60 py-1 text-center text-[10.5px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">বদলান</span>
      <PhotoInput />
    </label>
  );
}

export function ProfileHero({ profile, summary }: { profile: Profile; summary: ProfileSummary }) {
  const cover = useCover();
  const { photo } = useProfile();
  const { positive, negative, score, band, accepted } = summary;
  const verified = profile.account === "Active";
  const details = [
    { label: "নির্বাচনী এলাকা", value: profile.seat, icon: ICON.seat },
    { label: "এলাকা ও ওয়ার্ড", value: `${profile.thana} · ${profile.wards}`, icon: ICON.area },
    { label: "ALARM আইডি", value: profile.id, icon: ICON.id },
    { label: "দায়িত্বে", value: `${profile.since} সাল থেকে`, icon: ICON.since },
  ];
  const posPct = accepted ? Math.round((positive / accepted) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      {/* Cover: the politician's own upload; no default artwork. */}
      <div className="relative h-[176px] overflow-hidden md:h-[200px]">
        {cover.url ? (
          <CoverImage cover={cover} />
        ) : (
          <div className="absolute inset-0 bg-surface bg-[radial-gradient(#C8DDD6_1px,transparent_1px)] bg-[length:18px_18px]">
            <div className="absolute inset-3 flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line bg-white/60 px-4 pb-14 text-center md:pb-4">
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

      {/* Phone: centred identity, a 2×2 details grid and a score card. */}
      <div className="px-4 pb-5 md:hidden">
        <div className="flex flex-col items-center text-center">
          <ProfilePhoto photo={photo} className="-mt-12 size-[96px] rounded-full" />
          <h2 className="mt-3 text-[21px] font-bold leading-[1.4]">{profile.name}</h2>
          {verified && (
            <div className="mt-1.5">
              <VerifiedBadge />
            </div>
          )}
          <p className="mt-2 text-[13.5px] leading-[1.6] text-muted">
            <span className="font-semibold text-ink">{profile.post}</span>
            {profile.party && <> · {profile.party}</>}
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-white">
          {details.map((d, i) => (
            <div key={d.label} className={`flex min-w-0 flex-col gap-1.5 p-3.5 ${i % 2 === 0 ? "border-r border-line" : ""} ${i < 2 ? "border-b border-line" : ""}`}>
              <dt className="flex items-center gap-1.5 text-[11.5px] text-muted">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="flex-none text-primary">
                  {d.icon}
                </svg>
                {d.label}
              </dt>
              <dd className="text-[14px] font-semibold leading-[1.4] break-words text-ink">{d.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 flex items-center gap-4 rounded-[14px] border border-line bg-surface/50 p-4">
          <div
            role="img"
            aria-label={`প্রোফাইল স্কোর ${bn(score)}`}
            className="flex size-[64px] flex-none items-center justify-center rounded-full"
            style={{ background: accepted ? `conic-gradient(#1A7A4A 0% ${score}%, #F42A41 ${score}% 100%)` : "#E3EEEA" }}
          >
            <div className="flex size-[50px] items-center justify-center rounded-full bg-white text-[17px] font-bold">{bn(score)}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-semibold text-muted">প্রোফাইল স্কোর</span>
              <span className="text-[12.5px] font-semibold" style={{ color: band.color }}>
                {band.label}
              </span>
            </div>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
              {accepted > 0 && (
                <>
                  <span className="h-full bg-success" style={{ width: `${posPct}%` }} />
                  <span className="h-full bg-danger" style={{ width: `${100 - posPct}%` }} />
                </>
              )}
            </div>
            <div className="mt-1.5 flex justify-between text-[11.5px] text-muted">
              <span>
                <span className="font-semibold text-success">{bn(positive)}</span> ইতিবাচক
              </span>
              <span>
                <span className="font-semibold text-danger">{bn(negative)}</span> নেতিবাচক
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tablet and desktop */}
      <div className="hidden flex-wrap items-center gap-x-6 gap-y-4 px-6 pb-6 md:flex">
        <ProfilePhoto photo={photo} className="-mt-[52px] size-[124px] self-start rounded-xl" />

        <div className="min-w-[260px] flex-1 md:pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 className="text-[22px] font-bold leading-[1.45] md:text-[25px]">{profile.name}</h2>
            {verified && <VerifiedBadge />}
          </div>
          <p className="mt-0.5 text-[14px] leading-[1.65] text-muted">
            <span className="font-semibold text-ink">{profile.post}</span>
            {profile.party && <> · {profile.party}</>}
          </p>
          <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
            {details.map((d) => (
              <Detail key={d.label} label={d.label} value={d.value} icon={d.icon} />
            ))}
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
