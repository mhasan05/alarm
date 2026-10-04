"use client";

/**
 * One-time codes for password reset. Sending the SMS is the backend's job (an SMS gateway behind
 * the API, which also keeps the code server-side). Until it is connected, `smsGateway.live` is
 * false: nothing is sent and the reset screen shows the code so the flow can be tested end to end.
 */
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60_000;
export const OTP_RESEND_MS = 60_000;
export const OTP_MAX_TRIES = 5;

export type SmsGateway = {
  /** True once codes are really delivered by SMS. */
  live: boolean;
  send(phone: string, message: string): Promise<{ delivered: boolean }>;
};

export const smsGateway: SmsGateway = {
  live: false,
  async send() {
    return { delivered: false };
  },
};

/** Six random digits. */
export function newOtp() {
  const rnd = new Uint32Array(1);
  crypto.getRandomValues(rnd);
  return String(100000 + (rnd[0] % 900000));
}
