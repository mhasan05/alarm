import { SessionProvider } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-server";
import { PoliticianShell } from "./politician-shell";

export default async function PoliticianLayout({ children }: LayoutProps<"/politician">) {
  return (
    <SessionProvider initial={await getSession()}>
      <PoliticianShell>{children}</PoliticianShell>
    </SessionProvider>
  );
}
