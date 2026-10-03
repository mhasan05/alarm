"use client";

import { useEffect, useState, type DragEvent } from "react";
import { bnOf } from "@/lib/geo";

/** One evidence item on the review screen: a submitted sample, or a file the reviewer added. */
export type EvidenceItem = {
  id: string;
  title: string;
  meta: string;
  /** Short type label for submitted items without a file (e.g. "নথি · PDF"). */
  thumb: string;
  file?: File;
  url?: string;
  /** Added by the reviewer during this review. */
  added?: boolean;
  /** Marked for removal (submitted items only; added ones are dropped outright). */
  removed?: boolean;
};

const MAX_MB = 50;

const kindOf = (e: EvidenceItem) => {
  const t = e.file?.type ?? "";
  if (t.startsWith("image/")) return "image";
  if (t === "application/pdf") return "pdf";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  return e.file ? "file" : "sample";
};

function DocGlyph({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.6 2.4h5.6l3.2 3.2v8H3.6zM9.2 2.6v3.2h3.2M6 9.2h4M6 11.4h2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Evidence grid for reviewers: click a card to preview it; remove submitted items (with undo),
 * drop reviewer-added ones, and add new files by picking or dragging them in.
 */
export function EvidenceManager({
  items,
  onChange,
  locked,
}: {
  items: EvidenceItem[];
  onChange: (items: EvidenceItem[]) => void;
  /** After a decision: preview only. */
  locked?: boolean;
}) {
  const [preview, setPreview] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const visible = items.filter((e) => !e.removed);
  const removed = items.filter((e) => e.removed);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    const ok = files.filter((f) => f.size <= MAX_MB * 1024 * 1024);
    setError(ok.length < files.length ? `${bnOf(files.length - ok.length)}টি ফাইল ${bnOf(MAX_MB)} MB-এর বেশি — বাদ দেওয়া হয়েছে।` : "");
    onChange([
      ...items,
      ...ok.map((file, i) => ({
        id: `add-${Date.now()}-${i}`,
        title: file.name,
        meta: "পর্যালোচক যোগ করেছেন",
        thumb: file.name.split(".").pop()?.toUpperCase() ?? "",
        file,
        url: URL.createObjectURL(file),
        added: true,
      })),
    ]);
  };

  const remove = (id: string) => {
    const e = items.find((x) => x.id === id);
    if (e?.added) {
      if (e.url) URL.revokeObjectURL(e.url);
      onChange(items.filter((x) => x.id !== id));
    } else {
      onChange(items.map((x) => (x.id === id ? { ...x, removed: true } : x)));
    }
  };
  const restore = (id: string) => onChange(items.map((x) => (x.id === id ? { ...x, removed: false } : x)));

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-[10.5px] font-semibold tracking-[0.05em] text-muted">সংযুক্ত প্রমাণ · EVIDENCE</div>
        <span className="text-[11px] text-muted">প্রিভিউ দেখতে ক্লিক করুন</span>
      </div>

      <ul className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
        {visible.map((e) => {
          const kind = kindOf(e);
          return (
            <li key={e.id} className="group relative overflow-hidden rounded-card border border-line bg-white hover:border-primary">
              <button type="button" onClick={() => setPreview(visible.indexOf(e))} className="block w-full cursor-pointer text-left" aria-label={`${e.title} প্রিভিউ`}>
                <div className="flex h-[88px] items-center justify-center overflow-hidden border-b border-line bg-surface text-[11px] text-muted">
                  {kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                    <img src={e.url} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-primary">
                      <DocGlyph size={20} />
                      <span className="text-[11px] text-muted">{e.thumb}</span>
                    </span>
                  )}
                </div>
                <div className="px-[11px] py-2.5">
                  <div className="truncate text-[12px] font-semibold leading-[1.55]" title={e.title}>
                    {e.title}
                  </div>
                  <div className={`mt-1 text-[10.5px] leading-[1.55] ${e.added ? "font-semibold text-role-reviewer" : "text-muted"}`}>{e.meta}</div>
                </div>
              </button>
              {!locked && (
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  aria-label={`${e.title} সরান`}
                  className="absolute top-1.5 right-1.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-white/95 text-ink shadow-card hover:text-danger"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </li>
          );
        })}

        {!locked && (
          <li>
            <label
              onDragOver={(ev) => {
                ev.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(ev: DragEvent) => {
                ev.preventDefault();
                setDragging(false);
                addFiles(ev.dataTransfer.files);
              }}
              className={`flex h-full min-h-[146px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border-[1.5px] border-dashed p-3 text-center hover:border-primary hover:bg-[#EFF7F4] ${
                dragging ? "border-primary bg-[#EFF7F4]" : "border-line bg-surface"
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="#006A4E" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span className="text-[12px] font-semibold text-primary">প্রমাণ যোগ করুন</span>
              <span className="text-[10.5px] leading-[1.5] text-muted">ছবি, ভিডিও, অডিও, PDF · টেনে আনুন বা বেছে নিন</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*,application/pdf,.docx"
                className="sr-only"
                onChange={(ev) => {
                  addFiles(ev.target.files);
                  ev.target.value = "";
                }}
              />
            </label>
          </li>
        )}
      </ul>

      {error && <p className="mt-2 text-[11.5px] font-semibold text-danger">{error}</p>}

      {removed.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {removed.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-button border border-dashed border-line px-3 py-2 text-[12px]">
              <span className="text-muted line-through">{e.title}</span>
              <span className="text-[11px] font-semibold text-danger">সরানো হয়েছে</span>
              <span className="min-w-2 flex-1" />
              {!locked && (
                <button type="button" onClick={() => restore(e.id)} className="cursor-pointer text-[12px] font-semibold text-primary hover:underline">
                  ফিরিয়ে আনুন
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {preview !== null && visible[preview] && (
        <PreviewModal items={visible} index={preview} onIndex={setPreview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

/** Full-screen evidence preview with previous/next; Escape or the backdrop closes it. */
function PreviewModal({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: EvidenceItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const e = items[index];
  const kind = kindOf(e);
  const prev = () => onIndex((index - 1 + items.length) % items.length);
  const next = () => onIndex((index + 1) % items.length);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
      if (ev.key === "ArrowLeft") prev();
      if (ev.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div role="dialog" aria-modal="true" aria-label={e.title} className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-[880px] flex-col overflow-hidden rounded-card bg-white shadow-card" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">{e.title}</div>
            <div className="text-[11.5px] text-muted">
              {e.meta} · {bnOf(index + 1)}/{bnOf(items.length)}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="বন্ধ করুন" className="flex size-8 cursor-pointer items-center justify-center rounded-button text-muted hover:bg-surface hover:text-ink">
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-auto bg-surface">
          {kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img src={e.url} alt={e.title} className="max-h-[70vh] max-w-full object-contain" />
          )}
          {kind === "pdf" && <iframe src={e.url} title={e.title} className="h-[70vh] w-full border-0 bg-white" />}
          {kind === "video" && <video src={e.url} controls className="max-h-[70vh] max-w-full" />}
          {kind === "audio" && <audio src={e.url} controls className="w-[90%]" />}
          {kind === "file" && (
            <div className="flex flex-col items-center gap-3 p-8 text-center text-muted">
              <DocGlyph size={40} />
              <p className="text-[13px]">এই ফাইলের প্রিভিউ দেখানো যায় না।</p>
              <a href={e.url} download={e.title} className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13px] font-semibold text-white hover:bg-primary-hover">
                ফাইলটি খুলুন
              </a>
            </div>
          )}
          {kind === "sample" && (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="text-primary">
                <DocGlyph size={44} />
              </span>
              <div className="text-[15px] font-semibold">{e.thumb}</div>
              <p className="max-w-[420px] text-[12.5px] leading-[1.7] text-muted text-pretty">
                নমুনা তথ্য — আসল ফাইল সংযুক্ত হলে এখানেই ছবি, নথি, ভিডিও বা অডিও দেখা যাবে।
              </p>
            </div>
          )}

          {items.length > 1 && (
            <>
              <button type="button" onClick={prev} aria-label="আগেরটি" className="absolute left-3 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/95 text-ink shadow-card hover:text-primary">
                ‹
              </button>
              <button type="button" onClick={next} aria-label="পরেরটি" className="absolute right-3 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/95 text-ink shadow-card hover:text-primary">
                ›
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
