"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputClass } from "@/components/form";
import { login } from "@/lib/auth-client";
import { DEMO_PASSWORD } from "@/lib/db/seed";

export type DemoAccount = { phone: string; initials: string; bnInitials?: boolean; name: string; description: string; bnDescription?: boolean; fg: string; tint: string; hover: string };

export function LoginForm({ next, demo = [], notice }: { next?: string; demo?: DemoAccount[]; notice?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<{ text: string; field?: "phone" | "password"; blocked?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = (p: string, pw: string) => {
    setBusy(true);
    const result = login(p, pw, next);
    if (result.ok) {
      router.replace(result.to);
      router.refresh();
      return;
    }
    setBusy(false);
    setError({ text: result.error, field: result.field, blocked: result.blocked });
  };

  return (
    <>
      {notice && (
        <p role="status" className="mt-4 rounded-button border border-l-[3px] border-line border-l-success bg-success/5 px-3.5 py-2.5 font-bn text-[12.5px] leading-relaxed text-ink">
          {notice}
        </p>
      )}
      <form
        noValidate
        className="mt-[22px] flex flex-col gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!phone.trim()) return setError({ text: "মোবাইল নম্বর লিখুন।", field: "phone" });
          if (!password) return setError({ text: "পাসওয়ার্ড লিখুন।", field: "password" });
          signIn(phone, password);
        }}
      >
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="alarm-phone" className="text-[12.5px] font-semibold text-ink">
            মোবাইল নম্বর
          </label>
          <input
            id="alarm-phone"
            type="tel"
            inputMode="tel"
            autoComplete="username"
            placeholder="যেমন 01711-234567"
            value={phone}
            aria-invalid={error?.field === "phone"}
            aria-describedby={error ? "login-error" : undefined}
            onChange={(e) => {
              setPhone(e.target.value);
              setError(null);
            }}
            className={`${inputClass} ${error?.field === "phone" ? "border-danger!" : ""}`}
          />
        </div>

        <div className="flex flex-col gap-[7px]">
          <label htmlFor="alarm-pass" className="text-[12.5px] font-semibold text-ink">
            পাসওয়ার্ড
          </label>
          <div className="relative flex items-center">
            <input
              id="alarm-pass"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••"
              value={password}
              aria-invalid={error?.field === "password"}
              aria-describedby={error ? "login-error" : undefined}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className={`${inputClass} pr-[74px] ${error?.field === "password" ? "border-danger!" : ""}`}
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
          <div className="mt-px flex justify-end">
            <Link href="/forgot-password" className="text-[12.5px] text-muted hover:text-primary">
              পাসওয়ার্ড ভুলে গেছেন?
            </Link>
          </div>
        </div>

        {error && (
          <p id="login-error" role="alert" className={`rounded-button px-3 py-2.5 font-bn text-[12.5px] leading-relaxed ${error.blocked ? "bg-warning/10 text-ink" : "bg-danger/8 text-danger"}`}>
            {error.text}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-0.5 h-[46px] w-full cursor-pointer rounded-button bg-primary text-[14.5px] font-semibold tracking-[0.01em] text-white hover:bg-primary-hover active:bg-primary-active disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? "লগইন হচ্ছে…" : "লগইন করুন"}
        </button>
      </form>

      {demo.length > 0 && (
      <div className="mt-[34px] border-t border-line pt-[18px]">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[12px] font-semibold text-muted">ডেমো অ্যাকাউন্ট</div>
          <div className="text-[11px] text-muted">
            পাসওয়ার্ড <code className="rounded bg-surface px-1 font-mono text-[11px] text-ink">{DEMO_PASSWORD}</code>
          </div>
        </div>
        <div className="mt-2.5 flex flex-col gap-2">
          {demo.map((r) => (
            <button
              key={r.phone}
              type="button"
              disabled={busy}
              onClick={() => {
                setPhone(r.phone);
                setPassword(DEMO_PASSWORD);
                signIn(r.phone, DEMO_PASSWORD);
              }}
              className={`flex cursor-pointer items-center gap-[11px] rounded-button border border-line px-3 py-[11px] text-left ${r.hover}`}
            >
              <span className={`flex size-7 flex-none items-center justify-center rounded-full font-semibold ${r.fg} ${r.tint} ${r.bnInitials ? "font-bn text-[13px]" : "text-[10.5px]"}`}>
                {r.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink">{r.name}</span>
                <span className={`block text-[11px] text-muted ${r.bnDescription ? "mt-0.5 font-bn leading-[1.55]" : "mt-px"}`}>{r.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      )}
    </>
  );
}
