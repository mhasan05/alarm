import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { HomeTabBar } from "@/components/home/home-tab-bar";
import { MeetingJoin } from "@/components/home/meeting-join";
import { getSession } from "@/lib/auth-server";
import { HOME, ROLE_LABEL } from "@/lib/session";

export const metadata: Metadata = { title: "ALARM — অডিট ও জবাবদিহিতা প্ল্যাটফর্ম" };

const NAV = [
  { href: "#how", label: "কীভাবে কাজ করে" },
  { href: "#roles", label: "কারা ব্যবহার করেন" },
  { href: "#principles", label: "আমাদের নীতি" },
  { href: "#faq", label: "প্রশ্ন ও উত্তর" },
];

const STEPS = [
  { title: "দায়িত্ব ভাগ করে দেওয়া", body: "প্রধান নির্বাহী সম্পাদক প্রোফাইল খোলেন এবং নির্বাচনী এলাকা অনুযায়ী তদন্ত সম্পাদক ও নির্বাহী সম্পাদককে দায়িত্ব দেন।" },
  { title: "তথ্য সংগ্রহ", body: "তদন্ত সম্পাদক কাজের তথ্য, ছবি ও কাগজপত্র সংগ্রহ করে যাচাইয়ের জন্য জমা দেন।" },
  { title: "যাচাই", body: "নির্বাহী সম্পাদক প্রমাণ মিলিয়ে তথ্য গ্রহণ বা কারণসহ বাতিল করেন।" },
  { title: "আপত্তি ও শুনানি", body: "রাজনৈতিক কর্মী আপত্তি জানালে প্রধান নির্বাহী সম্পাদক কারণসহ লিখিত সিদ্ধান্ত দেন।" },
  { title: "প্রতিবেদন", body: "যাচাই করা তথ্য থেকে প্রতিবেদন তৈরি হয়; নির্বাহী সম্পাদক সই করলে চূড়ান্ত হয়।" },
];

// Ranked: ১ প্রধান নির্বাহী সম্পাদক · ২ নির্বাহী সম্পাদক · ৩ তদন্ত সম্পাদক · ৪ রাজনৈতিক কর্মী.
const ROLES = [
  { name: "প্রধান নির্বাহী সম্পাদক", color: "#006A4E", points: ["অ্যাকাউন্ট তৈরি ও দায়িত্ব ভাগ করে দেওয়া", "যেকোনো জমা এডিট ও অভিযোগের সমাধান", "মিটিং ও প্রতিবেদন দেখাশোনা"] },
  { name: "নির্বাহী সম্পাদক", color: "#1D6FC0", points: ["জমা যাচাই ও সিদ্ধান্ত", "দরকার হলে তথ্য ঠিক করা", "প্রতিবেদনে সই"] },
  { name: "তদন্ত সম্পাদক", color: "#D97706", points: ["দেওয়া এলাকায় তথ্য সংগ্রহ", "প্রমাণসহ জমা দেওয়া", "জমার অবস্থা দেখা"] },
  { name: "রাজনৈতিক কর্মী", color: "#7A3FA8", points: ["নিজের প্রোফাইল দেখা", "নিজের কাজ যোগ করা", "আপত্তি জানানো"] },
];

const PRINCIPLES: { title: string; body: string; icon: ReactNode }[] = [
  { title: "যাচাই ছাড়া প্রকাশ নয়", body: "নির্বাহী সম্পাদকের সিদ্ধান্ত ছাড়া কোনো তথ্য প্রোফাইলে যায় না।", icon: <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" /> },
  {
    title: "আলাদা আলাদা দায়িত্ব",
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
    title: "পুরো অডিট লগ",
    body: "প্রতিটি জমা ও সিদ্ধান্ত সময়সহ লেখা থাকে।",
    icon: (
      <>
        <rect x="4" y="3" width="12" height="14" rx="1.6" />
        <path d="M7 7.5h6M7 10.5h6M7 13.5h3.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "গোপনীয় প্রোফাইল",
    body: "প্রত্যেকে শুধু নিজের দরকারি তথ্য দেখেন।",
    icon: (
      <>
        <rect x="4.5" y="9" width="11" height="8" rx="1.6" />
        <path d="M7 9V6.8a3 3 0 0 1 6 0V9" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "মানুষের সইয়ে চূড়ান্ত",
    body: "প্রতিবেদন চূড়ান্ত হয় নির্বাহী সম্পাদকের সইয়ে।",
    icon: <path d="M3.5 15.5c2-3 3.4-.2 5-2.2s1.6-5.3 3.6-4.4-.6 5.4 1.6 5.6c1.2.1 1.9-1 2.8-1.9M3.5 17.5h13" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

const FAQ = [
  {
    q: "কীভাবে অ্যাকাউন্ট পাব?",
    a: "এই প্ল্যাটফর্মে নিজে নিবন্ধনের সুযোগ নেই। প্রধান নির্বাহী সম্পাদক অথবা আপনার এলাকার নির্বাহী সম্পাদক অ্যাকাউন্ট তৈরি করে মোবাইল নম্বর, প্রথম পাসওয়ার্ড ও ALARM আইডি জানিয়ে দেন।",
  },
  {
    q: "ALARM আইডি কোথায় পাব?",
    a: "আপনার আইডি KAR- এবং ৬টি সংখ্যা (যেমন KAR-123456)। লগইন করলে পোর্টালের বাম পাশে নামের নিচে ও সেটিংস পাতায় দেখা যায়। মিটিংয়ে যোগ দিতে এই আইডি লাগে।",
  },
  {
    q: "আমার প্রোফাইল কে দেখতে পারেন?",
    a: "প্রোফাইল সবার জন্য খোলা নয়। শুধু প্রধান নির্বাহী সম্পাদক, আপনার এলাকার নির্বাহী সম্পাদক ও দায়িত্বে থাকা তদন্ত সম্পাদক এটি দেখতে পারেন।",
  },
  {
    q: "কোনো তথ্য ভুল মনে হলে কী করব?",
    a: "প্রকাশিত কাজটি খুলে “অভিযোগ জানান” বেছে নিন, কারণ লিখুন এবং দরকার হলে প্রমাণ দিন। প্রধান নির্বাহী সম্পাদক/নির্বাহী সম্পাদক কারণসহ সিদ্ধান্ত জানাবেন।",
  },
  {
    q: "পাসওয়ার্ড ভুলে গেলে কী করব?",
    a: "লগইন করা অবস্থায় সেটিংস থেকে পুরোনো পাসওয়ার্ড দিয়ে নতুন পাসওয়ার্ড তৈরি করতে পারবেন। পাসওয়ার্ড ভুলে গেলে লগইন পাতার “পাসওয়ার্ড ভুলে গেছেন?” থেকে মোবাইল নম্বর ও ওটিপি দিয়ে নতুন পাসওয়ার্ড তৈরি করুন।",
  },
];

const BN = "০১২৩৪৫৬৭৮৯";

/** ALARM's purpose, in the client's words. */
const PURPOSE = "গণতান্ত্রিক ও রাজনৈতিক বন্দোবস্তের মাধ্যমে দলীয় নেতাকর্মীদের সুসংগঠিত করতে সহযোগিতা করা।";

const REGISTRATION_NOTE = "সকল নিবন্ধন প্রধান নির্বাহী সম্পাদক/নির্বাহী সম্পাদক কর্তৃক নিবন্ধিত করতে হবে।";

/** The three promises, shown as app tiles on phones. */
const HIGHLIGHTS: { title: string; body: string; icon: ReactNode }[] = [
  { title: "যাচাই ছাড়া প্রকাশ নয়", body: "নির্বাহী সম্পাদক দেখে নেওয়ার পরই তথ্য প্রোফাইলে যায়", icon: <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" /> },
  { title: "আপত্তির সুযোগ", body: "ভুল মনে হলে কারণসহ অভিযোগ জানানো যায়", icon: <path d="M4 4.5h12v8.5H9l-3.5 3v-3H4Z" strokeLinejoin="round" /> },
  {
    title: "পুরো অডিট লগ",
    body: "প্রতিটি জমা ও সিদ্ধান্ত সময়সহ লেখা থাকে",
    icon: (
      <>
        <rect x="4" y="3" width="12" height="14" rx="1.6" />
        <path d="M7 7.5h6M7 10.5h6M7 13.5h3.5" strokeLinecap="round" />
      </>
    ),
  },
];

/**
 * Public landing page. On phones it looks and works like a mobile app (app bar, welcome card, bottom
 * tab bar); on desktop it is a regular page in the portals' style. Signed-in visitors get a shortcut
 * to their portal.
 */
export default async function HomePage() {
  const session = await getSession();
  const portal = session ? HOME[session.role] : null;
  const cta = portal ? { href: portal, label: `${ROLE_LABEL[session!.role]} পোর্টালে যান` } : { href: "/login", label: "লগইন করুন" };

  return (
    <div lang="bn" className="flex min-h-screen flex-col bg-surface font-bn text-ink max-lg:pb-[calc(60px+env(safe-area-inset-bottom))]">
      {/* App bar on phones, full header on desktop */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1160px] items-center gap-6 px-4 sm:px-6 lg:h-16">
          <Link href="/" className="flex items-center gap-2.5" aria-label="ALARM হোম">
            <Logo size={46} priority className="h-9 w-auto lg:h-[46px]" />
            <span className="flex flex-col gap-1">
              <span className="font-sans text-[17px] font-bold leading-none tracking-[0.13em] text-primary lg:text-[18px]">ALARM</span>
              <span className="text-[10px] leading-none text-muted lg:text-[10.5px]">অডিট ও জবাবদিহিতা প্ল্যাটফর্ম</span>
            </span>
          </Link>
          <nav aria-label="পাতার অংশ" className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-button px-3 py-2 text-[14px] text-muted hover:bg-surface hover:text-primary">
                {n.label}
              </a>
            ))}
          </nav>
          <Link href={cta.href} className="ml-auto hidden h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover lg:ml-3 lg:inline-flex">
            {cta.label}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Phone: app home screen — one full screen: purpose, promises, login and virtual-meeting buttons ── */}
        <section id="top" aria-label="শুরু" className="flex min-h-[calc(100svh-56px-60px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] scroll-mt-16 flex-col lg:hidden">
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-b-[28px] bg-[linear-gradient(160deg,#007A59_0%,#006A4E_42%,#00402F_100%)] px-5 pt-7 pb-6 text-white shadow-[0_16px_32px_-18px_rgba(0,61,44,0.7)]">
            {/* Quiet texture: a fine grid fading out, and one soft glow. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:linear-gradient(180deg,black,transparent_75%)]" />
            <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-accent/20 blur-3xl" />

            <span className="relative inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11.5px] font-semibold text-accent-light">
              <span className="size-1.5 rounded-full bg-accent-light" aria-hidden="true" />
              রাজনৈতিক কর্মীদের কাজের যাচাই
            </span>
            <h1 className="relative mt-4 text-[27px] font-bold leading-[1.35] text-balance">প্রমাণভিত্তিক যাচাই, জবাবদিহিমূলক রাজনীতি</h1>
            <div className="relative mt-4 rounded-[14px] border-l-[3px] border-accent-light bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11.5px] font-semibold tracking-wide text-accent-light">এলার্মের উদ্দেশ্য</p>
              <p className="mt-1 text-[14px] font-semibold leading-[1.65] text-white">{PURPOSE}</p>
            </div>

            <ul className="relative mt-5 flex flex-col gap-2.5">
              {HIGHLIGHTS.map((h) => (
                <li key={h.title} className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.07] px-3.5 py-3 backdrop-blur-sm">
                  <span className="flex size-9 flex-none items-center justify-center rounded-full bg-white text-primary">
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      {h.icon}
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold leading-[1.4]">{h.title}</span>
                    <span className="block text-[11.5px] leading-[1.5] text-white/70">{h.body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <span aria-hidden="true" className="block min-h-6 flex-1" />
            <Link href={cta.href} className="relative flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-white text-[15.5px] font-semibold text-primary shadow-[0_8px_20px_-10px_rgba(0,0,0,0.45)] active:scale-[0.99]">
              {cta.label}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="relative mt-2.5">
              <MeetingJoin id="app-meet" onDark />
            </div>
            <p className="relative mt-3 text-center text-[11.5px] leading-[1.6] text-white/70">{REGISTRATION_NOTE}</p>
          </div>
          <div className="h-4" aria-hidden="true" />
        </section>

        {/* ── Desktop hero ── */}
        <section className="hidden border-b border-line bg-[linear-gradient(180deg,#FFFFFF_0%,#F4F9F7_100%)] lg:block">
          <div className="mx-auto grid max-w-[1160px] grid-cols-[1.15fr_0.85fr] items-center gap-10 px-6 py-20">
            <div>
              <p className="text-[13px] font-semibold text-primary">রাজনৈতিক কর্মীদের কাজের যাচাই</p>
              <h1 className="mt-3 text-[42px] font-bold leading-[1.35] text-ink text-balance">প্রমাণভিত্তিক যাচাই, জবাবদিহিমূলক রাজনীতি</h1>
              <p className="mt-4 max-w-[560px] text-[15.5px] leading-[1.85] text-muted text-pretty">
                মাঠ থেকে প্রমাণ সংগ্রহ, স্বাধীন যাচাই ও লিখিত শুনানির মাধ্যমে প্রতিটি তথ্য যাচাই করা হয়। প্রতিটি সিদ্ধান্ত অডিট লগে লেখা থাকে।
              </p>
              <div className="mt-6 max-w-[580px] rounded-card border border-l-[4px] border-line border-l-accent bg-white px-5 py-4 shadow-card">
                <p className="text-[12px] font-semibold tracking-wide text-accent-ink">এলার্মের উদ্দেশ্য</p>
                <p className="mt-1 text-[17px] font-semibold leading-[1.65] text-ink">{PURPOSE}</p>
              </div>
              <ul className="mt-6 flex flex-col gap-2.5 text-[14px] text-ink">
                {["যাচাই ছাড়া কোনো তথ্য প্রকাশ হয় না", "প্রকাশিত তথ্যে আপত্তি জানানোর সুযোগ", REGISTRATION_NOTE].map((t) => (
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
                <p className="mt-0.5 text-[12.5px] text-muted">আপনার দরকার মতো বেছে নিন</p>
              </div>
              <div className="px-6 py-5">
                <div className="text-[13px] font-semibold">অ্যাকাউন্ট আছে?</div>
                <p className="mt-0.5 text-[12px] text-muted">মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে নিজের পোর্টালে ঢুকুন।</p>
                <Link href={cta.href} className="mt-3 flex h-11 w-full items-center justify-center rounded-button bg-primary text-[14px] font-semibold text-white hover:bg-primary-hover">
                  {cta.label}
                </Link>
              </div>
              <div className="border-t border-line px-6 pt-4 pb-6">
                <div className="text-[13px] font-semibold">ভার্চুয়াল সভা আছে?</div>
                <p className="mt-0.5 mb-3 text-[12px] text-muted">সভার লিংক বা কোড দিয়ে যোগ দিন — লগইন লাগবে না।</p>
                <MeetingJoin />
              </div>
            </section>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 lg:scroll-mt-20">
          <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 sm:py-14 lg:py-20">
            <SectionHead title="কীভাবে কাজ করে" body="প্রতিটি ধাপে আলাদা দায়িত্ব — পুরো কাজ একজনের হাতে থাকে না।" />
            {/* Phone: vertical timeline */}
            <ol className="mt-5 rounded-[18px] border border-line bg-white px-4 py-4 shadow-card sm:hidden">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {i < STEPS.length - 1 && <span aria-hidden="true" className="absolute top-8 bottom-0 left-[15px] w-px bg-line" />}
                  <span className="relative flex size-8 flex-none items-center justify-center rounded-full bg-primary text-[13.5px] font-semibold text-white">{BN[i + 1]}</span>
                  <div className="pt-1">
                    <h3 className="text-[14.5px] font-semibold">{s.title}</h3>
                    <p className="mt-1 text-[12.5px] leading-[1.7] text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ol className="mt-8 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-5">
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

        {/* Roles — swipeable cards on phones */}
        <section id="roles" className="scroll-mt-16 border-line sm:border-y sm:bg-white lg:scroll-mt-20">
          <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 sm:py-14 lg:py-20">
            <SectionHead title="কারা ব্যবহার করেন" body="লগইনের পর আপনার ভূমিকা অনুযায়ী নিজের পোর্টাল খুলবে।" />
            <div className="-mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
              {ROLES.map((r, i) => (
                <article key={r.name} className="w-[78%] flex-none snap-start rounded-[18px] border border-l-[3px] border-line bg-white py-5 pr-5 pl-6 shadow-card sm:w-auto sm:rounded-card" style={{ borderLeftColor: r.color }}>
                  <span className="text-[11.5px] font-semibold" style={{ color: r.color }}>
                    ভূমিকা {BN[i + 1]}
                  </span>
                  <h3 className="mt-1 text-[16px] font-semibold">{r.name}</h3>
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
            <p className="mt-2 text-center text-[11.5px] text-muted sm:hidden">পাশে সরিয়ে সব ভূমিকা দেখুন</p>
          </div>
        </section>

        {/* Principles */}
        <section id="principles" className="scroll-mt-16 lg:scroll-mt-20">
          <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 sm:py-14 lg:py-20">
            <SectionHead title="আমাদের নীতি" body="ন্যায্য ও বিশ্বাসযোগ্য যাচাইয়ের জন্যই প্ল্যাটফর্মের প্রতিটি নিয়ম তৈরি।" />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-3">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-white p-4 shadow-card sm:flex-row sm:gap-4 sm:rounded-card sm:p-5">
                  <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      {p.icon}
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-[13.5px] font-semibold leading-[1.45] sm:text-[15px]">{p.title}</h3>
                    <p className="mt-1 text-[12px] leading-[1.65] text-muted text-pretty sm:text-[13px] sm:leading-[1.7]">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 border-line sm:border-t sm:bg-white lg:scroll-mt-20">
          <div className="mx-auto grid max-w-[1160px] gap-5 px-4 py-8 sm:gap-8 sm:px-6 sm:py-14 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
            <SectionHead title="প্রশ্ন ও উত্তর" body="আরও কিছু জানার থাকলে আপনার প্রতিষ্ঠানের প্রধান নির্বাহী সম্পাদকের সঙ্গে যোগাযোগ করুন।" />
            <div className="flex flex-col gap-2.5 sm:gap-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-[16px] border border-line bg-white open:shadow-card sm:rounded-card">
                  <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-[14.5px] font-semibold leading-[1.55] sm:px-5 sm:py-4 sm:text-[15px] [&::-webkit-details-marker]:hidden">
                    <span className="flex-1">{f.q}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="flex-none text-muted transition-transform group-open:rotate-180">
                      <path d="m3 5 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <p className="px-4 pb-4 text-[13px] leading-[1.85] text-muted text-pretty sm:px-5 sm:pb-5 sm:text-[13.5px]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="hidden border-t border-line bg-white lg:block">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-5 sm:px-6 sm:py-6">
          <span className="flex items-center gap-2">
            <Logo size={34} />
            <span className="font-sans text-[14px] font-bold tracking-[0.12em] text-primary">ALARM</span>
          </span>
          <nav aria-label="ফুটার" className="hidden flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-primary">
                {n.label}
              </a>
            ))}
            <Link href={cta.href} className="hover:text-primary">
              {portal ? "আমার পোর্টাল" : "লগইন"}
            </Link>
          </nav>
          <span className="ml-auto font-sans text-[12px] text-muted">© 2026 Bangladesh Alarm</span>
        </div>
      </footer>

      <HomeTabBar />
    </div>
  );
}

function SectionHead({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-[620px]">
      <h2 className="text-[20px] font-bold leading-[1.4] sm:text-[28px]">{title}</h2>
      <p className="mt-1 text-[13px] leading-[1.75] text-muted text-pretty sm:mt-2 sm:text-[14.5px] sm:leading-[1.8]">{body}</p>
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
