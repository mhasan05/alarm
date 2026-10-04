"use client";

import { useEffect, useState } from "react";
import { EvidenceDropzone } from "./evidence";
import { bn } from "@/lib/db/format";
import type { Evidence } from "@/lib/db/types";
import { EVIDENCE_ACCEPT, filesToEvidence, isEvidenceFile, previewKind, sizeLabel, wrongTypeMessage } from "@/lib/evidence-files";

const MAX_FILES = 12;
const MAX_MB = 10;

function FileIcon({ kind }: { kind: string }) {
  const image = kind.startsWith("ছবি");
  return (
    <span className={`flex size-10 flex-none items-center justify-center rounded-button ${image ? "bg-role-reviewer/10 text-role-reviewer" : "bg-primary/10 text-primary"}`}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        {image ? (
          <>
            <rect x="2.8" y="4" width="14.4" height="12" rx="1.8" />
            <circle cx="7.4" cy="8.4" r="1.4" />
            <path d="m3.4 14.4 4-3.4 3.4 2.8 2.6-2 3.4 2.8" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <path d="M5 2.8h6.6L15 6.2v11H5z" strokeLinejoin="round" />
            <path d="M11.4 3v3.4H15M7.6 10.4h4.8M7.6 13.2h3.2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </span>
  );
}

/** Full-screen preview of one evidence item: the image or PDF itself, or a clear note when there is no file. */
export function EvidencePreview({ item, onClose }: { item: Evidence; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const kind = previewKind(item);
  return (
    <div role="dialog" aria-modal="true" aria-label={`প্রিভিউ: ${item.title}`} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-3 sm:p-6" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-[860px] flex-col overflow-hidden rounded-card bg-white shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <FileIcon kind={item.kind} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold text-ink">{item.title}</div>
            <div className="truncate text-[12px] text-muted">
              {item.kind} · {item.meta}
            </div>
          </div>
          {item.file?.data && (
            <a href={item.file.data} download={item.file.name} className="inline-flex h-9 items-center rounded-button border border-line px-3 text-[12.5px] font-semibold text-primary hover:border-primary">
              ডাউনলোড
            </a>
          )}
          <button type="button" onClick={onClose} aria-label="বন্ধ করুন" className="flex size-9 cursor-pointer items-center justify-center rounded-button text-muted hover:bg-surface hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex min-h-[260px] flex-1 items-center justify-center overflow-auto bg-surface">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
            <img src={item.file!.data} alt={item.title} className="max-h-[75vh] max-w-full object-contain" />
          ) : kind === "pdf" ? (
            <iframe src={item.file!.data} title={item.title} className="h-[75vh] w-full border-0 bg-white" />
          ) : kind === "video" ? (
            <video src={item.file!.data} controls className="max-h-[75vh] max-w-full bg-ink" />
          ) : kind === "audio" ? (
            <div className="w-full max-w-[480px] px-6 py-10">
              <audio src={item.file!.data} controls className="w-full" />
            </div>
          ) : (
            <div className="max-w-[420px] px-6 py-10 text-center">
              <div className="mx-auto w-fit">
                <FileIcon kind={item.kind} />
              </div>
              <p className="mt-3 text-[14px] font-semibold text-ink">এই ফাইলের প্রিভিউ এখানে দেখা যাচ্ছে না</p>
              <p className="mt-1 text-[12.5px] leading-[1.7] text-muted">
                {item.file
                  ? item.file.data
                    ? "এই ধরনের ফাইল ব্রাউজারে খোলা যায় না — ডাউনলোড করে দেখুন।"
                    : `ফাইলটি বড় (${sizeLabel(item.file.size)}) — সার্ভার যুক্ত হলে এখানেই খোলা যাবে।`
                  : "এটি নমুনা প্রমাণ — আসল ফাইল সার্ভার যুক্ত হলে এখানে দেখা যাবে।"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Evidence list with preview for everyone, and — when `onChange` is given — adding and removing files.
 * Used wherever evidence is shown or edited, so it behaves the same everywhere.
 */
export function EvidenceManager({ items, onChange, emptyText = "কোনো প্রমাণ দেওয়া নেই।", addedMeta = "আজ যোগ করা" }: { items: Evidence[]; onChange?: (items: Evidence[]) => void; emptyText?: string; addedMeta?: string }) {
  const [preview, setPreview] = useState<Evidence | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const editable = !!onChange;

  const add = async (list: FileList | null) => {
    if (!list || !onChange) return;
    const all = Array.from(list);
    const chosen = all.filter(isEvidenceFile);
    const wrongType = all.length - chosen.length;
    const tooBig = chosen.filter((f) => f.size > MAX_MB * 1024 * 1024);
    const room = MAX_FILES - items.length;
    const ok = chosen.filter((f) => f.size <= MAX_MB * 1024 * 1024).slice(0, Math.max(0, room));
    setError(wrongType ? wrongTypeMessage(wrongType) : tooBig.length ? `${bn(tooBig.length)}টি ফাইল ${bn(MAX_MB)} MB-এর বেশি — বাদ দেওয়া হয়েছে।` : chosen.length > room ? `সবচেয়ে বেশি ${bn(MAX_FILES)}টি ফাইল রাখা যাবে।` : "");
    if (!ok.length) return;
    setBusy(true);
    onChange([...items, ...(await filesToEvidence(ok, addedMeta))]);
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {items.length === 0 ? (
        <p className="rounded-button bg-surface px-4 py-5 text-center text-[13px] text-muted">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li key={it.id} className="relative flex items-center gap-3 rounded-button border border-line bg-white px-3 py-2.5 hover:border-primary/40 hover:bg-surface/40">
              <FileIcon kind={it.kind} />
              <button type="button" onClick={() => setPreview(it)} className="min-w-0 flex-1 cursor-pointer text-left after:absolute after:inset-0 after:content-['']">
                <span className="block truncate text-[13.5px] font-semibold text-ink">{it.title}</span>
                <span className="block truncate text-[12px] text-muted">
                  {it.kind} · {it.meta}
                </span>
              </button>
              <span className="relative z-10 hidden text-[12px] font-semibold text-primary sm:inline">দেখুন</span>
              {editable && (
                <button
                  type="button"
                  onClick={() => onChange!(items.filter((x) => x.id !== it.id))}
                  aria-label={`${it.title} সরান`}
                  className="relative z-10 flex h-8 cursor-pointer items-center rounded-button border border-line px-2.5 text-[12px] font-semibold text-danger hover:border-danger hover:bg-danger/5"
                >
                  সরান
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <EvidenceDropzone
          onFiles={add}
          accept={EVIDENCE_ACCEPT}
          icon={
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-primary">
              <path d="M10 13V3.6M6.4 7.2 10 3.6l3.6 3.6M3.6 13.2v2a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          title={busy ? "যোগ হচ্ছে…" : "ফাইল যোগ করুন — চাপ দিন বা টেনে আনুন"}
          note={`শুধু ছবি, PDF, ভিডিও বা অডিও · প্রতিটি ${bn(MAX_MB)} MB পর্যন্ত`}
        />
      )}
      {error && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
      {preview && <EvidencePreview item={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
