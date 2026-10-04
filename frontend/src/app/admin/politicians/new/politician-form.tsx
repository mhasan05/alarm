"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Field, inputClass, Required, selectClass } from "@/components/form";
import { createProfile } from "@/lib/db/actions";
import { bn, normalisePhone, phoneIntl } from "@/lib/db/format";
import { MIN_PASSWORD_SCORE, passwordBand, passwordScore } from "@/lib/password";
import { locateArea } from "@/lib/geo";
import { useGeoCascade } from "@/lib/use-geo-cascade";

const POSTS = [
  "ওয়ার্ড কাউন্সিলর",
  "সংরক্ষিত আসনের কাউন্সিলর",
  "পৌর মেয়র",
  "সিটি কর্পোরেশন মেয়র",
  "ইউপি সদস্য",
  "ইউনিয়ন পরিষদ চেয়ারম্যান",
  "উপজেলা চেয়ারম্যান",
  "উপজেলা ভাইস চেয়ারম্যান",
  "সংসদ সদস্য",
  "দলীয় নেতা / কর্মী",
];

const THIS_YEAR = new Date().getFullYear();

const bdDigits = (v: string) => v.replace(/\D/g, "").replace(/^880/, "").replace(/^0/, "");
const phoneOk = (v: string) => /^1[3-9]\d{8}$/.test(bdDigits(v));
const nidOk = (v: string) => [10, 17].includes(v.replace(/\D/g, "").length);
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** 14 characters from a set without look-alikes, with each class guaranteed. */
function generatePassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%*?"];
  const all = sets.join("");
  const rnd = new Uint32Array(14);
  crypto.getRandomValues(rnd);
  const chars = Array.from(rnd, (n, i) => (i < 4 ? sets[i] : all)[n % (i < 4 ? sets[i].length : all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** "1974-03-12" → "১২ মার্চ ১৯৭৪", the format profiles store. */
const bnDob = (iso: string) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00+06:00`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("bn-BD", { ...o, timeZone: "Asia/Dhaka" }).format(d);
  return `${f({ day: "2-digit" })} ${f({ month: "long" })} ${f({ year: "numeric" })}`;
};

function Card({ num, title, sub, children }: { num: string; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white shadow-card">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="flex size-6 flex-none items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-white">{num}</span>
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <p className="font-bn text-[12px] text-muted">{sub}</p>
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

type Done = { id: string; name: string; phone: string; password: string };

export function PoliticianForm({
  nextId,
  admin,
  adminId,
  takenPhones,
  parties,
  onAddAnother,
  allowedAreas,
  listHref = "/admin/politicians",
  listLabel = "Back to the list",
  profileHref = (id: string) => `/admin/politicians/${id}`,
}: {
  nextId: string;
  admin: string;
  adminId: string;
  /** Sign-in numbers already used by any account. */
  takenPhones: string[];
  parties: string[];
  /** Starts a fresh, empty form. */
  onAddAnother: () => void;
  /** Restrict the area to these "district · thana" keys (a নির্বাহী সম্পাদক's coverage). */
  allowedAreas?: string[];
  listHref?: string;
  listLabel?: string;
  /** Where "Open profile" goes after saving; null hides the button. */
  profileHref?: ((id: string) => string) | null;
}) {
  const geo = useGeoCascade();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nid, setNid] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [facebook, setFacebook] = useState("");
  const [post, setPost] = useState("");
  const [party, setParty] = useState("");
  const [since, setSince] = useState(String(THIS_YEAR));
  const [office, setOffice] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const { sel, set, options, isCity, complete } = geo;
  const band = passwordBand(password);
  const sinceNum = Number(since);

  const errors = {
    name: name.trim().length < 3 ? "পূর্ণ নাম লিখুন।" : "",
    phone: !phone
      ? "মোবাইল নম্বর দিন।"
      : !phoneOk(phone)
        ? "সঠিক মোবাইল নম্বর দিন — যেমন 01712-345678।"
        : takenPhones.includes(normalisePhone(phone))
          ? "এই মোবাইল নম্বরটি অন্য একটি অ্যাকাউন্টে ব্যবহৃত হচ্ছে।"
          : "",
    nid: !nid ? "এনআইডি নম্বর দিন।" : !nidOk(nid) ? "এনআইডি ১০ বা ১৭ সংখ্যার হতে হবে।" : "",
    email: email && !emailOk(email) ? "সঠিক ইমেইল দিন অথবা খালি রাখুন।" : "",
    post: !post ? "পদ বেছে নিন।" : "",
    party: !party ? "দল বা সংগঠন বেছে নিন।" : "",
    since: !Number.isInteger(sinceNum) || sinceNum < 1971 || sinceNum > THIS_YEAR ? `১৯৭১ থেকে ${bn(THIS_YEAR)}-এর মধ্যে সাল লিখুন।` : "",
    area: !complete ? "বিভাগ, জেলা, এলাকা ও আসন বেছে নিন।" : "",
    password: passwordScore(password) < MIN_PASSWORD_SCORE ? "কমপক্ষে ১২ অক্ষর — বড়-ছোট হরফ, সংখ্যা বা চিহ্ন মিলিয়ে।" : "",
  };
  const firstError = (Object.keys(errors) as (keyof typeof errors)[]).find((k) => errors[k]);
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : "");
  const border = (k: keyof typeof errors) => (show(k) ? "border-danger!" : "");

  const areaLabel = [sel.area, sel.upazila && !isCity ? sel.upazila : "", sel.district].filter(Boolean).join(", ");

  const submit = () => {
    setSubmitted(true);
    if (firstError) {
      const target = firstError === "area" ? "pf-division" : `pf-${firstError}`;
      document.getElementById(target)?.focus();
      document.getElementById(target)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const normalised = normalisePhone(phone);
    const id = createProfile(
      {
        name: name.trim(),
        post,
        party,
        seat: sel.seat,
        division: sel.division,
        district: sel.district,
        upazila: sel.upazila,
        thana: sel.area,
        wards: sel.ward || "সব ওয়ার্ড",
        phone: normalised,
        nid,
        dob: bnDob(dob),
        email: email.trim(),
        facebook: facebook.trim(),
        office: office.trim(),
        since: bn(sinceNum),
        password,
      },
      adminId,
    );
    setDone({ id, name: name.trim(), phone: normalised, password });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (done) {
    return (
      <section role="status" className="mx-auto w-full max-w-3xl overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="flex items-center gap-3 border-b border-line bg-success/5 px-6 py-5">
          <span className="flex size-10 flex-none items-center justify-center rounded-full bg-success text-white">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h2 className="text-[17px] font-semibold text-ink">
              <span className="font-bn">{done.name}</span> · {done.id} created
            </h2>
            <p className="font-bn text-[12.5px] text-muted">অ্যাকাউন্ট সক্রিয় — এখনই লগইন করা যাবে।</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <h3 className="text-[14px] font-semibold text-ink">Sign-in details to share · লগইনের তথ্য</h3>
          <p className="mt-0.5 text-[12.5px] text-muted text-pretty">
            Share these with the political activist privately. The password is shown only now — ask them to change it from Settings after the first sign-in.
          </p>
          <dl className="mt-4 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
            <div className="bg-surface/60 px-4 py-3">
              <dt className="text-[11.5px] text-muted">ALARM ID · আইডি</dt>
              <dd className="mt-0.5 font-mono text-[15px] font-semibold text-ink">{done.id}</dd>
            </div>
            <div className="bg-surface/60 px-4 py-3">
              <dt className="text-[11.5px] text-muted">Mobile · মোবাইল নম্বর</dt>
              <dd className="mt-0.5 font-mono text-[15px] font-semibold text-ink">{phoneIntl(done.phone)}</dd>
            </div>
            <div className="bg-surface/60 px-4 py-3">
              <dt className="text-[11.5px] text-muted">Temporary password · প্রাথমিক পাসওয়ার্ড</dt>
              <dd className="mt-0.5 font-mono text-[15px] font-semibold break-all text-ink">{done.password}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {profileHref && (
              <Link href={profileHref(done.id)} className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
                Open profile
              </Link>
            )}
            <button
              type="button"
              onClick={onAddAnother}
              className="h-10 cursor-pointer rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary"
            >
              Add another
            </button>
            <Link href={listHref} className="inline-flex h-10 items-center px-2 text-[13.5px] font-semibold text-muted hover:text-ink">
              {listLabel}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="flex min-w-0 flex-col gap-5">
        {submitted && firstError && (
          <p role="alert" className="rounded-card border border-danger/40 bg-danger/5 px-5 py-3 font-bn text-[13px] text-danger">
            অ্যাকাউন্ট তৈরির আগে কিছু তথ্য ঠিক করতে হবে।
          </p>
        )}

        <Card num="1" title="Personal Details" sub="ব্যক্তিগত তথ্য">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="pf-name" label="পূর্ণ নাম · Full name" required hint={show("name") || undefined} hintClassName="text-danger">
              <input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="মোঃ আব্দুল করিম" autoComplete="off" aria-invalid={!!show("name")} className={`${inputClass} ${border("name")}`} />
            </Field>
            <Field
              id="pf-phone"
              label="মোবাইল নম্বর · Mobile"
              required
              hint={show("phone") || "এই নম্বর দিয়েই লগইন করবেন।"}
              hintClassName={show("phone") ? "text-danger" : "text-muted"}
            >
              <input id="pf-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXX-XXXXXX" autoComplete="off" aria-invalid={!!show("phone")} className={`${inputClass} ${border("phone")}`} />
            </Field>
            <Field
              id="pf-nid"
              label="এনআইডি নম্বর · NID"
              required
              hint={show("nid") || "প্রোফাইলে শুধু প্রথম ও শেষ চার সংখ্যা দেখানো হয়।"}
              hintClassName={show("nid") ? "text-danger" : "text-muted"}
            >
              <input id="pf-nid" inputMode="numeric" value={nid} onChange={(e) => setNid(e.target.value)} placeholder="১০ বা ১৭ সংখ্যা" aria-invalid={!!show("nid")} className={`${inputClass} ${border("nid")}`} />
            </Field>
            <Field id="pf-dob" label="জন্ম তারিখ · Date of birth">
              <input id="pf-dob" type="date" value={dob} max={`${THIS_YEAR - 18}-12-31`} onChange={(e) => setDob(e.target.value)} className={`${inputClass} px-[11px]`} />
            </Field>
            <Field id="pf-email" label="ইমেইল · Email" hint={show("email") || undefined} hintClassName="text-danger">
              <input id="pf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" aria-invalid={!!show("email")} className={`${inputClass} ${border("email")}`} />
            </Field>
            <Field id="pf-facebook" label="ফেসবুক প্রোফাইল · Facebook">
              <input id="pf-facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="facebook.com/…" className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card num="2" title="Post & Area" sub="পদ ও এলাকা">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field id="pf-post" label="পদ · Post" required hint={show("post") || undefined} hintClassName="text-danger">
              <select id="pf-post" value={post} onChange={(e) => setPost(e.target.value)} className={`${selectClass} ${border("post")}`}>
                <option value="">পদ বেছে নিন</option>
                {POSTS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field id="pf-party" label="দল / সংগঠন · Party" required hint={show("party") || undefined} hintClassName="text-danger">
              <select id="pf-party" value={party} onChange={(e) => setParty(e.target.value)} className={`${selectClass} ${border("party")}`}>
                <option value="">দল বেছে নিন</option>
                {parties.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field id="pf-since" label="দায়িত্ব গ্রহণের বছর" required hint={show("since") || undefined} hintClassName="text-danger">
              <input id="pf-since" inputMode="numeric" value={since} onChange={(e) => setSince(e.target.value.replace(/\D/g, "").slice(0, 4))} aria-invalid={!!show("since")} className={`${inputClass} ${border("since")}`} />
            </Field>
          </div>

          <div className="mt-6 font-bn text-[12.5px] font-semibold">
            নির্বাচনী এলাকা · Constituency <Required />
          </div>
          <p
            className={`mt-2 rounded-input border px-4 py-2.5 font-bn text-[13px] ${
              show("area") ? "border-danger bg-danger/5 text-danger" : complete ? "border-success/40 bg-success/5 text-ink" : "border-line bg-surface text-muted"
            }`}
          >
            {complete ? `${[sel.ward, areaLabel].filter(Boolean).join(", ")} · ${sel.seat}` : show("area") || "এখনও কোনো এলাকা বাছাই করা হয়নি"}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allowedAreas ? (
              <Field id="pf-division" label="আপনার দায়িত্বের এলাকা" required hint="শুধু আপনার দায়িত্বপ্রাপ্ত এলাকায় অ্যাকাউন্ট তৈরি করা যায়।">
                <select
                  id="pf-division"
                  value={sel.district && sel.area ? `${sel.district} · ${sel.area}` : ""}
                  onChange={(e) => {
                    const [district, thana] = e.target.value.split(" · ");
                    const loc = e.target.value ? locateArea(district, thana) : {};
                    set.division(loc.division ?? "");
                    if (loc.division) {
                      set.district(district);
                      set.upazila(loc.upazila ?? "");
                      set.area(thana);
                    }
                  }}
                  className={`${selectClass} ${!complete && show("area") ? "border-danger!" : ""}`}
                >
                  <option value="">{allowedAreas.length ? "এলাকা বেছে নিন" : "কোনো এলাকা নির্ধারিত নেই"}</option>
                  {allowedAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <>
            <Field id="pf-division" label="বিভাগ" required>
              <select id="pf-division" value={sel.division} onChange={(e) => set.division(e.target.value)} className={`${selectClass} ${!sel.division && show("area") ? "border-danger!" : ""}`}>
                <option value="">বিভাগ বেছে নিন</option>
                {options.divisions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field id="pf-district" label="জেলা" required>
              <select id="pf-district" value={sel.district} disabled={!sel.division} onChange={(e) => set.district(e.target.value)} className={selectClass}>
                <option value="">{sel.division ? "জেলা বেছে নিন" : "আগে বিভাগ বেছে নিন"}</option>
                {options.districts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field id="pf-upazila" label="উপজেলা / সিটি কর্পোরেশন" required>
              <select id="pf-upazila" value={sel.upazila} disabled={!sel.district} onChange={(e) => set.upazila(e.target.value)} className={selectClass}>
                <option value="">{sel.district ? "এলাকা বেছে নিন" : "আগে জেলা বেছে নিন"}</option>
                {options.upazilas.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field id="pf-area" label={isCity ? "থানা" : "ইউনিয়ন"} required>
              <select id="pf-area" value={sel.area} disabled={!sel.upazila} onChange={(e) => set.area(e.target.value)} className={selectClass}>
                <option value="">{sel.upazila ? (isCity ? "থানা বেছে নিন" : "ইউনিয়ন বেছে নিন") : "আগে এলাকা বেছে নিন"}</option>
                {options.areas.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
              </>
            )}
            <Field id="pf-ward" label="ওয়ার্ড" hint="খালি রাখলে পুরো এলাকা ধরা হবে।">
              <select id="pf-ward" value={sel.ward} disabled={!sel.area} onChange={(e) => set.ward(e.target.value)} className={selectClass}>
                <option value="">সব ওয়ার্ড</option>
                {options.wards.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field id="pf-seat" label="সংসদীয় আসন" required>
              <select id="pf-seat" value={sel.seat} disabled={!sel.upazila} onChange={(e) => set.seat(e.target.value)} className={selectClass}>
                <option value="">{sel.upazila ? "আসন বেছে নিন" : "আগে এলাকা বেছে নিন"}</option>
                {options.seats.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4">
            <Field id="pf-office" label="কার্যালয়ের ঠিকানা · Office address">
              <input id="pf-office" value={office} onChange={(e) => setOffice(e.target.value)} placeholder="ওয়ার্ড কার্যালয়, …" className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card num="3" title="Sign-in" sub="লগইনের তথ্য">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="pf-password" className="font-bn text-[12.5px] font-semibold leading-[1.6]">
                প্রাথমিক পাসওয়ার্ড · Temporary password <Required />
              </label>
              <div className={`flex h-11 items-center rounded-input border bg-white pr-1.5 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,106,78,0.10)] ${show("password") ? "border-danger" : "border-line"}`}>
                <input
                  id="pf-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="কমপক্ষে ১২ অক্ষর"
                  autoComplete="new-password"
                  aria-invalid={!!show("password")}
                  aria-describedby="pf-password-msg"
                  className="h-full min-w-0 flex-1 bg-transparent px-[13px] text-[14px] text-ink outline-none"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-pressed={showPassword} className="h-8 cursor-pointer rounded-button border border-line px-2.5 font-bn text-[12px] font-semibold text-muted hover:text-primary">
                  {showPassword ? "লুকান" : "দেখান"}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                  <div className="h-full rounded-full transition-all" style={{ width: band.pct, background: band.color }} />
                </div>
                <span className="font-bn text-[11.5px]" style={{ color: band.color }}>
                  {band.label}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPassword(generatePassword());
                    setShowPassword(true);
                  }}
                  className="h-8 flex-none cursor-pointer rounded-button border border-line px-3 font-bn text-[12.5px] font-semibold text-primary hover:border-primary"
                >
                  তৈরি করুন
                </button>
                <p id="pf-password-msg" className={`font-bn text-[11.5px] leading-normal ${show("password") ? "text-danger" : "text-muted"}`}>
                  {show("password") || "প্রথম লগইনের পর সেটিংস থেকে বদলাতে বলুন।"}
                </p>
              </div>
            </div>
            <div className="flex gap-3 self-start rounded-card border border-line border-l-[3px] border-l-primary bg-surface/60 px-4 py-3 font-bn text-[12.5px] leading-relaxed text-ink">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-1 flex-none text-primary">
                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              অ্যাকাউন্ট তৈরির সাথে সাথে সক্রিয় হবে। মোবাইল নম্বর ও প্রাথমিক পাসওয়ার্ড পরের ধাপে একবারই দেখানো হবে — গোপনে রাজনৈতিক কর্মীকে জানান।
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white px-5 py-4 shadow-card">
          <p className="min-w-[200px] flex-1 text-[12px] leading-normal text-muted">Account creation is logged under {admin}.</p>
          <Link href={listHref} className="px-2 text-[13.5px] font-semibold text-muted hover:text-ink">
            Cancel
          </Link>
          <button type="submit" className="h-10 cursor-pointer rounded-button bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
            Create account
          </button>
        </div>
      </div>

      {/* Live preview of the profile header the political activist will see. */}
      <aside className="flex flex-col gap-5 xl:sticky xl:top-5">
        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold text-ink">Profile preview</h2>
            <p className="font-bn text-[12px] text-muted">প্রোফাইলের প্রাকদর্শন</p>
          </div>
          <div className="flex flex-col items-center px-5 py-5 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/12 font-bn text-[24px] font-semibold text-primary">
              {name.trim().replace(/^মোঃ\s*/, "").slice(0, 1) || "?"}
            </span>
            <div className="mt-3 font-bn text-[17px] font-semibold text-ink">{name.trim() || "নাম লিখুন"}</div>
            <div className="mt-0.5 font-bn text-[12.5px] text-muted">{[post, party].filter(Boolean).join(" · ") || "পদ ও দল বেছে নিন"}</div>
          </div>
          <dl className="border-t border-line px-5 py-2 font-bn">
            {[
              ["ALARM আইডি", `${nextId} · তৈরির পর`],
              ["নির্বাচনী এলাকা", sel.seat || "—"],
              ["এলাকা", areaLabel || "—"],
              ["মোবাইল", phoneOk(phone) ? phoneIntl(normalisePhone(phone)) : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2.5 last:border-b-0">
                <dt className="text-[12px] text-muted">{k}</dt>
                <dd className="min-w-0 text-right text-[13px] font-semibold break-words text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-card border border-line bg-white px-5 py-4 font-bn shadow-card">
          <h2 className="text-[14px] font-semibold text-ink">তৈরির পর যা হবে</h2>
          <ol className="mt-3 flex flex-col gap-2.5 text-[12.5px] leading-[1.7] text-muted">
            {[
              "অ্যাকাউন্ট সক্রিয় হবে এবং অডিট শুরু হবে।",
              "এলাকার তদন্ত সম্পাদক ও নির্বাহী সম্পাদক প্রোফাইলটি দেখতে পাবেন।",
              "রাজনৈতিক কর্মী লগইন করে নিজের প্রোফাইল দেখতে ও কার্যক্রম যোগ করতে পারবেন।",
            ].map((t, i) => (
              <li key={t} className="flex gap-2.5">
                <span className="flex size-5 flex-none items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{bn(i + 1)}</span>
                {t}
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </form>
  );
}
