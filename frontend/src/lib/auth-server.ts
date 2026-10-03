import { cookies } from "next/headers";
import { parseSession, SESSION_COOKIE, type Session } from "./session";

/** The session from the request cookie (server components). */
export async function getSession(): Promise<Session | null> {
  return parseSession((await cookies()).get(SESSION_COOKIE)?.value);
}
