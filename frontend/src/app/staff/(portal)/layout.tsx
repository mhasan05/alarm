import { SessionProvider } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-server";
import { StaffShell } from "./staff-shell";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  return (
    <SessionProvider initial={await getSession()}>
      <StaffShell>{children}</StaffShell>
    </SessionProvider>
  );
}
