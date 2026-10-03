// Date, number and phone formatting used across portals. All dates render in Asia/Dhaka.

const TZ = "Asia/Dhaka";
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export const bn = (v: number | string) => String(v).replace(/\d/g, (d) => BN_DIGITS[+d]);

export const nowIso = () => new Date().toISOString();

const parts = (iso: string, locale: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts }).format(new Date(iso));

/** ১০ সেপ্টেম্বর ২০২৬ */
export const bnDate = (iso: string) => parts(iso, "bn-BD", { day: "2-digit", month: "long", year: "numeric" });
/** ১০ সেপ্টেম্বর */
export const bnDayMonth = (iso: string) => parts(iso, "bn-BD", { day: "2-digit", month: "long" });
/** সকাল ১০:১৪ */
export const bnTime = (iso: string) => parts(iso, "bn-BD", { hour: "numeric", minute: "2-digit" });
/** 10 Sep 2026 */
export const enDate = (iso: string) => parts(iso, "en-GB", { day: "2-digit", month: "short", year: "numeric" });
/** 10 Sep */
export const enDayMonth = (iso: string) => parts(iso, "en-GB", { day: "2-digit", month: "short" });
/** 10:14 AM */
export const enTime = (iso: string) => parts(iso, "en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
/** 08 Sep 2026, 10:14 */
export const enDateTime = (iso: string) => `${enDate(iso)}, ${parts(iso, "en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;

const dayKey = (iso: string) => parts(iso, "en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });

/** Whole days between an ISO time and now (Dhaka calendar days). */
export function daysSince(iso: string, now = nowIso()) {
  const a = new Date(dayKey(iso)).getTime();
  const b = new Date(dayKey(now)).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** "Today · 09:20 AM", "Yesterday · 05:40 PM", "08 Sep · 10:14 AM" */
export function enRelative(iso: string) {
  const d = daysSince(iso);
  return `${d === 0 ? "Today" : d === 1 ? "Yesterday" : enDayMonth(iso)} · ${enTime(iso)}`;
}

/** "আজ · সকাল ১১:৪২", "গতকাল · …", "০৮ সেপ্টেম্বর · …" */
export function bnRelative(iso: string) {
  const d = daysSince(iso);
  return `${d === 0 ? "আজ" : d === 1 ? "গতকাল" : bnDayMonth(iso)} · ${bnTime(iso)}`;
}

/** "3 days open", "1 day open", "today" */
export const enAge = (iso: string, suffix = "open") => {
  const d = daysSince(iso);
  return d === 0 ? "today" : `${d} day${d === 1 ? "" : "s"} ${suffix}`;
};

/** Days until an ISO date (negative when past). */
export function daysUntil(isoDate: string, now = nowIso()) {
  return Math.round((new Date(dayKey(isoDate)).getTime() - new Date(dayKey(now)).getTime()) / 86_400_000);
}

/** Login phone digits → "+880 1712-440918". */
export const phoneIntl = (digits: string) => {
  const d = digits.replace(/\D/g, "").replace(/^880/, "").replace(/^0/, "");
  return d.length === 10 ? `+880 ${d.slice(0, 4)}-${d.slice(4)}` : digits;
};

/** Login phone digits → "০১৭১২-৪৪০৯১৮". */
export const phoneBn = (digits: string) => {
  const d = digits.replace(/\D/g, "").replace(/^880/, "0");
  return d.length === 11 ? bn(`${d.slice(0, 5)}-${d.slice(5)}`) : bn(digits);
};

/** "+880 17••-•••918" — only the last three digits are shown. */
export const phoneMasked = (digits: string) => {
  const d = digits.replace(/\D/g, "").replace(/^880/, "").replace(/^0/, "");
  return d.length === 10 ? `+880 ${d.slice(0, 2)}••-•••${d.slice(-3)}` : digits;
};

/** Normalises what a user types into login digits (01XXXXXXXXX), or "" if it isn't a BD mobile. */
export function normalisePhone(input: string) {
  const d = input.replace(/[^\d০-৯]/g, "").replace(/[০-৯]/g, (c) => String(BN_DIGITS.indexOf(c)));
  const local = d.replace(/^880/, "").replace(/^0/, "");
  return /^1[3-9]\d{8}$/.test(local) ? `0${local}` : "";
}
