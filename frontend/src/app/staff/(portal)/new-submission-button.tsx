import Link from "next/link";

export function NewSubmissionButton() {
  return (
    <Link
      href="/staff/submissions/new"
      className="inline-flex h-[38px] items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
    >
      + নতুন তথ্য জমা দিন
    </Link>
  );
}
