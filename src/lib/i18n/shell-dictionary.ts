/** Strings for the chat-first shell: AI feature cards, sidebar controls and the signed-in landing. */

export type AiFeatureKey = "analyze" | "designer" | "care" | "problems";

export interface ShellDictionary {
  aiFeatures: {
    label: string;
    items: Record<AiFeatureKey, { title: string; desc: string }>;
  };
  sidebar: { expand: string; collapse: string };
  capture: { takePhoto: string; gallery: string; tapToChoose: string; replace: string; remove: string };
  resources: {
    label: string;
    videos: string;
    products: string;
    finding: string;
    searchYouTube: string;
    viewInShop: string;
    opensYouTube: string;
    sources: string;
  };
  chatFab: { open: string; resume: string };
  landing: {
    greetUser: (greeting: string, name: string) => string;
    askAnything: string;
    quickPrompts: string;
  };
}

const bn: ShellDictionary = {
  aiFeatures: {
    label: "এআই ফিচার",
    items: {
      analyze: { title: "ছবি বিশ্লেষণ", desc: "গাছের ছবি দিন — সমস্যা ও সমাধান জানুন" },
      designer: { title: "গার্ডেন ডিজাইন", desc: "ছাদ বা বারান্দার ছবিতে বাগানের নকশা" },
      care: { title: "যত্নের রুটিন", desc: "পানি, সার ও রোদের সময়সূচি" },
      problems: { title: "সাধারণ সমস্যা", desc: "রোগ, পোকা ও বৃদ্ধির সমস্যার সমাধান" },
    },
  },
  sidebar: { expand: "সাইডবার বড় করুন", collapse: "সাইডবার ছোট করুন" },
  capture: { takePhoto: "ছবি তুলুন", gallery: "গ্যালারি", tapToChoose: "ছবি বাছতে ট্যাপ করুন", replace: "ছবি বদলান", remove: "ছবি সরান" },
  resources: {
    label: "সহায়ক রিসোর্স",
    videos: "সহায়ক ভিডিও",
    products: "ছাদকৃষি শপ থেকে",
    finding: "সহায়ক ভিডিও ও পণ্য খোঁজা হচ্ছে…",
    searchYouTube: "ইউটিউবে খুঁজুন",
    viewInShop: "শপে দেখুন",
    opensYouTube: "ইউটিউবে খুলবে",
    sources: "তথ্যসূত্র (এফএও কৃষি নির্দেশিকা)",
  },
  chatFab: { open: "এআই চ্যাট খুলুন", resume: "চ্যাটে ফিরে যান" },
  landing: {
    greetUser: (greeting, name) => `${greeting}, ${name}`,
    askAnything: "আজ আপনার বাগানের জন্য কী করতে পারি?",
    quickPrompts: "দ্রুত প্রশ্ন",
  },
};

const en: ShellDictionary = {
  aiFeatures: {
    label: "AI features",
    items: {
      analyze: { title: "Image Analysis", desc: "Upload a plant photo to spot problems and fixes" },
      designer: { title: "Garden Design", desc: "Turn a rooftop or balcony photo into a garden plan" },
      care: { title: "Plant Care Routine", desc: "Watering, feeding and sunlight schedules" },
      problems: { title: "Common Problems", desc: "Fixes for diseases, pests and growth issues" },
    },
  },
  sidebar: { expand: "Expand sidebar", collapse: "Collapse sidebar" },
  capture: { takePhoto: "Take a photo", gallery: "Gallery", tapToChoose: "Tap to choose a photo", replace: "Replace photo", remove: "Remove photo" },
  resources: {
    label: "Helpful resources",
    videos: "Helpful videos",
    products: "From the ChhadKrishi Shop",
    finding: "Finding helpful videos and items…",
    searchYouTube: "Search on YouTube",
    viewInShop: "View in shop",
    opensYouTube: "opens YouTube",
    sources: "Sources (FAO gardening manuals)",
  },
  chatFab: { open: "Open AI chat", resume: "Back to your chat" },
  landing: {
    greetUser: (greeting, name) => `${greeting}, ${name}`,
    askAnything: "What can I do for your garden today?",
    quickPrompts: "Quick questions",
  },
};

export const shellDictionaries = { bn, en };
