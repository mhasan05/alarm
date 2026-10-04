"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { inputClass } from "@/components/form";
import { normalisePhone, phoneBn } from "@/lib/db/format";
import { createOrg, resetAdminPassword } from "@/lib/db/super";
import { useRoot } from "@/lib/db/store";
import { MIN_PASSWORD_SCORE, passwordBand, passwordScore } from "@/lib/password";

type Done = { orgName: string; name: string; id: string; phone: string; password: string; reset: boolean };

function Row({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="text-[12.5px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? <p className="text-[12px] text-danger">{error}</p> : hint ? <p className="text-[11.5px] text-muted">{hint}</p> : null}
    </div>
  );
}

/** Create a প্রধান নির্বাহী সম্পাদক with their own separate system, or reset an admin's password. */
export function NewAdminForm({ resetOrg }: { resetOrg: string | null }) {
  const root = useRoot();
  const org = resetOrg ? root.orgs.find((o) => o.id === resetOrg) : undefined;
  const orgAdmin = org?.db.admins.find((a) => a.id === org.adminId);
  const resetting = !!resetOrg;

  const [orgName, setOrgName] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  const strong = passwordScore(password) >= MIN_PASSWORD_SCORE;
  const band = passwordBand(password);
  const errors = {
    orgName: resetting || orgName.trim().length >= 3 ? "" : "প্রতিষ্ঠানের নাম লিখুন।",
    nameBn: resetting || nameBn.trim().length >= 3 ? "" : "বাংলায় পূর্ণ নাম লিখুন।",
    phone: resetting || normalisePhone(phone) ? "" : "সঠিক মোবাইল নম্বর দিন — যেমন 01711-234567।",
    email: resetting || !email.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ? "" : "সঠিক ইমেইল দিন।",
    password: strong ? "" : "শক্তিশালী পাসওয়ার্ড দিন — কমপক্ষে ১২ অক্ষর, বড়-ছোট হরফ ও সংখ্যা মিলিয়ে।",
  };
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : "");
  const valid = Object.values(errors).every((e) => !e);

  const submit = () => {
    setSubmitted(true);
    setServerError("");
    if (!valid) return;
    if (resetting) {
      if (!org || !orgAdmin) return;
      resetAdminPassword(org.id, password);
      setDone({ orgName: org.name, name: orgAdmin.nameBn ?? orgAdmin.name, id: orgAdmin.id, phone: orgAdmin.phone, password, reset: true });
      return;
    }
    const p = normalisePhone(phone);
    const r = createOrg({ orgName, adminName: name, adminNameBn: nameBn, phone: p, email, password });
    if (!r.ok) return setServerError(r.error);
    setDone({ orgName: orgName.trim(), name: nameBn.trim(), id: r.adminId, phone: p, password, reset: false });
  };

  if (resetting && !org) {
    return (
      <>
        <PageHeader backHref="/super/dashboard" crumb="সুপার অ্যাডমিন পোর্টাল" title="পাসওয়ার্ড রিসেট" />
        <div className="px-4 pt-[22px] sm:px-7">
          <p className="rounded-card border border-line bg-white px-5 py-6 text-center text-[13px] text-muted shadow-card">
            প্রতিষ্ঠানটি পাওয়া যায়নি।{" "}
            <Link href="/super/dashboard" className="font-semibold text-primary">
              তালিকায় ফিরুন
            </Link>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader backHref="/super/dashboard" crumb="সুপার অ্যাডমিন পোর্টাল" title={resetting ? "পাসওয়ার্ড রিসেট" : "নতুন প্রধান নির্বাহী সম্পাদক"} />
      <div className="flex flex-1 flex-col px-4 pt-[22px] pb-9 sm:px-7">
        <div className="w-full max-w-[640px]">
          {done ? (
            <section className="overflow-hidden rounded-card border border-line bg-white shadow-card" role="status">
              <div className="border-b border-line bg-success/8 px-6 py-5">
                <h2 className="text-[16px] font-semibold text-ink">{done.reset ? "নতুন অস্থায়ী পাসওয়ার্ড দেওয়া হয়েছে" : "প্রধান নির্বাহী সম্পাদক ও তাঁর সিস্টেম তৈরি হয়েছে"}</h2>
                <p className="mt-1 text-[13px] leading-[1.7] text-muted">
                  {done.reset ? "এই তথ্য গোপনে জানিয়ে দিন। পাসওয়ার্ডটি শুধু এখনই দেখানো হচ্ছে।" : `${done.orgName} — একটি নতুন, আলাদা সিস্টেম। এখানে তিনি নিজের নির্বাহী সম্পাদক, তদন্ত সম্পাদক ও রাজনৈতিক কর্মী যোগ করবেন। তথ্যগুলো গোপনে জানিয়ে দিন; পাসওয়ার্ডটি শুধু এখনই দেখানো হচ্ছে।`}
                </p>
              </div>
              <dl className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                {[
                  ["নাম", done.name],
                  ["ALARM আইডি", done.id],
                  ["মোবাইল নম্বর", phoneBn(done.phone)],
                  ["প্রথম পাসওয়ার্ড", done.password],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11.5px] text-muted">{k}</dt>
                    <dd className="mt-0.5 break-all font-mono text-[15px] font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2.5 border-t border-line px-6 py-4">
                <Link href="/super/dashboard" className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
                  তালিকায় ফিরুন
                </Link>
                {!done.reset && (
                  <button
                    type="button"
                    onClick={() => {
                      setDone(null);
                      setSubmitted(false);
                      setOrgName("");
                      setNameBn("");
                      setName("");
                      setPhone("");
                      setEmail("");
                      setPassword("");
                    }}
                    className="h-10 cursor-pointer rounded-button border border-line px-4 text-[13.5px] font-semibold text-muted hover:text-ink"
                  >
                    আরেকজন যোগ করুন
                  </button>
                )}
              </div>
            </section>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex flex-col gap-4 rounded-card border border-line bg-white px-6 py-6 shadow-card"
            >
              {resetting ? (
                <p className="rounded-button bg-surface px-4 py-3 text-[13px] text-ink">
                  <strong className="font-semibold">{orgAdmin?.nameBn ?? orgAdmin?.name}</strong> · {org?.name} · {orgAdmin?.id}
                </p>
              ) : (
                <>
                  <p className="text-[13px] leading-[1.7] text-muted">প্রত্যেক প্রধান নির্বাহী সম্পাদক একটি নতুন, সম্পূর্ণ আলাদা সিস্টেম পান। অন্য কোনো প্রধান নির্বাহী সম্পাদকের তথ্য তিনি দেখতে পাবেন না, তাঁর তথ্যও অন্য কেউ দেখবেন না।</p>
                  <Row id="sa-org" label="প্রতিষ্ঠান / সিস্টেমের নাম" error={show("orgName")} hint="যেমন: ALARM চট্টগ্রাম">
                    <input id="sa-org" value={orgName} onChange={(e) => setOrgName(e.target.value)} className={`${inputClass} ${show("orgName") ? "border-danger!" : ""}`} />
                  </Row>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Row id="sa-name-bn" label="পূর্ণ নাম (বাংলায়)" error={show("nameBn")}>
                      <input id="sa-name-bn" value={nameBn} onChange={(e) => setNameBn(e.target.value)} className={`${inputClass} ${show("nameBn") ? "border-danger!" : ""}`} />
                    </Row>
                    <Row id="sa-name" label="পূর্ণ নাম (ইংরেজিতে)" hint="না দিলেও চলবে">
                      <input id="sa-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                    </Row>
                    <Row id="sa-phone" label="মোবাইল নম্বর (লগইনের জন্য)" error={show("phone") || serverError}>
                      <input
                        id="sa-phone"
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setServerError("");
                        }}
                        placeholder="01711-234567"
                        className={`${inputClass} ${show("phone") || serverError ? "border-danger!" : ""}`}
                      />
                    </Row>
                    <Row id="sa-email" label="ইমেইল" error={show("email")} hint="না দিলেও চলবে">
                      <input id="sa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={`${inputClass} ${show("email") ? "border-danger!" : ""}`} />
                    </Row>
                  </div>
                </>
              )}
              <Row id="sa-password" label={resetting ? "নতুন অস্থায়ী পাসওয়ার্ড" : "প্রথম পাসওয়ার্ড"} error={show("password")} hint="প্রথম লগইনের পর সেটিংস থেকে বদলে নিতে বলুন।">
                <input id="sa-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={`${inputClass} font-mono ${show("password") ? "border-danger!" : ""}`} />
                {password && (
                  <div className="flex items-center gap-3">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                      <div className="h-full rounded-full" style={{ width: band.pct, background: band.color }} />
                    </div>
                    <span className="text-[11.5px]" style={{ color: band.color }}>
                      {band.label}
                    </span>
                  </div>
                )}
              </Row>
              {submitted && !valid && <p role="alert" className="rounded-button bg-danger/8 px-3 py-2.5 text-[12.5px] text-danger">কিছু তথ্য ঠিক করতে হবে।</p>}
              <div className="flex flex-wrap gap-2.5">
                <button type="submit" className="h-11 cursor-pointer rounded-button bg-primary px-6 text-[14px] font-semibold text-white hover:bg-primary-hover">
                  {resetting ? "পাসওয়ার্ড দিন" : "অ্যাকাউন্ট ও সিস্টেম তৈরি করুন"}
                </button>
                <Link href="/super/dashboard" className="inline-flex h-11 items-center px-3 text-[14px] font-semibold text-muted hover:text-ink">
                  বাতিল
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
