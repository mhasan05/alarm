import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "লগইন · ALARM" };


/** `?next=` returns to the page that required sign-in. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, signedOut, reset } = await searchParams;
  const notice = reset ? "পাসওয়ার্ড বদলানো হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।" : signedOut ? "আপনি লগআউট করেছেন।" : undefined;
  return (
    <main lang="bn" className="flex min-h-screen font-bn flex-col items-center justify-center gap-6 bg-[radial-gradient(120%_90%_at_50%_0%,#F4F9F7_0%,#FFFFFF_62%)] px-6 py-10">
      <div className="w-full max-w-[434px] overflow-hidden rounded-card border border-line bg-white shadow-card">
        <Link href="/" aria-label="ALARM হোম" className="block bg-primary px-8 py-[26px]">
          <BrandLockup />
        </Link>

        <div className="p-8">
          <h1 className="text-[19px] font-semibold leading-[1.5] text-ink">আপনার অ্যাকাউন্টে লগইন করুন</h1>
          <p className="mt-1 text-[13px] leading-[1.6] text-muted">অডিট ও জবাবদিহিতা ব্যবস্থা</p>

          <LoginForm next={typeof next === "string" ? next : undefined} notice={notice} />
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
