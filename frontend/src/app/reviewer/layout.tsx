import { SessionProvider } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-server";
import { ReviewerShell } from "./reviewer-shell";

export default async function ReviewerLayout({ children }: LayoutProps<"/reviewer">) {
  return (
    <SessionProvider initial={await getSession()}>
      <ReviewerShell>{children}</ReviewerShell>
    </SessionProvider>
  );
}
