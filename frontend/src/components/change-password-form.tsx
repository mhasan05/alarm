"use client";

import { useState } from "react";
import { Field, inputClass } from "./form";
import { useSession } from "@/lib/auth-client";
import { changePassword } from "@/lib/db/actions";
import { MIN_PASSWORD_SCORE, passwordBand, passwordScore } from "@/lib/password";

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex items-center">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className={`${inputClass} pr-[74px] ${invalid ? "border-danger!" : ""}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        aria-label={show ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
        className="absolute right-1.5 h-8 cursor-pointer rounded-input border border-line bg-surface px-2.5 text-[12px] font-semibold text-muted hover:border-primary hover:text-primary"
      >
        {show ? "লুকান" : "দেখান"}
      </button>
    </div>
  );
}

/** Change password: current password, a strong new one (strength meter) and confirmation. */
export function ChangePasswordForm() {
  const session = useSession();
  const [serverError, setServerError] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [saved, setSaved] = useState(false);

  const band = passwordBand(next);
  const currentOk = current.length > 0;
  const strongOk = passwordScore(next) >= MIN_PASSWORD_SCORE;
  const differentOk = !next || next !== current;
  const confirmOk = !!confirm && confirm === next;
  const ready = currentOk && strongOk && differentOk && confirmOk;

  const blocker = !currentOk
    ? "বর্তমান পাসওয়ার্ড লিখুন।"
    : !strongOk
      ? "একটি শক্তিশালী পাসওয়ার্ড দিন — কমপক্ষে ১২ অক্ষর, বড়-ছোট হরফ ও সংখ্যা মিলিয়ে।"
      : !differentOk
        ? "নতুন পাসওয়ার্ড বর্তমান পাসওয়ার্ডের মতো হতে পারবে না।"
        : !confirmOk
          ? "দুটি পাসওয়ার্ড মিলছে না — আবার লিখুন।"
          : "";

  return (
    <form
      noValidate
      className="flex flex-col gap-[18px]"
      onSubmit={(e) => {
        e.preventDefault();
        setAttempted(true);
        if (!ready || !session) return;
        const err = changePassword(session.userId, current, next);
        if (err) {
          setServerError(err);
          return;
        }
        setServerError("");
        setSaved(true);
        setAttempted(false);
        setCurrent("");
        setNext("");
        setConfirm("");
      }}
    >
      {saved && (
        <div role="status" className="flex items-start gap-2.5 rounded-card border border-l-[3px] border-line border-l-success bg-surface px-3.5 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 flex-none">
            <path d="m5 12.5 4.5 4.5L19 7.5" stroke="#1A7A4A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-[12.5px] leading-[1.65]">
            <span className="font-semibold">পাসওয়ার্ড পরিবর্তন হয়েছে।</span> পরের বার নতুন পাসওয়ার্ড দিয়ে লগইন করুন।
          </p>
        </div>
      )}

      {serverError && (
        <p role="alert" className="rounded-button bg-danger/8 px-3 py-2.5 text-[12.5px] text-danger">
          {serverError}
        </p>
      )}

      <Field id="pw-current" label="বর্তমান পাসওয়ার্ড" required>
        <PasswordInput
          id="pw-current"
          value={current}
          onChange={(v) => {
            setCurrent(v);
            setSaved(false);
            setServerError("");
          }}
          autoComplete="current-password"
          placeholder="••••••••••"
          invalid={attempted && !currentOk}
        />
      </Field>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[18px]">
        <Field
          id="pw-new"
          label="নতুন পাসওয়ার্ড"
          required
          hint={!differentOk ? "বর্তমান পাসওয়ার্ডের মতো হতে পারবে না" : undefined}
          hintClassName="text-danger"
        >
          <PasswordInput
            id="pw-new"
            value={next}
            onChange={(v) => {
              setNext(v);
              setSaved(false);
            }}
            autoComplete="new-password"
            placeholder="কমপক্ষে ১২ অক্ষর"
            invalid={attempted && (!strongOk || !differentOk)}
          />
          <div className="flex items-center gap-[9px]">
            <div className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-[3px] bg-[#E3EEEA]">
              <div className="h-full transition-[width]" style={{ width: band.pct, background: band.color }} />
            </div>
            <span className="flex-none text-[11.5px] font-semibold" style={{ color: band.color }}>
              {band.label}
            </span>
          </div>
        </Field>

        <Field
          id="pw-confirm"
          label="নতুন পাসওয়ার্ড নিশ্চিত করুন"
          required
          hint={confirm ? (confirmOk ? "✓ পাসওয়ার্ড মিলেছে" : "পাসওয়ার্ড মিলছে না") : undefined}
          hintClassName={confirmOk ? "text-success" : "text-danger"}
        >
          <PasswordInput
            id="pw-confirm"
            value={confirm}
            onChange={(v) => {
              setConfirm(v);
              setSaved(false);
            }}
            autoComplete="new-password"
            placeholder="আবার লিখুন"
            invalid={(!!confirm && !confirmOk) || (attempted && !confirm)}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <p
          role="status"
          className={`min-w-[200px] flex-1 text-[11.5px] leading-[1.65] text-pretty ${attempted && blocker ? "text-danger" : "text-muted"}`}
        >
          {attempted && blocker ? blocker : "নিরাপত্তার জন্য পাসওয়ার্ড পরিবর্তনের পর অন্য সব ডিভাইস থেকে লগ আউট হয়ে যাবে।"}
        </p>
        <button
          type="submit"
          className="h-11 flex-none cursor-pointer rounded-button bg-primary px-[22px] text-[14px] font-semibold text-white hover:bg-primary-hover"
        >
          পাসওয়ার্ড পরিবর্তন করুন
        </button>
      </div>
    </form>
  );
}
