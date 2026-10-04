import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { MeetingJoin } from "@/components/home/meeting-join";
import { getSession } from "@/lib/auth-server";
import { HOME, ROLE_LABEL } from "@/lib/session";

export const metadata: Metadata = { title: "ALARM — অডিট ও জবাবদিহিতা প্ল্যাটফর্ম" };

const NAV = [
  { href: "#how", label: "কীভাবে কাজ করে" },
  { href: "#roles", label: "কারা ব্যবহার করেন" },
  { href: "#principles", label: "আমাদের নীতি" },
  { href: "#faq", label: "প্রশ্নোত্তর" },
];

const STEPS = [
  { title: "দায়িত্ব বণ্টন", body: "প্রধান নির্বাহী সম্পাদক প্রোফাইল খোলেন এবং নির্বাচনী এলাকা অনুযায়ী তদন্ত সম্পাদক ও নির্বাহী সম্পাদককে দায়িত্ব দেন।" },
  { title: "তথ্য সংগ্রহ", body: "তদন্ত সম্পাদক কার্যক্রমের তথ্য, ছবি ও নথি সংগ্রহ করে পর্যালোচনার জন্য জমা দেন।" },
  { title: "যাচাই", body: "নির্বাহী সম্পাদক প্রমাণ মিলিয়ে তথ্য গ্রহণ বা কারণসহ বাতিল করেন।" },
  { title: "আপত্তি ও শুনানি", body: "রাজনৈতিক কর্মী আপত্তি জানালে প্রধান নির্বাহী সম্পাদক কারণসহ লিখিত সিদ্ধান্ত দেন।" },
  { title: "প্রতিবেদন", body: "যাচাইকৃত তথ্য থেকে প্রতিবেদন তৈরি হয়; নির্বাহী সম্পাদকের স্বাক্ষরে চূড়ান্ত হয়।" },
];

// Ranked: ১ প্রধান নির্বাহী সম্পাদক · ২ নির্বাহী সম্পাদক · ৩ তদন্ত সম্পাদক · ৪ রাজনৈতিক কর্মী.
const ROLES = [
  { name: "প্রধান নির্বাহী সম্পাদক", color: "#006A4E", points: ["অ্যাকাউন্ট তৈরি ও দায়িত্ব বণ্টন", "অভিযোগ নিষ্পত্তি ও মিটিং পরিচালনা", "প্রতিবেদন তদারকি"] },
  { name: "নির্বাহী সম্পাদক", color: "#1D6FC0", points: ["জমা যাচাই ও সিদ্ধান্ত", "প্রয়োজনে তথ্য সংশোধন", "প্রতিবেদনে স্বাক্ষর"] },
  { name: "তদন্ত সম্পাদক", color: "#D97706", points: ["নির্ধারিত এলাকায় তথ্য সংগ্রহ", "প্রমাণসহ জমা দেওয়া", "জমার অবস্থা দেখা"] },
  { name: "রাজনৈতিক কর্মী", color: "#7A3FA8", points: ["নিজের প্রোফাইল দেখা", "নিজের কার্যক্রম যোগ করা", "আপত্তি জানানো"] },
];

const PRINCIPLES: { title: string; body: string; icon: ReactNode }[] = [
  { title: "যাচাই ছাড়া প্রকাশ নয়", body: "নির্বাহী সম্পাদকের সিদ্ধান্ত ছাড়া কোনো তথ্য প্রোফাইলে যায় না।", icon: <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" /> },
  {
    title: "দায়িত্বের পৃথকীকরণ",
    body: "যিনি তথ্য সংগ্রহ করেন, তিনি সিদ্ধান্ত দেন না।",
    icon: (
      <>
        <circle cx="6.5" cy="7" r="2.6" />
        <circle cx="13.5" cy="7" r="2.6" />
        <path d="M2.5 16c.6-2.4 2.1-3.6 4-3.6M17.5 16c-.6-2.4-2.1-3.6-4-3.6" strokeLinecap="round" />
      </>
    ),
  },
  { title: "আপত্তির অধিকার", body: "প্রকাশিত যেকোনো তথ্যে আপত্তি জানানো যায়।", icon: <path d="M4 4.5h12v8.5H9l-3.5 3v-3H4Z" strokeLinejoin="round" /> },
  {
    title: "সম্পূর্ণ অডিট লগ",
    body: "প্রতিটি জমা ও সিদ্ধান্ত সময়সহ সংরক্ষিত থাকে।",
    icon: (
      <>
        <rect x="4" y="3" width="12" height="14" rx="1.6" />
        <path d="M7 7.5h6M7 10.5h6M7 13.5h3.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "গোপনীয় প্রোফাইল",
    body: "প্রত্যেকে শুধু নিজের প্রয়োজনীয় তথ্য দেখেন।",
    icon: (
      <>
        <rect x="4.5" y="9" width="11" height="8" rx="1.6" />
        <path d="M7 9V6.8a3 3 0 0 1 6 0V9" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "মানুষের স্বাক্ষরে চূড়ান্ত",
    body: "প্রতিবেদন চূড়ান্ত হয় নির্বাহী সম্পাদকের স্বাক্ষরে।",
    icon: <path d="M3.5 15.5c2-3 3.4-.2 5-2.2s1.6-5.3 3.6-4.4-.6 5.4 1.6 5.6c1.2.1 1.9-1 2.8-1.9M3.5 17.5h13" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

const FAQ = [
  {
    q: "কীভাবে অ্যাকাউন্ট পাব?",
    a: "এই প্ল্যাটফর্মে নিজে নিবন্ধনের সুযোগ নেই। প্রধান নির্বাহী সম্পাদক অথবা আপনার এলাকার নির্বাহী সম্পাদক অ্যাকাউন্ট তৈরি করে মোবাইল নম্বর, প্রাথমিক পাসওয়ার্ড ও ALARM আইডি জানিয়ে দেন।",
  },
  {
    q: "ALARM আইডি কোথায় পাব?",
    a: "আপনার আইডি KAR- এবং ৬টি সংখ্যা (যেমন KAR-123456)। লগইন করলে পোর্টালের বাম পাশে নামের নিচে ও সেটিংস পাতায় দেখা যায়। মিটিংয়ে যোগ দিতে এই আইডি লাগে।",
  },
  {
    q: "আমার প্রোফাইল কে দেখতে পারেন?",
    a: "প্রোফাইল জনসাধারণের জন্য উন্মুক্ত নয়। শুধু প্রধান নির্বাহী সম্পাদক, আপনার এলাকার নির্বাহী সম্পাদক ও দায়িত্বপ্রাপ্ত তদন্ত সম্পাদক এটি দেখতে পারেন।",
  },
  {
    q: "কোনো তথ্য ভুল মনে হলে কী করব?",
    a: "প্রকাশিত কার্যক্রম খুলে “অভিযোগ জানান” বেছে নিন, কারণ লিখুন এবং প্রয়োজনে প্রমাণ দিন। প্রধান নির্বাহী সম্পাদক কারণসহ সিদ্ধান্ত জানাবেন।",
  },
  {
    q: "পাসওয়ার্ড ভুলে গেলে কী করব?",
    a: "লগইন করা অবস্থায় সেটিংস থেকে পুরোনো পাসওয়ার্ড দিয়ে নতুন পাসওয়ার্ড তৈরি করতে পারবেন। পাসওয়ার্ড ভুলে গেলে লগইন পাতার “পাসওয়ার্ড ভুলে গেছেন?” থেকে মোবাইল নম্বর ও ওটিপি দিয়ে নতুন পাসওয়ার্ড তৈরি করুন।",
  },
];

const BN = "০১২৩৪৫৬৭৮৯";

/** Public landing page, in the same look as the portals. Signed-in visitors get a shortcut to their portal. */
export default async function HomePage() {
  const session = await getSession();
  const portal = session ? HOME[session.role] : null;
  const cta = portal ? { href: portal, label: `${ROLE_LABEL[session!.role]} পোর্টালে যান` } : { href: "/login", label: "লগইন করুন" };

  return (
    <div lang="bn" className="flex min-h-screen flex-col bg-surface font-bn text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1160px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="ALARM হোম">
            <Logo size={46} priority />
            <span className="flex flex-col gap-1">
              <span className="font-sans text-[18px] font-bold leading-none tracking-[0.13em] text-primary">ALARM</span>
              <span className="hidden text-[10.5px] leading-none text-muted sm:block">অডিট ও জবাবদিহিতা প্ল্যাটফর্ম</span>
            </span>
          </Link>
          <nav aria-label="পাতার অংশ" className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-button px-3 py-2 text-[14px] text-muted hover:bg-surface hover:text-primary">
                {n.label}
              </a>
            ))}
          </nav>
          <Link href={cta.href} className="ml-auto inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover lg:ml-3">
            {cta.label}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-line bg-[linear-gradient(180deg,#FFFFFF_0%,#F4F9F7_100%)]">
          <div className="mx-auto grid max-w-[1160px] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
            <div>
              <p className="text-[13px] font-semibold text-primary">রাজনৈতিক কর্মীদের কার্যক্রমের নিরীক্ষা</p>
              <h1 className="mt-3 text-[32px] font-bold leading-[1.35] text-ink text-balance sm:text-[42px]">প্রমাণভিত্তিক, স্বচ্ছ ও জবাবদিহিমূলক নিরীক্ষা</h1>
              <p className="mt-4 max-w-[560px] text-[15.5px] leading-[1.85] text-muted text-pretty">
                মাঠ পর্যায়ের প্রমাণ সংগ্রহ, স্বাধীন যাচাই ও লিখিত শুনানির মাধ্যমে প্রতিটি তথ্য যাচাই করা হয়। প্রতিটি সিদ্ধান্ত সংরক্ষিত থাকে অডিট লগে।
              </p>
              <ul className="mt-6 flex flex-col gap-2.5 text-[14px] text-ink">
                {["যাচাই ছাড়া কোনো তথ্য প্রকাশিত হয় না", "প্রকাশিত তথ্যে আপত্তি জানানোর সুযোগ", "সকল নিবন্ধন প্রধান নির্বাহী সম্পাদক/নির্বাহী সম্পাদক কর্তৃক নিবন্ধিত করতে হবে।"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <span className="flex size-5 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <section aria-label="শুরু করুন" className="rounded-card border border-line bg-white shadow-card">
              <div className="border-b border-line px-6 py-4">
                <h2 className="text-[16px] font-semibold">শুরু করুন</h2>
                <p className="mt-0.5 text-[12.5px] text-muted">আপনার প্রয়োজন অনুযায়ী বেছে নিন</p>
              </div>
              <div className="px-6 py-5">
                <div className="text-[13px] font-semibold">অ্যাকাউন্ট আছে?</div>
                <p className="mt-0.5 text-[12px] text-muted">মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে নিজের পোর্টালে প্রবেশ করুন।</p>
                <Link href={cta.href} className="mt-3 flex h-11 w-full items-center justify-center rounded-button bg-primary text-[14px] font-semibold text-white hover:bg-primary-hover">
                  {cta.label}
                </Link>
              </div>
              <div className="flex items-center gap-3 px-6">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[12px] text-muted">অথবা</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="px-6 pt-4 pb-6">
                <MeetingJoin />
              </div>
            </section>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20">
          <div className="mx-auto max-w-[1160px] px-4 py-16 sm:px-6 lg:py-20">
            <SectionHead title="কীভাবে কাজ করে" body="প্রতিটি ধাপে আলাদা দায়িত্ব — একজনের হাতে পুরো প্রক্রিয়া থাকে না।" />
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-card border border-line bg-white p-5 shadow-card">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-[14px] font-semibold text-white">{BN[i + 1]}</span>
                  <h3 className="mt-4 text-[15.5px] font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-[1.75] text-muted text-pretty">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-20 border-y border-line bg-white">
          <div className="mx-auto max-w-[1160px] px-4 py-16 sm:px-6 lg:py-20">
            <SectionHead title="কারা ব্যবহার করেন" body="লগইনের পর আপনার ভূমিকা অনুযায়ী নিজের পোর্টাল খুলবে।" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ROLES.map((r) => (
                <article key={r.name} className="rounded-card border border-l-[3px] border-line bg-white p-5 shadow-card" style={{ borderLeftColor: r.color }}>
                  <h3 className="text-[16px] font-semibold">{r.name}</h3>
                  <ul className="mt-3 flex flex-col gap-2">
                    {r.points.map((p) => (
                      <li key={p} className="flex gap-2 text-[13px] leading-[1.6] text-muted">
                        <span className="mt-[7px] size-1.5 flex-none rounded-full" style={{ background: r.color }} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section id="principles" className="scroll-mt-20">
          <div className="mx-auto max-w-[1160px] px-4 py-16 sm:px-6 lg:py-20">
            <SectionHead title="আমাদের নীতি" body="ন্যায্য ও বিশ্বাসযোগ্য নিরীক্ষার জন্য প্ল্যাটফর্মের প্রতিটি নিয়ম তৈরি।" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="flex gap-4 rounded-card border border-line bg-white p-5 shadow-card">
                  <span className="flex size-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      {p.icon}
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold">{p.title}</h3>
                    <p className="mt-1 text-[13px] leading-[1.7] text-muted text-pretty">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-line bg-white">
          <div className="mx-auto grid max-w-[1160px] gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
            <SectionHead title="প্রশ্নোত্তর" body="আরও কিছু জানার থাকলে আপনার প্রতিষ্ঠানের প্রধান নির্বাহী সম্পাদকের সঙ্গে যোগাযোগ করুন।" />
            <div className="flex flex-col gap-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-card border border-line bg-white open:shadow-card">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-[15px] font-semibold leading-[1.55] [&::-webkit-details-marker]:hidden">
                    <span className="flex-1">{f.q}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="flex-none text-muted transition-transform group-open:rotate-180">
                      <path d="m3 5 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <p className="px-5 pb-5 text-[13.5px] leading-[1.85] text-muted text-pretty">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-6 sm:px-6">
          <span className="flex items-center gap-2">
            <Logo size={34} />
            <span className="font-sans text-[14px] font-bold tracking-[0.12em] text-primary">ALARM</span>
          </span>
          <nav aria-label="ফুটার" className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-primary">
                {n.label}
              </a>
            ))}
            <Link href={cta.href} className="hover:text-primary">
              {portal ? "আমার পোর্টাল" : "লগইন"}
            </Link>
          </nav>
          <span className="ml-auto font-sans text-[12px] text-muted">© 2026 Alarm Bangladesh</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-[620px]">
      <h2 className="text-[24px] font-bold leading-[1.4] sm:text-[28px]">{title}</h2>
      <p className="mt-2 text-[14.5px] leading-[1.8] text-muted text-pretty">{body}</p>
    </div>
  );
}

function Check() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="m2.5 6.2 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
