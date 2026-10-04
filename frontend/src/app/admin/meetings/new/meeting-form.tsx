"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { Field, inputClass } from "@/components/form";
import { AreaPicker, areaFromGeo } from "@/components/meetings/area-picker";
import { InvitePicker } from "@/components/meetings/invite-picker";
import { RichTextEditor } from "@/components/rich-text";
import { bn } from "@/lib/db/format";
import { areaMembers, createMeeting } from "@/lib/db/meetings";
import { plainText } from "@/lib/rich-text";
import { useNow } from "@/lib/use-client";
import { useGeoCascade } from "@/lib/use-geo-cascade";
import { useAdmin } from "../../use-admin";

const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function Card({ num, title, sub, children }: { num: string; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white shadow-card">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="flex size-6 flex-none items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-white">{num}</span>
        <div>
          <h2 className="font-bn text-[15px] font-semibold text-ink">{title}</h2>
          <p className="font-bn text-[12px] text-muted">{sub}</p>
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function MeetingForm() {
  const router = useRouter();
  const { db, adminId } = useAdmin();
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  // null = untouched, so the field shows the default (today, the next full hour).
  const [dateIn, setDate] = useState<string | null>(null);
  const [timeIn, setTime] = useState<string | null>(null);
  const geo = useGeoCascade();
  const [invitees, setInvitees] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const memberList = areaMembers(db, areaFromGeo(geo));
  const memberIds = new Set(memberList.map((u) => u.id));
  const members = memberList.length;
  // The defaults depend on the user's clock, so they appear after hydration (now is 0 until then).
  const now = useNow(60_000);
  const nextHour = now ? new Date(now) : null;
  nextHour?.setHours(nextHour.getHours() + 1, 0, 0, 0);
  const today = now ? localDate(new Date(now)) : "";
  const date = dateIn ?? (nextHour ? localDate(nextHour) : "");
  const time = timeIn ?? (nextHour ? `${pad(nextHour.getHours())}:00` : "");

  const when = date && time ? new Date(`${date}T${time}:00`) : null;
  const errors = {
    title: title.trim().length < 5 ? "মিটিংয়ের শিরোনাম লিখুন (কমপক্ষে ৫ অক্ষর)।" : "",
    agenda: plainText(agenda).length > 1000 ? "আলোচনার বিষয় ১০০০ অক্ষরের মধ্যে রাখুন।" : "",
    when: !when || Number.isNaN(when.getTime()) ? "তারিখ ও সময় দিন।" : when.getTime() < now - 5 * 60_000 ? "পার হয়ে যাওয়া সময় দেওয়া যাবে না।" : "",
  };
  const firstError = (Object.keys(errors) as (keyof typeof errors)[]).find((k) => errors[k]);
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : "");

  const submit = () => {
    setSubmitted(true);
    if (firstError) {
      document.getElementById(`mt-${firstError === "when" ? "date" : firstError}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const m = createMeeting({ title: title.trim(), agenda: plainText(agenda).trim() ? agenda : "", scheduledAt: when!.toISOString(), area: areaFromGeo(geo), invitees }, adminId);
    router.push(`/admin/meetings/${m.id}?created=1`);
  };

  return (
    <>
      <PageHeader
        backHref="/admin/meetings"
        crumb={
          <>
            <Link href="/admin/meetings" className="text-primary hover:text-primary-hover">
              মিটিং
            </Link>{" "}
            / নতুন
          </>
        }
        title={<span className="font-bn">নতুন মিটিং</span>}
      />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="grid flex-1 grid-cols-1 items-start gap-5 px-4 pt-[22px] pb-9 sm:px-7 xl:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="flex min-w-0 flex-col gap-5">
          {submitted && firstError && (
            <p role="alert" className="rounded-card border border-danger/40 bg-danger/5 px-5 py-3 font-bn text-[13px] text-danger">
              মিটিং তৈরির আগে কিছু তথ্য ঠিক করতে হবে।
            </p>
          )}

          <Card num="১" title="মিটিংয়ের তথ্য" sub="শিরোনাম, আলোচনার বিষয় ও সময়">
            <div className="flex flex-col gap-4">
              <Field id="mt-title" label="শিরোনাম" required hint={show("title") || undefined} hintClassName="text-danger">
                <input id="mt-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="যেমন: অক্টোবরের মাঠের কাজ নিয়ে মিটিং" className={`${inputClass} font-bn ${show("title") ? "border-danger!" : ""}`} />
              </Field>
              <Field id="mt-agenda" label="আলোচনার বিষয়" hint={show("agenda") || "প্রতিটি বিষয় আলাদা লাইনে লিখতে পারেন।"} hintClassName={show("agenda") ? "text-danger" : undefined}>
                <RichTextEditor id="mt-agenda" value={agenda} onChange={setAgenda} minHeight={130} placeholder="১. … ২. …" invalid={!!show("agenda")} describedBy="mt-agenda-msg" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="mt-date" label="তারিখ" required hint={show("when") || undefined} hintClassName="text-danger">
                  <input id="mt-date" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className={`${inputClass} px-[11px] ${show("when") ? "border-danger!" : ""}`} />
                </Field>
                <Field id="mt-time" label="সময়" required>
                  <input id="mt-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} px-[11px] ${show("when") ? "border-danger!" : ""}`} />
                </Field>
              </div>
            </div>
          </Card>

          <Card num="২" title="মিটিংয়ের এলাকা" sub="কারা সরাসরি যোগ দিতে পারবেন">
            <AreaPicker geo={geo} members={members} />
          </Card>

          <Card num="৩" title="আরও যাদের ডাকবেন" sub="না দিলেও চলবে · এলাকার বাইরের কেউ">
            <p className="mb-3 font-bn text-[12px] leading-[1.65] text-muted">
              এলাকার বাইরের নির্দিষ্ট কাউকে যোগ দেওয়ার সুযোগ দিতে চাইলে এখানে বেছে নিন — তাঁরা অনুরোধ ছাড়াই যোগ দিতে পারবেন।
            </p>
            <InvitePicker db={db} value={invitees} onChange={setInvitees} />
          </Card>

          <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white px-5 py-4 shadow-card">
            <p className="min-w-[200px] flex-1 font-bn text-[12px] text-muted">তৈরির পর আমন্ত্রণ লিংক পাবেন — যেকোনো সময় শেয়ার করতে পারবেন।</p>
            <Link href="/admin/meetings" className="px-2 font-bn text-[13.5px] font-semibold text-muted hover:text-ink">
              বাতিল
            </Link>
            <button type="submit" className="h-10 cursor-pointer rounded-button bg-primary px-5 font-bn text-[13.5px] font-semibold text-white hover:bg-primary-hover">
              মিটিং তৈরি করুন
            </button>
          </div>
        </div>

        <aside className="flex flex-col gap-4 font-bn xl:sticky xl:top-5">
          <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
            <h2 className="text-[14px] font-semibold">যেভাবে কাজ করে</h2>
            <ol className="mt-3 flex flex-col gap-3 text-[12.5px] leading-[1.7] text-muted">
              {[
                "এলাকা বেছে মিটিং তৈরি করুন এবং লিংকটি শেয়ার করুন।",
                "লিংক খুলে নিজের ALARM আইডি (KAR-…) দিলে লগইন ছাড়াই যোগ দেওয়া যায়।",
                "এলাকার ভেতরের আইডি সরাসরি লবিতে আসবে; বাইরের আইডি অনুরোধ পাঠাবে — আপনি অনুমোদন দেবেন।",
                "আপনি মিটিং শুরু করলে সবাই অডিও রুমে যোগ দিতে পারবেন।",
              ].map((t, i) => (
                <li key={t} className="flex gap-2.5">
                  <span className="flex size-5 flex-none items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{bn(i + 1)}</span>
                  {t}
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
            <h2 className="text-[14px] font-semibold">সরাসরি যোগ দিতে পারবেন</h2>
            <p className="mt-1 text-[28px] font-bold leading-none text-primary">{bn(members + invitees.filter((id) => !memberIds.has(id)).length)}</p>
            <p className="mt-1 text-[12px] text-muted">
              এলাকার {bn(members)} জন{invitees.length ? ` + ${bn(invitees.filter((id) => !memberIds.has(id)).length)} জন আমন্ত্রিত` : ""}
            </p>
          </section>
        </aside>
      </form>
    </>
  );
}
