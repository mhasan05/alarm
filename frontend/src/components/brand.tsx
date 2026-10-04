import Image from "next/image";

/** The ALARM emblem (public/logo.png, transparent background). Decorative next to the "ALARM" wordmark. */
export function Logo({ size = 40, alt = "", className = "", priority = false }: { size?: number; alt?: string; className?: string; priority?: boolean }) {
  return <Image src="/logo.png" alt={alt} width={Math.round((size * 497) / 512)} height={size} priority={priority} className={`flex-none select-none ${className}`} draggable={false} />;
}

/** White-on-green ALARM lockup used in card headers. */
export function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <Logo size={52} priority />
      <div className="flex flex-col gap-[3px]">
        <div className="text-[21px] font-bold leading-none tracking-[0.14em] text-white">ALARM</div>
        <div className="font-bn text-[11px] font-medium leading-none tracking-[0.02em] text-primary-soft">
          অডিট ও জবাবদিহিতা প্ল্যাটফর্ম
        </div>
      </div>
    </div>
  );
}
