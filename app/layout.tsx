import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { Geist } from "next/font/google";
import "./globals.css";

// The font variable sits on <html>: the Dashboard shell tokens live on :root and read it from there.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Link Analytics | Bookchaowalit",
  description: "Clicks on three sample short links over 24 hours, 7 days or 30 days: volume, share and a CSV export.",
  keywords: ["link-analytics", "metrics"],
  authors: [{ name: "Bookchaowalit", url: "https://bookchaowalit.com" }],
  creator: "Bookchaowalit",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    title: "Link Analytics | Bookchaowalit",
    description: "Clicks on three sample short links over 24 hours, 7 days or 30 days: volume, share and a CSV export.",
    siteName: "Bookchaowalit",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
