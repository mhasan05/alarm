"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CODE = /([a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4})/i;

/** Paste a meeting link or code and go to the meeting page, where the ALARM ID is asked. */
export function MeetingJoin() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const code = value.match(CODE)?.[1]?.toLowerCase();
        if (!code) return setError("সঠিক মিটিং লিংক বা কোড দিন — যেমন abcd-efgh-jkmn।");
        router.push(`/meet/${code}`);
      }}
    >
      <label htmlFor="home-meet" className="text-[13px] font-semibold text-ink">
        মিটিং লিংক বা কোড
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="home-meet"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          placeholder="abcd-efgh-jkmn"
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? "home-meet-error" : undefined}
          className={`h-11 min-w-0 flex-1 rounded-input border bg-white px-3 font-mono text-[14px] outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,106,78,0.10)] ${error ? "border-danger" : "border-line"}`}
        />
        <button type="submit" className="h-11 flex-none cursor-pointer rounded-button border border-primary bg-white px-4 text-[13.5px] font-semibold text-primary hover:bg-surface">
          যোগ দিন
        </button>
      </div>
      {error ? (
        <p id="home-meet-error" role="alert" className="mt-1.5 text-[12px] text-danger">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-[12px] leading-[1.6] text-muted">লগইন লাগবে না — পরের ধাপে আপনার ALARM আইডি (KAR-…) দিন।</p>
      )}
    </form>
  );
}
