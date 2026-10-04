import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { DEMO_MODE } from "@/lib/demo";
import { LoginForm, type DemoAccount } from "./login-form";

export const metadata: Metadata = { title: "লগইন · ALARM" };

const DEMO: DemoAccount[] = [
  {
    phone: "01711448290",
    initials: "র",
    bnInitials: true,
    name: "আব্দুল করিম শেখ · রাজনৈতিক কর্মী",
    description: "নিজের প্রোফাইল দেখেন, কার্যক্রম যোগ করেন, অভিযোগ জানান",
    bnDescription: true,
    fg: "text-role-politician",
    tint: "bg-role-politician/12",
    hover: "hover:border-role-politician hover:bg-role-politician-tint",
  },
  {
    phone: "01711000001",
    initials: "অ",
    bnInitials: true,
    name: "রাজিব খান · প্রধান নির্বাহী সম্পাদক",
    description: "অ্যাকাউন্ট অনুমোদন, অভিযোগ নিষ্পত্তি, বিশ্লেষণ ও প্রতিবেদন",
    bnDescription: true,
    fg: "text-role-admin",
    tint: "bg-role-admin/12",
    hover: "hover:border-primary hover:bg-surface",
  },
  {
    phone: "01755432198",
    initials: "প",
    bnInitials: true,
    name: "ফারহানা ইয়াসমিন · নির্বাহী সম্পাদক",
    description: "জমা গ্রহণ বা বাতিল করেন, চূড়ান্ত প্রতিবেদনে স্বাক্ষর দেন",
    bnDescription: true,
    fg: "text-role-reviewer",
    tint: "bg-role-reviewer/12",
    hover: "hover:border-primary hover:bg-surface",
  },
  {
    phone: "01712440918",
    initials: "ম",
    bnInitials: true,
    name: "জাহিদুল হক · তদন্ত সম্পাদক",
    description: "মাঠ থেকে তথ্য সংগ্রহ করে জমা দেন",
    bnDescription: true,
    fg: "text-role-staff",
    tint: "bg-role-staff/12",
    hover: "hover:border-primary hover:bg-surface",
  },
];

/** `?next=` returns to the page that required sign-in. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, signedOut, reset } = await searchParams;
  const notice = reset ? "পাসওয়ার্ড পরিবর্তন হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।" : signedOut ? "আপনি লগআউট করেছেন।" : undefined;
  return (
    <main lang="bn" className="flex min-h-screen font-bn flex-col items-center justify-center gap-6 bg-[radial-gradient(120%_90%_at_50%_0%,#F4F9F7_0%,#FFFFFF_62%)] px-6 py-10">
      <div className="w-full max-w-[434px] overflow-hidden rounded-card border border-line bg-white shadow-card">
        <Link href="/" aria-label="ALARM হোম" className="block bg-primary px-8 py-[26px]">
          <BrandLockup />
        </Link>

        <div className="p-8">
          <h1 className="text-[19px] font-semibold leading-[1.5] text-ink">আপনার অ্যাকাউন্টে লগইন করুন</h1>
          <p className="mt-1 text-[13px] leading-[1.6] text-muted">অডিট ও জবাবদিহিতা ব্যবস্থা</p>

          <LoginForm next={typeof next === "string" ? next : undefined} demo={DEMO_MODE ? DEMO : undefined} notice={notice} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11.5px] text-muted">
        <Link href="/" className="font-semibold text-primary hover:text-primary-hover">
          ← হোমপেজে ফিরুন
        </Link>
        <span className="font-sans">© 2026 Alarm Bangladesh</span>
      </div>
    </main>
  );
}
