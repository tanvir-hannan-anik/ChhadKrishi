import type { ProblemCategory, Severity } from "@/lib/problems/data";

/** UI strings for the Common Gardening Problems library (/problems). Content lives in lib/problems. */
export interface ProblemsDictionary {
  problems: {
    title: string;
    eyebrow: string;
    subtitle: string;
    filterLabel: string;
    all: string;
    categories: Record<ProblemCategory, string>;
    severity: Record<Severity, string>;
    readMore: string;
    back: string;
    overview: string;
    signs: string;
    causes: string;
    prevention: string;
    solution: string;
    stepLabel: (n: string) => string;
    related: string;
    photoBy: (author: string) => string;
    analyzeTitle: string;
    analyzeBody: string;
    analyzeCta: string;
    designerCta: string;
    count: (n: string) => string;
    notFound: string;
  };
}

const bn: ProblemsDictionary = {
  problems: {
    title: "বাগানের সাধারণ সমস্যা",
    eyebrow: "শিখুন ও সমাধান করুন",
    subtitle: "ছাদ ও বারান্দার বাগানে সবচেয়ে বেশি দেখা যাওয়া সমস্যাগুলো চিনুন — কেন হয়, কীভাবে ঠেকাবেন, আর ধাপে ধাপে সমাধান।",
    filterLabel: "বিষয় অনুযায়ী দেখুন",
    all: "সব",
    categories: { health: "গাছের স্বাস্থ্য", water: "পানি", pests: "পোকামাকড়", environment: "রোদ ও তাপ", space: "জায়গা" },
    severity: { low: "সহজ সমাধান", medium: "মনোযোগ দিন", high: "দ্রুত ব্যবস্থা নিন" },
    readMore: "বিস্তারিত দেখুন",
    back: "সব সমস্যা",
    overview: "সংক্ষেপে",
    signs: "কীভাবে চিনবেন",
    causes: "সম্ভাব্য কারণ",
    prevention: "প্রতিরোধ",
    solution: "ধাপে ধাপে সমাধান",
    stepLabel: (n) => `ধাপ ${n}`,
    related: "সম্পর্কিত সমস্যা",
    photoBy: (author) => `ছবি: ${author}`,
    analyzeTitle: "আপনার গাছে কি এমন দেখছেন?",
    analyzeBody: "একটি ছবি তুলে দিন — ছাদকৃষির এআই সমস্যা শনাক্ত করে আপনার গাছের জন্য নির্দিষ্ট পরামর্শ দেবে।",
    analyzeCta: "ছবি বিশ্লেষণ করুন",
    designerCta: "এআই দিয়ে বাগান ডিজাইন করুন",
    count: (n) => `${n}টি সমস্যা`,
    notFound: "এই বিষয়ে কোনো সমস্যা নেই।",
  },
};

const en: ProblemsDictionary = {
  problems: {
    title: "Common Gardening Problems",
    eyebrow: "Learn & fix",
    subtitle: "Recognise the problems rooftop and balcony gardeners meet most — why they happen, how to prevent them, and step-by-step fixes.",
    filterLabel: "Filter by topic",
    all: "All",
    categories: { health: "Plant health", water: "Watering", pests: "Pests", environment: "Sun & heat", space: "Space" },
    severity: { low: "Easy fix", medium: "Needs attention", high: "Act quickly" },
    readMore: "Read more",
    back: "All problems",
    overview: "Overview",
    signs: "How to recognise it",
    causes: "Possible causes",
    prevention: "Prevention",
    solution: "Step-by-step solution",
    stepLabel: (n) => `Step ${n}`,
    related: "Related problems",
    photoBy: (author) => `Photo: ${author}`,
    analyzeTitle: "Seeing this on your plant?",
    analyzeBody: "Snap a photo — ChhadKrishi's AI identifies the problem and gives advice specific to your plant.",
    analyzeCta: "Analyse a photo",
    designerCta: "Design a garden with AI",
    count: (n) => `${n} problems`,
    notFound: "No problems in this topic.",
  },
};

export const problemsDictionaries = { bn, en };
