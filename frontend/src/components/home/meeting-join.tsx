"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CODE = /([a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4})/i;

const VideoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2.4 4.4h7.2v7.2H2.4zM9.6 7l4-2.4v6.8l-4-2.4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

/**
 * "ভার্চুয়াল সভায় যোগদান করুন": a button like the login button that opens a box for the meeting link
 * or code, then goes to the meeting page (where the ALARM ID is asked — no login needed).
 * `onDark` styles the button for the green phone hero.
 */
export function MeetingJoin({ id = "home-meet", onDark = false }: { id?: string; onDark?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className={`relative flex w-full cursor-pointer items-center justify-center gap-2 font-semibold active:scale-[0.99] ${
          onDark ? "h-[52px] rounded-[14px] border border-white/40 bg-white/10 text-[15px] text-white backdrop-blur-sm hover:bg-white/15" : "h-11 rounded-button border border-primary bg-white text-[14px] text-primary hover:bg-surface"
        }`}
      >
        <VideoIcon />
        ভার্চুয়াল সভায় যোগদান করুন
      </button>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const code = value.match(CODE)?.[1]?.toLowerCase();
        if (!code) return setError("সঠিক মিটিং লিংক বা কোড দিন — যেমন abcd-efgh-jkmn।");
        router.push(`/meet/${code}`);
      }}
      className={`relative ${onDark ? "rounded-[14px] bg-white p-4 text-ink shadow-[0_8px_20px_-10px_rgba(0,0,0,0.45)]" : "rounded-button border border-line bg-surface/50 p-3.5"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <span className="text-primary">
            <VideoIcon />
          </span>
          ভার্চুয়াল সভার লিংক বা কোড
        </label>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="cursor-pointer text-[12px] font-semibold text-muted hover:text-ink"
        >
          বন্ধ করুন
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          placeholder="abcd-efgh-jkmn"
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          className={`h-11 min-w-0 flex-1 rounded-input border bg-white px-3 font-mono text-[14px] outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,106,78,0.10)] ${error ? "border-danger" : "border-line"}`}
        />
        <button type="submit" className="h-11 flex-none cursor-pointer rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
          যোগ দিন
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[12px] text-danger">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-1.5 text-[12px] leading-[1.6] text-muted">
          লগইন লাগবে না — পরের ধাপে আপনার ALARM আইডি (KAR-…) দিন।
        </p>
      )}
    </form>
  );
}
