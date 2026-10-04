import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { StateCard } from "@/components/state-card";

export const metadata: Metadata = { title: "পাতা পাওয়া যায়নি · ALARM" };

/** Unknown routes and missing records (report, profile, staff…) land here. */
export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-1 items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
          <Logo size={34} />
          <span className="text-[14px] font-bold tracking-[0.13em] text-primary">ALARM</span>
        </div>
        <StateCard
          tone="neutral"
          icon="⌕"
          title="পাতাটি পাওয়া যায়নি"
          body="ঠিকানাটি ভুল, অথবা এই রেকর্ডটি আর নেই। আপনার কোনো তথ্য হারায়নি — হোম থেকে আবার খুঁজে নিন।"
          actions={[
            { label: "হোমপেজে যান", href: "/" },
            { label: "লগইন", href: "/login", kind: "secondary" },
          ]}
        />
      </div>
    </div>
  );
}
