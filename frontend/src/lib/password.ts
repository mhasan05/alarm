// Password strength, shared by the admin account forms and the change-password form.

export const PASSWORD_BANDS = [
  { label: "খালি", pct: "0%", color: "#4A7060" },
  { label: "খুব দুর্বল", pct: "20%", color: "#F42A41" },
  { label: "দুর্বল", pct: "40%", color: "#F42A41" },
  { label: "মোটামুটি", pct: "60%", color: "#D97706" },
  { label: "ভালো", pct: "80%", color: "#1A7A4A" },
  { label: "শক্তিশালী", pct: "100%", color: "#1A7A4A" },
];

/** 0–5: length ≥8, length ≥12, mixed case, a digit, a symbol. 3+ is acceptable. */
export function passwordScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export const MIN_PASSWORD_SCORE = 3;

export const passwordBand = (pw: string) => PASSWORD_BANDS[pw ? passwordScore(pw) : 0];
