"use client";

import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { bnOf } from "@/lib/geo";

type Evidence = { id: string; file: File; url: string };

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Evidence files chosen for a submission, with image previews. Defaults: 10 files, 10 MB each. */
export function useEvidenceFiles({ maxFiles = 10, maxMB = 10 }: { maxFiles?: number; maxMB?: number } = {}) {
  const maxBytes = maxMB * 1024 * 1024;
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  // Object URLs for image previews, released when the list changes or on unmount.
  const items: Evidence[] = useMemo(
    () =>
      files.map((file, i) => ({
        id: `${file.name}-${file.size}-${i}`,
        file,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      })),
    [files],
  );
  useEffect(() => () => items.forEach((e) => e.url && URL.revokeObjectURL(e.url)), [items]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const chosen = Array.from(list);
    const tooBig = chosen.filter((f) => f.size > maxBytes);
    const ok = chosen.filter((f) => f.size <= maxBytes);
    const room = maxFiles - files.length;
    setFiles((prev) => [...prev, ...ok.slice(0, room)]);
    setError(
      tooBig.length
        ? `${bnOf(tooBig.length)}টি ফাইল ${bnOf(maxMB)} MB-এর বেশি — বাদ দেওয়া হয়েছে।`
        : ok.length > room
          ? `সর্বোচ্চ ${bnOf(maxFiles)}টি ফাইল সংযুক্ত করা যাবে।`
          : "",
    );
  };

  const remove = (index: number) => setFiles((fs) => fs.filter((_, j) => j !== index));
  const reset = () => {
    setFiles([]);
    setError("");
  };

  return { items, error, add, remove, reset };
}

/** Dashed drop zone: click to open a multi-file picker, or drag files onto it. */
export function EvidenceDropzone({
  icon,
  title,
  note,
  children,
  onFiles,
  accept = "image/*,application/pdf",
  invalid,
  className = "",
}: {
  icon: ReactNode;
  title: ReactNode;
  note?: ReactNode;
  /** Extra content under the title (e.g. accepted file-type chips). */
  children?: ReactNode;
  onFiles: (files: FileList | null) => void;
  accept?: string;
  invalid?: boolean;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed p-3.5 text-center hover:border-primary hover:bg-[#EFF7F4] ${
        dragging ? "border-primary bg-[#EFF7F4]" : invalid ? "border-danger bg-surface" : "border-line bg-surface"
      } ${className}`}
    >
      {icon}
      <span className="text-[12.5px] font-semibold leading-[1.6] text-primary">{title}</span>
      {children}
      {note && <span className="text-[11px] leading-[1.6] text-muted text-pretty">{note}</span>}
      <input
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

/** Grid of chosen files: image thumbnails or a document tile, each removable. */
export function EvidenceList({
  items,
  error,
  onRemove,
}: {
  items: Evidence[];
  error: string;
  onRemove: (index: number) => void;
}) {
  if (!items.length && !error) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {items.length > 0 && <div className="text-[12px] font-semibold text-muted">সংযুক্ত প্রমাণ · {bnOf(items.length)}টি</div>}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {items.map((e, i) => (
          <li key={e.id} className="relative overflow-hidden rounded-card border border-line bg-white">
            {e.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={e.url} alt={e.file.name} className="h-[96px] w-full object-cover" />
            ) : (
              <div className="flex h-[96px] w-full flex-col items-center justify-center gap-1 bg-surface text-primary">
                <svg width="24" height="24" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3.2 1.6h6.3l3.3 3.3v9.5H3.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M9.3 1.8v3.4h3.3" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                <span className="text-[10.5px] font-semibold uppercase">{e.file.name.split(".").pop()}</span>
              </div>
            )}
            <div className="px-2.5 py-2">
              <div className="truncate text-[11.5px] font-semibold" title={e.file.name}>
                {e.file.name}
              </div>
              <div className="text-[10.5px] text-muted">{formatSize(e.file.size)}</div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`${e.file.name} সরান`}
              className="absolute top-1.5 right-1.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink shadow-card hover:text-danger"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-[11.5px] font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Thumbnail label for an uploaded file, e.g. "ছবি", "নথি · PDF". */
export function evidenceKind(file: File) {
  if (file.type.startsWith("image/")) return "ছবি";
  if (file.type.startsWith("video/")) return "ভিডিও";
  if (file.type.startsWith("audio/")) return "অডিও";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "নথি · PDF";
  return "নথি";
}

/** Uploaded files as evidence records (the files themselves go to storage once the backend exists). */
export const filesToEvidence = (items: { file: File }[], meta: string) =>
  items.map(({ file }) => ({ kind: evidenceKind(file), title: file.name, meta }));
