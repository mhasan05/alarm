"use client";

import { useEffect } from "react";
import { StateCard } from "@/components/state-card";

/** Any page that fails to render: say nothing was lost and offer a retry. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-card border border-line bg-white shadow-card">
        <StateCard
          tone="danger"
          icon="!"
          title="পাতাটি খোলা যায়নি"
          body={
            <>
              কিছু একটা ঠিকমতো লোড হয়নি। আপনার কোনো তথ্য বা সিদ্ধান্ত হারায়নি — আবার চেষ্টা করুন।
              {error.digest && <span className="mt-1 block font-sans text-[11px]">Reference: {error.digest}</span>}
            </>
          }
          actions={[
            { label: "আবার চেষ্টা করুন", onClick: reset },
            { label: "হোমপেজ", href: "/", kind: "secondary" },
          ]}
        />
      </div>
    </div>
  );
}
