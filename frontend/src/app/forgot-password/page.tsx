import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = { title: "পাসওয়ার্ড ফিরে পান · ALARM" };

export default function ForgotPasswordPage() {
  return (
    <main lang="bn" className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[radial-gradient(120%_90%_at_50%_0%,#F4F9F7_0%,#FFFFFF_62%)] px-6 py-10 font-bn">
      <div className="w-full max-w-[434px] overflow-hidden rounded-card border border-line bg-white shadow-card">
        <Link href="/" aria-label="ALARM হোম" className="block bg-primary px-8 py-[26px]">
          <BrandLockup />
        </Link>
        <div className="p-8">
          <h1 className="text-[19px] font-semibold leading-[1.5] text-ink">পাসওয়ার্ড ভুলে গেছেন?</h1>
          <p className="mt-1 text-[13px] leading-[1.6] text-muted">মোবাইল নম্বর ও ওটিপি দিয়ে নতুন পাসওয়ার্ড তৈরি করুন।</p>
          <ForgotPasswordForm />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11.5px] text-muted">
        <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
          ← লগইন পাতায় ফিরুন
        </Link>
        <span className="font-sans">© 2026 Bangladesh Alarm</span>
      </div>
    </main>
  );
}
