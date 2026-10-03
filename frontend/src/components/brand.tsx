export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg width="19" height="21" viewBox="0 0 19 21" fill="none" aria-hidden="true" className={className}>
      <path
        d="M9.5 1.2 17.3 4v7.2c0 4.6-3.2 7.6-7.8 8.9-4.6-1.3-7.8-4.3-7.8-8.9V4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 10.6l2.4 2.5 4.4-4.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** White-on-green ALARM lockup used in card headers. */
export function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-[34px] flex-none items-center justify-center rounded-lg bg-white/15 text-white">
        <ShieldIcon />
      </div>
      <div className="flex flex-col gap-[3px]">
        <div className="text-[21px] font-bold leading-none tracking-[0.14em] text-white">ALARM</div>
        <div className="font-bn text-[11px] font-medium leading-none tracking-[0.02em] text-primary-soft">
          অডিট ও জবাবদিহিতা প্ল্যাটফর্ম
        </div>
      </div>
    </div>
  );
}
