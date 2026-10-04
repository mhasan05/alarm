"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand";
import { Field, inputClass, Required, selectClass, UploadBox } from "@/components/form";
import { createReviewer, createStaff, updateReviewer, updateStaff, type AccountInput } from "@/lib/db/actions";
import { normalisePhone } from "@/lib/db/format";
import type { FieldStaff } from "../roster";

/** The account being edited — a field staff member or a reviewer. */
export type EditableAccount = { id: string; name: string; phone: string; joined: string };
import { MIN_PASSWORD_SCORE, passwordBand, passwordScore } from "@/lib/password";
import { useGeoCascade, type GeoSelection } from "@/lib/use-geo-cascade";

const PHOTO_TYPES = ["image/jpeg", "image/png"];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const ROLES = {
  staff: { label: "Investigation Editor · তদন্ত সম্পাদক", tag: "Investigation Editor", cls: "bg-warning/10 text-warning", note: "Mobile collection only — cannot view or approve reports." },
  reviewer: { label: "Executive Editor · নির্বাহী সম্পাদক", tag: "Executive Editor", cls: "bg-role-reviewer/10 text-role-reviewer", note: "Reviews and decides submissions for the chosen area." },
} as const;
export type Role = keyof typeof ROLES;

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
  // Shuffle so the guaranteed characters aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

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

type Done = { kind: "created" | "draft" | "saved"; id: string };

export function StaffForm({
  nextId,
  admin,
  adminId,
  takenPhones,
  roster,
  editing,
  initialArea,
  initialRole = "staff",
  basePath = "/admin/field-staff",
  listLabel = "Investigation Editors",
}: {
  nextId: string;
  admin: string;
  adminId: string;
  /** Login numbers already in use by other accounts. */
  takenPhones: string[];
  roster: FieldStaff[];
  /** Existing account when editing. */
  editing?: EditableAccount;
  initialArea?: Partial<GeoSelection>;
  initialRole?: Role;
  /** List page this form belongs to, e.g. /admin/reviewers. */
  basePath?: string;
  listLabel?: string;
}) {
  const geo = useGeoCascade(initialArea);
  const [name, setName] = useState(editing?.name ?? "");
  const [nid, setNid] = useState("");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [email, setEmail] = useState("");
  const [emergency, setEmergency] = useState("");
  const [joined, setJoined] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : ""), [photo]);
  useEffect(() => () => URL.revokeObjectURL(photoUrl), [photoUrl]);

  const choosePhoto = (file: File | undefined) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) setPhotoError("JPG or PNG only.");
    else if (file.size > PHOTO_MAX_BYTES) setPhotoError("The photo is over 2 MB — choose a smaller one.");
    else {
      setPhotoError("");
      setPhoto(file);
    }
  };

  const id = editing?.id ?? nextId;
  const { sel, set, options, isCity, complete } = geo;
  const band = passwordBand(password);

  // Errors are shown once the admin tries to submit.
  const errors = {
    name: name.trim().length < 3 ? "Enter the full name." : "",
    // NID is not re-entered when editing (it is kept, masked, on the record).
    nid: editing ? "" : !nid ? "NID is required." : !nidOk(nid) ? "NID must be 10 or 17 digits." : "",
    phone: !phone
      ? "Mobile is required."
      : !phoneOk(phone)
        ? "Enter a Bangladeshi mobile like +880 1712-345678."
        : takenPhones.includes(normalisePhone(phone))
          ? "This mobile number already belongs to another account."
          : "",
    email: email && !emailOk(email) ? "Enter a valid email or leave it empty." : "",
    emergency: emergency && !phoneOk(emergency) ? "Enter a Bangladeshi mobile or leave it empty." : "",
    area: !complete ? "Choose the division, district, area and seat." : "",
    password: editing ? "" : passwordScore(password) < MIN_PASSWORD_SCORE ? "Use at least 12 characters with upper and lower case, a number or a symbol." : "",
  };
  const firstError = Object.entries(errors).find(([, v]) => v)?.[0];
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : "");
  const border = (k: keyof typeof errors) => (show(k) ? "border-danger!" : "");

  const submit = (kind: "created" | "saved") => {
    setSubmitted(true);
    if (firstError) {
      const target = firstError === "area" ? "fs-division" : `fs-${firstError}`;
      document.getElementById(target)?.focus();
      document.getElementById(target)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const saved = save(false);
    setDone({ kind, id: saved });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveDraft = () => {
    if (errors.name) {
      setSubmitted(true);
      document.getElementById("fs-name")?.focus();
      return;
    }
    setDone({ kind: "draft", id: save(true) });
  };

  /** Writes the account; returns its id. */
  const save = (draft: boolean) => {
    const input: AccountInput = {
      name: name.trim(),
      phone: normalisePhone(phone) || phone,
      email: email.trim(),
      nid: nid.trim(),
      division: sel.division,
      district: sel.district,
      upazila: sel.upazila,
      thana: sel.area,
      seat: sel.seat,
      wards: sel.ward || "সব ওয়ার্ড",
      joined: joined ? `${joined}T09:00:00+06:00` : "",
      password,
    };
    if (editing) {
      if (role === "reviewer") updateReviewer(editing.id, input, adminId);
      else updateStaff(editing.id, input, adminId);
      return editing.id;
    }
    return role === "reviewer" ? createReviewer(input, adminId, draft) : createStaff(input, adminId, draft);
  };

  // District load for the chosen district, from the live roster.
  const inDistrict = sel.district ? roster.filter((s) => s.district === sel.district && s.id !== editing?.id) : [];
  const openInDistrict = inDistrict.reduce((n, s) => n + s.open, 0);
  const avgNow = inDistrict.length ? openInDistrict / inDistrict.length : 0;
  const avgAfter = openInDistrict / (inDistrict.length + 1);
  const maxBar = Math.max(inDistrict.length, openInDistrict, 1);

  const areaLabel = [sel.area, sel.upazila && !isCity ? sel.upazila : "", sel.district].filter(Boolean).join(", ");

  if (done) {
    const title =
      done.kind === "created" ? `${done.id} created · invite sent` : done.kind === "draft" ? `Draft saved for ${name.trim()}` : `${done.id} updated`;
    const body =
      done.kind === "created"
        ? `An activation SMS with a one-time code went to ${phone}. The account stays inactive until ${name.trim()} signs in on the app and the device is registered.`
        : done.kind === "draft"
          ? `${done.id} is saved as an inactive draft. Nothing was sent; activate it from the account page when the details are complete.`
          : `Changes to ${name.trim()} are saved and logged under ${admin}.`;
    return (
      <section role="status" className="rounded-card border border-line border-l-[3px] border-l-success bg-white px-6 py-6 shadow-card">
        <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted text-pretty">{body}</p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href={basePath} className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
            Back to {listLabel}
          </Link>
          {editing ? (
            <Link
              href={`${basePath}/${editing.id}`}
              className="inline-flex h-10 items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary"
            >
              Open {editing.name}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setDone(null)}
              className="h-10 cursor-pointer rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary"
            >
              {done.kind === "draft" ? "Keep editing" : "Back to the form"}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit(editing ? "saved" : "created");
      }}
      className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_410px]"
    >
      <div className="flex min-w-0 flex-col gap-5">
        {submitted && firstError && (
          <p role="alert" className="rounded-card border border-danger/40 bg-danger/5 px-5 py-3 text-[13px] text-danger">
            Some details need fixing before the account can be {editing ? "saved" : "created"}.
          </p>
        )}

        <Card num="1" title="Personal Details" sub="ব্যক্তিগত তথ্য">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_214px]">
            <div className="flex flex-col gap-4">
              <Field id="fs-name" label="Full name · পূর্ণ নাম" required hint={show("name") || undefined} hintClassName="text-danger">
                <input id="fs-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="মোঃ সাইফুল ইসলাম" autoComplete="name" aria-invalid={!!show("name")} className={`${inputClass} ${border("name")}`} />
              </Field>
              {editing ? (
                <Field label="NID · এনআইডি" hint="Kept on the record. Contact support to correct an NID.">
                  <input value="••••••••••  গোপনকৃত" disabled className={`${inputClass} bg-surface font-bn text-muted`} />
                </Field>
              ) : (
                <Field
                  id="fs-nid"
                  label="NID · এনআইডি"
                  required
                  hint={show("nid") || "Required for every account — decisions and evidence are attributable by law."}
                  hintClassName={show("nid") ? "text-danger" : "text-muted"}
                >
                  <input id="fs-nid" inputMode="numeric" value={nid} onChange={(e) => setNid(e.target.value)} placeholder="10 or 17 digit NID" aria-invalid={!!show("nid")} className={`${inputClass} ${border("nid")}`} />
                </Field>
              )}
              <Field
                id="fs-phone"
                label="Mobile · মোবাইল"
                required
                hint={show("phone") || "Used for sign-in OTP and urgent SMS alerts."}
                hintClassName={show("phone") ? "text-danger" : "text-muted"}
              >
                <input id="fs-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+880 1XXX-XXXXXX" autoComplete="tel" aria-invalid={!!show("phone")} className={`${inputClass} ${border("phone")}`} />
              </Field>
              <Field id="fs-email" label="Work email" hint={show("email") || undefined} hintClassName="text-danger">
                <input id="fs-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="saiful.islam@example.com" autoComplete="email" aria-invalid={!!show("email")} className={`${inputClass} ${border("email")}`} />
              </Field>
              <Field
                id="fs-emergency"
                label="Emergency contact · জরুরি যোগাযোগ"
                hint={show("emergency") || "Field work can involve travel to unfamiliar areas."}
                hintClassName={show("emergency") ? "text-danger" : "text-muted"}
              >
                <input id="fs-emergency" type="tel" inputMode="tel" value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder="+880 1XXX-XXXXXX" aria-invalid={!!show("emergency")} className={`${inputClass} ${border("emergency")}`} />
              </Field>
              <Field id="fs-joined" label="Joining date · যোগদানের তারিখ" hint={editing ? `On record: ${editing.joined}` : undefined}>
                <input id="fs-joined" type="date" value={joined} onChange={(e) => setJoined(e.target.value)} className={`${inputClass} px-[11px]`} />
              </Field>
            </div>
            <div className="flex flex-col gap-[7px] self-start">
              <div className="font-bn text-[12.5px] font-semibold leading-[1.6]">ID photo · পরিচয়পত্রের ছবি</div>
              <UploadBox
                icon={
                  <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-primary">
                    <circle cx="8" cy="5.5" r="2.6" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M3 14c.6-2.8 2.6-4.3 5-4.3s4.4 1.5 5 4.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                }
                title="Upload photo"
                note="Printed on the field ID card · JPG or PNG, max 2 MB"
                accept="image/jpeg,image/png"
                selected={photo?.name}
                previewUrl={photoUrl}
                onRemove={() => setPhoto(null)}
                error={photoError}
                onChange={(e) => choosePhoto(e.target.files?.[0])}
                className="h-[232px] gap-[9px]"
              />
            </div>
          </div>
        </Card>

        <Card num="2" title="Coverage area" sub="কর্মএলাকা · নির্বাচনী ভূগোল অনুযায়ী">
          <div className="font-bn text-[12.5px] font-semibold">
            Coverage area · কর্মএলাকা <Required />
          </div>
          <p className="mt-0.5 text-[11.5px] text-muted">Set by electoral geography, so assignments match the constituency a request belongs to.</p>
          <p
            className={`mt-3 rounded-input border px-4 py-2.5 font-bn text-[13px] ${
              show("area") ? "border-danger bg-danger/5 text-danger" : complete ? "border-success/40 bg-success/5 text-ink" : "border-line bg-surface text-muted"
            }`}
          >
            {complete ? `${[sel.ward, areaLabel].filter(Boolean).join(", ")} · ${sel.seat}` : show("area") || "এখনও কোনো এলাকা বাছাই করা হয়নি"}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="fs-division" label="বিভাগ · Division" required>
              <select id="fs-division" value={sel.division} onChange={(e) => set.division(e.target.value)} className={`${selectClass} ${!sel.division && show("area") ? "border-danger!" : ""}`}>
                <option value="">বিভাগ বেছে নিন</option>
                {options.divisions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field id="fs-district" label="জেলা · District" required hint={sel.district ? `${inDistrict.length} investigation editors already in ${sel.district}` : "জেলা বাছাই করলে বর্তমান কর্মী সংখ্যা দেখা যাবে।"}>
              <select id="fs-district" value={sel.district} disabled={!sel.division} onChange={(e) => set.district(e.target.value)} className={selectClass}>
                <option value="">{sel.division ? "জেলা বেছে নিন" : "আগে বিভাগ বেছে নিন"}</option>
                {options.districts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field id="fs-upazila" label="উপজেলা / সিটি কর্পোরেশন" required>
              <select id="fs-upazila" value={sel.upazila} disabled={!sel.district} onChange={(e) => set.upazila(e.target.value)} className={selectClass}>
                <option value="">{sel.district ? "এলাকা বেছে নিন" : "আগে জেলা বেছে নিন"}</option>
                {options.upazilas.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field id="fs-area" label={isCity ? "থানা · Thana" : "ইউনিয়ন · Union"} required>
              <select id="fs-area" value={sel.area} disabled={!sel.upazila} onChange={(e) => set.area(e.target.value)} className={selectClass}>
                <option value="">{sel.upazila ? (isCity ? "থানা বেছে নিন" : "ইউনিয়ন বেছে নিন") : "আগে এলাকা বেছে নিন"}</option>
                {options.areas.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field id="fs-ward" label="ওয়ার্ড · Ward" hint="Optional — leave empty to cover the whole area.">
              <select id="fs-ward" value={sel.ward} disabled={!sel.area} onChange={(e) => set.ward(e.target.value)} className={selectClass}>
                <option value="">{sel.area ? "সব ওয়ার্ড" : isCity ? "আগে থানা বেছে নিন" : "আগে ইউনিয়ন বেছে নিন"}</option>
                {options.wards.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field id="fs-seat" label="সংসদীয় আসন" required hint={sel.upazila ? undefined : "এলাকা বাছাই করলে আসনের তালিকা আসবে।"}>
              <select id="fs-seat" value={sel.seat} disabled={!sel.upazila} onChange={(e) => set.seat(e.target.value)} className={selectClass}>
                <option value="">{sel.upazila ? "আসন বেছে নিন" : "আগে এলাকা বেছে নিন"}</option>
                {options.seats.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        <Card num="3" title="Account & Device" sub="অ্যাকাউন্ট ও ডিভাইস">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-[7px]">
              <Field id="fs-role" label="Role · ভূমিকা" required>
                <select id="fs-role" value={role} disabled={!!editing} onChange={(e) => setRole(e.target.value as Role)} className={selectClass}>
                  {(Object.keys(ROLES) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLES[r].label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-start gap-2.5">
                <span className={`flex-none rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${ROLES[role].cls}`}>{ROLES[role].tag}</span>
                <span className="text-[11.5px] leading-normal text-muted">{ROLES[role].note}</span>
              </div>
            </div>

            {editing ? (
              <div className="flex flex-col gap-[7px]">
                <div className="font-bn text-[12.5px] font-semibold leading-[1.6]">Password</div>
                <p className="rounded-input border border-line bg-surface px-3.5 py-3 text-[12.5px] leading-normal text-muted">
                  Passwords are never shown. Use <strong className="font-semibold text-ink">Reset password</strong> on the investigation editor&apos;s page to send a new temporary one.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-[7px]">
                <label htmlFor="fs-password" className="font-bn text-[12.5px] font-semibold leading-[1.6]">
                  Temporary password · প্রাথমিক পাসওয়ার্ড <Required />
                </label>
                <div className={`flex h-11 items-center rounded-input border bg-white pr-1.5 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,106,78,0.10)] ${show("password") ? "border-danger" : "border-line"}`}>
                  <input
                    id="fs-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="12 characters minimum"
                    autoComplete="new-password"
                    aria-invalid={!!show("password")}
                    aria-describedby="fs-password-msg"
                    className="h-full min-w-0 flex-1 bg-transparent px-[13px] text-[14px] text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    className="h-8 cursor-pointer rounded-button border border-line px-2.5 text-[12px] font-semibold text-muted hover:text-primary"
                  >
                    {showPassword ? "Hide" : "Show"}
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
                    className="h-8 flex-none cursor-pointer rounded-button border border-line px-3 text-[12.5px] font-semibold text-primary hover:border-primary"
                  >
                    Generate
                  </button>
                  <p id="fs-password-msg" className={`text-[11.5px] leading-normal ${show("password") ? "text-danger" : "text-muted"}`}>
                    {show("password") || "Must be changed at first sign-in. Never shown again after saving."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {!editing && (
            <p className="mt-5 flex gap-3 rounded-card border border-line border-l-[3px] border-l-primary bg-surface/60 px-4 py-3 text-[12.5px] leading-relaxed text-ink">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 flex-none text-primary">
                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              On save, an activation SMS with a one-time code is sent to the mobile number. The account stays inactive until the investigation editor signs in on the app and the device is registered.
            </p>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white px-5 py-4 shadow-card">
          <p className="min-w-[200px] flex-1 text-[12px] leading-normal text-muted">
            {editing ? "Changes are" : "Invite SMS will go to the number above. Account creation is"} logged under {admin} (Admin).
          </p>
          <Link href={editing ? `${basePath}/${editing.id}` : basePath} className="px-2 text-[13.5px] font-semibold text-muted hover:text-ink">
            Cancel
          </Link>
          {!editing && (
            <button type="button" onClick={saveDraft} className="h-10 cursor-pointer rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary">
              Save as Draft
            </button>
          )}
          <button type="submit" className="h-10 cursor-pointer rounded-button bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
            {editing ? "Save changes" : "Create & Send Invite"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
          <h2 className="text-[15px] font-semibold text-ink">Field ID Preview</h2>
          <p className="mt-0.5 font-bn text-[12px] text-muted">পরিচয়পত্রের প্রাকদর্শন</p>
          <div className="mt-3 overflow-hidden rounded-card border border-line" aria-label="Field ID card preview">
            <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
              <span className="flex items-center gap-2 text-[13px] font-bold tracking-[0.13em]">
                <Logo size={28} />
                ALARM
              </span>
              <span className="text-[10.5px] font-semibold tracking-[0.05em] uppercase">{ROLES[role].tag}</span>
            </div>
            <div className="flex gap-3 px-4 py-3.5">
              <div className="flex h-[66px] w-[56px] flex-none items-center justify-center overflow-hidden rounded-md border border-line bg-surface text-muted">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                  <img src={photoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="5.5" r="2.6" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M3 14c.6-2.8 2.6-4.3 5-4.3s4.4 1.5 5 4.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate font-bn text-[14px] font-semibold text-ink">{name.trim() || "নাম লিখুন"}</div>
                <div className="text-[11.5px] text-muted">
                  {id} · {editing ? "issued" : "issued on save"}
                </div>
                <div className="truncate font-bn text-[11.5px] text-muted">{areaLabel || "এলাকা বাছাই করা হয়নি"}</div>
              </div>
            </div>
            <div className="border-t border-line px-4 py-2 text-[10.5px] text-muted">Valid while the account is active</div>
          </div>
        </section>

        {/* Caseload only matters for field staff. */}
        {role === "staff" && (
        <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
          <h2 className="text-[15px] font-semibold text-ink">District Load</h2>
          <p className="mt-0.5 font-bn text-[12px] text-muted">
            নির্বাচিত জেলার তদন্ত সম্পাদক{sel.district && ` · ${sel.district}`}
          </p>
          {sel.district ? (
            <>
              <dl className="mt-3 flex flex-col gap-3">
                {[
                  { k: "Staff in district", v: inDistrict.length, bar: inDistrict.length / maxBar, c: "bg-primary" },
                  { k: "Open assignments", v: openInDistrict, bar: openInDistrict / maxBar, c: "bg-role-reviewer" },
                  { k: "Average per editor", v: avgNow.toFixed(1), bar: Math.min(avgNow / 7, 1), c: avgNow >= 4 ? "bg-warning" : "bg-success" },
                ].map((r) => (
                  <div key={r.k}>
                    <div className="flex justify-between text-[13px]">
                      <dt className="text-ink">{r.k}</dt>
                      <dd className="font-semibold text-ink">{r.v}</dd>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                      <div className={`h-full rounded-full ${r.c}`} style={{ width: `${r.bar * 100}%` }} />
                    </div>
                  </div>
                ))}
              </dl>
              <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-muted text-pretty">
                {inDistrict.length === 0
                  ? `No investigation editors cover ${sel.district} yet — this will be the first.`
                  : editing
                    ? `Keeping ${editing.name} here holds the district average at ${avgAfter.toFixed(1)} open assignments each.`
                    : `Adding one more investigation editor brings the district average down to ${avgAfter.toFixed(1)} open assignments each.`}
              </p>
            </>
          ) : (
            <p className="mt-3 text-[12.5px] text-muted">Choose a district to see how many investigation editors it has and their caseload.</p>
          )}
        </section>
        )}
      </div>
    </form>
  );
}
