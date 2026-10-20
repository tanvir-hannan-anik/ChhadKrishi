import type { Metadata, Viewport } from "next";
import { Fraunces, Hind_Siliguri, Tiro_Bangla } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const tiroBangla = Tiro_Bangla({
  variable: "--font-tiro-bangla",
  subsets: ["bengali", "latin"],
  weight: "400",
});

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ছাদকৃষি — আপনার ছাদবাগানের এআই সঙ্গী | ChhadKrishi",
  description:
    "বাংলায় প্রশ্ন করুন বা গাছের ছবি দিন — ছাদকৃষি বাংলাদেশের আবহাওয়া ও মৌসুম বুঝে ছাদবাগানের সহজ পরামর্শ দেয়। AI plant care for rooftop gardeners in Bangladesh.",
  // Resolves the problem guides' social-preview images to absolute URLs.
  metadataBase: new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  icons: { icon: "/logo.png" },
  // The app has its own Bangla/English switch. Browser page translation rewrites the text nodes
  // React manages and crashes it ("insertBefore … not a child of this node").
  other: { google: "notranslate" },
};

export const viewport: Viewport = {
  themeColor: "#fbfcf6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bn"
      translate="no"
      // Lets Next.js skip smooth scrolling during route transitions (smooth scroll is set in CSS).
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${tiroBangla.variable} ${hindSiliguri.variable} h-full antialiased`}
    >
      <body className="grain flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
