import type { Metadata } from "next";
import { ProblemsLibrary } from "@/components/problems/problems-library";

export const metadata: Metadata = {
  title: "বাগানের সাধারণ সমস্যা ও সমাধান | ChhadKrishi",
  description:
    "হলুদ পাতা, অতিরিক্ত পানি, পোকামাকড়, ছাদের গরম — ছাদ ও বারান্দার বাগানের সাধারণ সমস্যার কারণ, প্রতিরোধ ও ধাপে ধাপে সমাধান। Common rooftop and balcony gardening problems and fixes.",
};

/** Public educational library — no sign-in needed. */
export default function ProblemsPage() {
  return <ProblemsLibrary />;
}
