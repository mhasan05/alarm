"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputClass } from "@/components/form";
import { resetPasswordWithOtp } from "@/lib/db/actions";
import { bn, normalisePhone, phoneMasked } from "@/lib/db/format";
import { getDb } from "@/lib/db/store";
import { newOtp, OTP_LENGTH, OTP_MAX_TRIES, OTP_RESEND_MS, OTP_TTL_MS, smsGateway } from "@/lib/otp";
import { MIN_PASSWORD_SCORE, passwordBand, passwordScore } from "@/lib/password";
import { useNow } from "@/lib/use-client";

type Step = "phone" | "otp" | "password";
type Pending = { phone: string; code: string; expires: number; sentAt: number; tries: number; delivered: boolean };

const STEPS: { key: Step; label: string }[] = [
  { key: "phone", label: "মোবাইল নম্বর" },
  { key: "otp", label: "ওটিপি যাচাই" },
  { key: "password", label: "নতুন পাসওয়ার্ড" },
];

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Drives the "resend" countdown.
  const now = useNow(1000);

  const send = async (number: string) => {
    const code = newOtp();
    const { delivered } = await smsGateway.send(number, `ALARM: আপনার পাসওয়ার্ড পুনরুদ্ধার কোড ${code}। কোডটি ৫ মিনিট কার্যকর থাকবে।`);
    const at = Date.now();
    setPending({ phone: number, code, expires: at + OTP_TTL_MS, sentAt: at, tries: 0, delivered });
    setOtp("");
    setError("");
  };

  const submitPhone = async () => {
    const number = normalisePhone(phone);
    if (!number) return setError("সঠিক মোবাইল নম্বর দিন — যেমন 01711-234567।");
    if (!getDb().users.some((u) => u.phone === number)) return setError("এই মোবাইল নম্বরে কোনো অ্যাকাউন্ট নেই। অ্যাকাউন্ট তৈরির সময় দেওয়া নম্বরটি দিন।");
    setBusy(true);
    await send(number);
    setBusy(false);
    setStep("otp");
  };

  const submitOtp = () => {
    if (!pending) return;
    if (Date.now() > pending.expires) return setError("কোডের মেয়াদ শেষ হয়েছে — নতুন কোড নিন।");
    if (pending.tries >= OTP_MAX_TRIES) return setError("অনেকবার ভুল কোড দেওয়া হয়েছে — নতুন কোড নিন।");
    if (otp.trim() !== pending.code) {
      const tries = pending.tries + 1;
      setPending({ ...pending, tries });
      const left = OTP_MAX_TRIES - tries;
      return setError(left > 0 ? `কোডটি সঠিক নয়। আর ${bn(left)} বার চেষ্টা করতে পারবেন।` : "অনেকবার ভুল কোড দেওয়া হয়েছে — নতুন কোড নিন।");
    }
    setError("");
    setStep("password");
  };

  const strongOk = passwordScore(pw) >= MIN_PASSWORD_SCORE;
  const submitPassword = () => {
    if (!pending) return;
    if (!strongOk) return setError("একটি শক্তিশালী পাসওয়ার্ড দিন — কমপক্ষে ১২ অক্ষর, বড়-ছোট হরফ ও সংখ্যা মিলিয়ে।");
    if (pw !== pw2) return setError("দুটি পাসওয়ার্ড মেলেনি।");
    const err = resetPasswordWithOtp(pending.phone, pw);
    if (err) return setError(err);
    router.replace("/login?reset=1");
  };

  const index = STEPS.findIndex((s) => s.key === step);
  const resendIn = pending && now ? Math.max(0, Math.ceil((pending.sentAt + OTP_RESEND_MS - now) / 1000)) : 0;
  const band = passwordBand(pw);

  return (
    <div className="mt-6">
      <ol className="mb-6 flex items-center gap-2" aria-label="ধাপ">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span
              aria-current={i === index ? "step" : undefined}
              className={`flex size-7 flex-none items-center justify-center rounded-full text-[12.5px] font-semibold ${i < index ? "bg-success text-white" : i === index ? "bg-primary text-white" : "bg-surface text-muted ring-1 ring-line"}`}
            >
              {i < index ? "✓" : bn(i + 1)}
            </span>
            <span className={`hidden text-[11.5px] sm:inline ${i === index ? "font-semibold text-ink" : "text-muted"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="h-px min-w-3 flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      {step === "phone" && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submitPhone();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="fp-phone" className="text-[12.5px] font-semibold text-ink">
              আপনার মোবাইল নম্বর
            </label>
            <input
              id="fp-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="যেমন 01711-234567"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError("");
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "fp-error" : undefined}
              className={`${inputClass} ${error ? "border-danger!" : ""}`}
            />
            <p className="text-[11.5px] leading-[1.6] text-muted">অ্যাকাউন্টের সাথে যুক্ত নম্বরে একটি ৬ সংখ্যার কোড পাঠানো হবে।</p>
          </div>
          <ErrorLine text={error} />
          <button type="submit" disabled={busy} className="h-[46px] w-full cursor-pointer rounded-button bg-primary text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70">
            {busy ? "কোড পাঠানো হচ্ছে…" : "কোড পাঠান"}
          </button>
        </form>
      )}

      {step === "otp" && pending && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submitOtp();
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-[13px] leading-[1.7] text-ink">
            <span className="font-sans font-semibold">{phoneMasked(pending.phone)}</span> নম্বরে ৬ সংখ্যার কোড পাঠানো হয়েছে। কোডটি ৫ মিনিট কার্যকর থাকবে।
          </p>
          {!pending.delivered && (
            <p role="note" className="rounded-button border border-l-[3px] border-line border-l-warning bg-warning/5 px-3.5 py-2.5 text-[12px] leading-[1.7] text-ink">
              এসএমএস সেবা এখনও যুক্ত হয়নি, তাই পরীক্ষার জন্য কোডটি এখানে দেখানো হলো:{" "}
              <span className="font-mono text-[14px] font-bold tracking-[0.2em] text-primary">{pending.code}</span>
            </p>
          )}
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="fp-otp" className="text-[12.5px] font-semibold text-ink">
              ওটিপি কোড
            </label>
            <input
              id="fp-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              placeholder="••••••"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
                setError("");
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "fp-error" : undefined}
              className={`${inputClass} text-center font-mono text-[20px] tracking-[0.5em] ${error ? "border-danger!" : ""}`}
            />
          </div>
          <ErrorLine text={error} />
          <button type="submit" disabled={otp.length !== OTP_LENGTH} className="h-[46px] w-full cursor-pointer rounded-button bg-primary text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
            যাচাই করুন
          </button>
          <div className="flex items-center justify-between text-[12.5px]">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setPending(null);
                setError("");
              }}
              className="cursor-pointer text-muted hover:text-primary"
            >
              ← নম্বর পরিবর্তন
            </button>
            <button type="button" disabled={resendIn > 0} onClick={() => send(pending.phone)} className="cursor-pointer font-semibold text-primary hover:text-primary-hover disabled:cursor-not-allowed disabled:font-normal disabled:text-muted">
              {resendIn > 0 ? `আবার পাঠান (${bn(resendIn)} সেকেন্ড)` : "আবার কোড পাঠান"}
            </button>
          </div>
        </form>
      )}

      {step === "password" && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submitPassword();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="fp-pass" className="text-[12.5px] font-semibold text-ink">
              নতুন পাসওয়ার্ড
            </label>
            <div className="relative flex items-center">
              <input
                id="fp-pass"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                placeholder="কমপক্ষে ১২ অক্ষর"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setError("");
                }}
                className={`${inputClass} pr-[74px]`}
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
            <div className="flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                <div className="h-full rounded-full transition-all" style={{ width: band.pct, background: band.color }} />
              </div>
              <span className="text-[11.5px]" style={{ color: band.color }}>
                {band.label}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="fp-pass2" className="text-[12.5px] font-semibold text-ink">
              নতুন পাসওয়ার্ড আবার লিখুন
            </label>
            <input
              id="fp-pass2"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="আবার লিখুন"
              value={pw2}
              onChange={(e) => {
                setPw2(e.target.value);
                setError("");
              }}
              className={inputClass}
            />
          </div>
          <ErrorLine text={error} />
          <button type="submit" className="h-[46px] w-full cursor-pointer rounded-button bg-primary text-[14.5px] font-semibold text-white hover:bg-primary-hover">
            পাসওয়ার্ড সংরক্ষণ করুন
          </button>
        </form>
      )}
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p id="fp-error" role="alert" className="rounded-button bg-danger/8 px-3 py-2.5 text-[12.5px] leading-relaxed text-danger">
      {text}
    </p>
  );
}
