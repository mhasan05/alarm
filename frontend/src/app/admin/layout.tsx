import { SessionProvider } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-server";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <SessionProvider initial={await getSession()}>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
