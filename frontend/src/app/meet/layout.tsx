import { SessionProvider } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-server";

/** Meeting rooms sit outside the portal frames. Signed-in users join as themselves; others enter their ALARM ID. */
export default async function MeetLayout({ children }: LayoutProps<"/meet">) {
  return <SessionProvider initial={await getSession()}>{children}</SessionProvider>;
}
