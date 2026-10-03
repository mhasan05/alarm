"use client";

import { Field, selectClass } from "@/components/form";
import { bn } from "@/lib/db/format";
import { areaLabel, isNationwide } from "@/lib/db/meetings";
import type { MeetingArea } from "@/lib/db/types";
import type { useGeoCascade } from "@/lib/use-geo-cascade";

type Geo = ReturnType<typeof useGeoCascade>;

/** The meeting's area from the cascade; levels left empty mean "any". */
export const areaFromGeo = ({ sel }: Geo): MeetingArea => ({ division: sel.division, district: sel.district, upazila: sel.upazila, thana: sel.area, ward: sel.ward });

/**
 * নির্বাচনী এলাকা picker for meetings. Each level narrows who may join without asking:
 * district only → that district; district + thana → that thana; nothing → everyone.
 */
export function AreaPicker({ geo, members }: { geo: Geo; members: number }) {
  const { sel, set, options, isCity } = geo;
  const area = areaFromGeo(geo);
  const all = isNationwide(area);
  return (
    <div className="font-bn">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-semibold">নির্বাচনী এলাকা · Constituency</span>
        {!all && (
          <button type="button" onClick={() => set.division("")} className="ml-auto h-7 cursor-pointer rounded-button border border-line px-2.5 text-[11.5px] font-semibold text-muted hover:border-primary hover:text-primary">
            সারা দেশ করুন
          </button>
        )}
      </div>
      <p className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-input border px-4 py-2.5 text-[13px] ${all ? "border-line bg-surface text-muted" : "border-success/40 bg-success/5 text-ink"}`}>
        <span className="font-semibold">{all ? "সারা দেশ — সব এলাকার ব্যবহারকারী যোগ দিতে পারবেন" : areaLabel(area)}</span>
        <span className="text-[12px] text-muted">· {bn(members)} জন সরাসরি যোগ দিতে পারবেন</span>
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field id="ar-division" label="বিভাগ">
          <select id="ar-division" value={sel.division} onChange={(e) => set.division(e.target.value)} className={selectClass}>
            <option value="">সব বিভাগ</option>
            {options.divisions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field id="ar-district" label="জেলা">
          <select id="ar-district" value={sel.district} disabled={!sel.division} onChange={(e) => set.district(e.target.value)} className={selectClass}>
            <option value="">{sel.division ? "সব জেলা" : "আগে বিভাগ বেছে নিন"}</option>
            {options.districts.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field id="ar-upazila" label="উপজেলা / সিটি কর্পোরেশন">
          <select id="ar-upazila" value={sel.upazila} disabled={!sel.district} onChange={(e) => set.upazila(e.target.value)} className={selectClass}>
            <option value="">{sel.district ? "সব এলাকা" : "আগে জেলা বেছে নিন"}</option>
            {options.upazilas.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field id="ar-thana" label={isCity ? "থানা" : "ইউনিয়ন / থানা"}>
          <select id="ar-thana" value={sel.area} disabled={!sel.upazila} onChange={(e) => set.area(e.target.value)} className={selectClass}>
            <option value="">{sel.upazila ? (isCity ? "সব থানা" : "সব ইউনিয়ন") : "আগে এলাকা বেছে নিন"}</option>
            {options.areas.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field id="ar-ward" label="ওয়ার্ড">
          <select id="ar-ward" value={sel.ward} disabled={!sel.area} onChange={(e) => set.ward(e.target.value)} className={selectClass}>
            <option value="">সব ওয়ার্ড</option>
            {options.wards.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
      </div>
      <p className="mt-3 text-[11.5px] leading-[1.65] text-muted">
        যত নিচের স্তর বাছবেন, এলাকা তত ছোট হবে — যেমন শুধু জেলা বাছলে সেই জেলার সবাই, জেলা ও থানা বাছলে শুধু সেই থানার ব্যবহারকারী সরাসরি যোগ দিতে পারবেন। এলাকার বাইরের কেউ
        যোগ দিতে চাইলে অনুরোধ পাঠাবেন, আপনি অনুমোদন দিলে যোগ দিতে পারবেন।
      </p>
    </div>
  );
}
