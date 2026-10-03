import { StateCard } from "./state-card";

/** Shown when a detail page's record doesn't exist or isn't visible to this account. */
export function RecordMissing({ title = "তথ্যটি পাওয়া যায়নি", body, backHref, backLabel }: { title?: string; body?: string; backHref: string; backLabel: string }) {
  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-7">
      <div className="w-full max-w-md overflow-hidden rounded-card border border-line bg-white shadow-card">
        <StateCard
          tone="neutral"
          icon="⌕"
          title={title}
          body={body ?? "ঠিকানাটি ভুল, রেকর্ডটি সরানো হয়েছে, অথবা এটি আপনার অ্যাকাউন্ট থেকে দেখা যায় না।"}
          actions={[{ label: backLabel, href: backHref }]}
        />
      </div>
    </div>
  );
}
