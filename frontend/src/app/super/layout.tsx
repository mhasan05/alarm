import { SessionProvider } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-server";
import { SuperShell } from "./super-shell";

export default async function SuperLayout({ children }: LayoutProps<"/super">) {
  return (
    <SessionProvider initial={await getSession()}>
      <SuperShell>{children}</SuperShell>
    </SessionProvider>
  );
}
