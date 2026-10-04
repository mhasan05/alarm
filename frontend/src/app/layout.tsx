import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
});

const DESCRIPTION = "ALARM Bangladesh — রাজনৈতিক কর্মীদের কাজের যাচাই করা অডিট ও জবাবদিহিতা ব্যবস্থা।";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://bdalarm.org"),
  title: "ALARM — অডিট ও জবাবদিহিতা প্ল্যাটফর্ম",
  description: DESCRIPTION,
  applicationName: "ALARM",
  // Internal system: keep every page out of search engines.
  robots: { index: false, follow: false },
  // Link previews when the site or a meeting link is shared (WhatsApp, Messenger, email).
  openGraph: { type: "website", siteName: "ALARM Bangladesh", title: "ALARM — অডিট ও জবাবদিহিতা প্ল্যাটফর্ম", description: DESCRIPTION, images: [{ url: "/logo.png", width: 497, height: 512, alt: "ALARM" }] },
  twitter: { card: "summary", title: "ALARM — অডিট ও জবাবদিহিতা প্ল্যাটফর্ম", description: DESCRIPTION, images: ["/logo.png"] },
};

// viewportFit "cover" lets phone layouts pad around the notch and home bar (env(safe-area-inset-*)).
export const viewport: Viewport = { themeColor: "#006a4e", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${hindSiliguri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
