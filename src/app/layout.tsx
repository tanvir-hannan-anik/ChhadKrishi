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
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#fbfcf6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bn"
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
