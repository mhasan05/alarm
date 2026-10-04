import Link from "next/link";

export function AddActivityButton({ className = "h-[38px] px-4" }: { className?: string }) {
  return (
    <Link
      href="/politician/add-activity"
      className={`inline-flex items-center rounded-button bg-primary text-[13.5px] font-semibold text-white hover:bg-primary-hover ${className}`}
    >
      + কাজ যোগ করুন
    </Link>
  );
}
