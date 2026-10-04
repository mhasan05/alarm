"use client";

// Turning chosen files into evidence records. Small files keep a data URL so they can be previewed in
// the browser; the backend will upload every file and hand back a URL instead.

import { bn } from "./db/format";
import type { Evidence } from "./db/types";

/** Evidence may only be an image, a PDF, a video or an audio file. Used for every file picker. */
export const EVIDENCE_ACCEPT = "image/*,application/pdf,video/*,audio/*";

export const isEvidenceFile = (f: { type: string; name: string }) =>
  f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/") || f.type === "application/pdf" || /\.pdf$/i.test(f.name);

/** The message shown when other kinds of files were chosen. */
export const wrongTypeMessage = (n: number) => `${bn(n)}টি ফাইল বাদ দেওয়া হয়েছে — শুধু ছবি, PDF, ভিডিও বা অডিও দেওয়া যাবে।`;

/** Files up to this size are kept for in-browser preview. */
export const PREVIEW_MAX_BYTES = 1024 * 1024;

export const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${bn((bytes / 1024 / 1024).toFixed(1))} MB` : `${bn(Math.max(1, Math.round(bytes / 1024)))} KB`);

/** The short type label shown on an evidence item. */
export function kindOf(type: string, name: string) {
  if (type.startsWith("image/")) return "ছবি";
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return "কাগজ · PDF";
  if (type.startsWith("video/")) return "ভিডিও";
  if (type.startsWith("audio/")) return "অডিও";
  return "ফাইল";
}

/** What kind of preview an evidence item can show. */
export function previewKind(e: Evidence): "image" | "pdf" | "video" | "audio" | "none" {
  if (!e.file?.data) return "none";
  if (e.file.type.startsWith("image/")) return "image";
  if (e.file.type === "application/pdf") return "pdf";
  if (e.file.type.startsWith("video/")) return "video";
  if (e.file.type.startsWith("audio/")) return "audio";
  return "none";
}

const readAsDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

const newId = () => `EV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

/** Evidence records for chosen files. `meta` describes where they came from (e.g. "আজ যোগ করা"). */
export async function filesToEvidence(files: File[], meta: string): Promise<Evidence[]> {
  return Promise.all(
    files.map(async (f) => ({
      id: newId(),
      kind: kindOf(f.type, f.name),
      title: f.name,
      meta: `${meta} · ${sizeLabel(f.size)}`,
      file: { name: f.name, type: f.type, size: f.size, data: f.size <= PREVIEW_MAX_BYTES ? await readAsDataUrl(f).catch(() => undefined) : undefined },
    })),
  );
}
