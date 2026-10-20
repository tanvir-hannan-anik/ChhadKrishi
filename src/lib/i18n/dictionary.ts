import type { AiErrorCode } from "@/lib/ai/errors";
import { designerDictionaries, type DesignerDictionary } from "./designer-dictionary";
import { featureDictionaries, type FeatureDictionary } from "./features-dictionary";
import { problemsDictionaries, type ProblemsDictionary } from "./problems-dictionary";
import { shellDictionaries, type ShellDictionary } from "./shell-dictionary";

export type Lang = "bn" | "en";

export type FeatureKey = "chat" | "scan" | "care" | "shop";
export type ShopCategory = "all" | "seed" | "pot" | "fertilizer";
export type GreetingKey = "welcome" | "morning" | "noon" | "afternoon" | "evening" | "night";

export interface Dictionary extends AppDictionary, FeatureDictionary, DesignerDictionary, ProblemsDictionary, ShellDictionary {
  meta: { skipToContent: string };
  nav: {
    benefits: string;
    features: string;
    how: string;
    guide: string;
    start: string;
    openMenu: string;
    closeMenu: string;
    languageLabel: string;
    shop: string;
  };
  hero: {
    greetings: Record<GreetingKey, string>;
    brand: string;
    tagline: string;
    intro: string;
    placeholder: string;
    send: string;
    attach: string;
    removeImage: string;
    voiceStart: string;
    voiceStop: string;
    listening: string;
    hint: string;
    imageTooLarge: string;
    imageInvalid: string;
    voiceError: string;
    suggestionsLabel: string;
    suggestions: string[];
    cardsLabel: string;
    cards: Record<FeatureKey, { title: string; desc: string; prompt: string }>;
  };
  benefits: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: { title: string; desc: string }[];
  };
  features: {
    eyebrow: string;
    title: string;
    subtitle: string;
    exampleBadge: string;
    tabs: Record<FeatureKey, { title: string; desc: string }>;
    chat: { question: string; answer: string; typing: string; you: string; assistant: string };
    scan: { analyzing: string; result: string; confidence: string; tip: string };
    care: { title: string; tasks: string[]; progress: (done: string, total: string) => string; allDone: string };
    shop: {
      filters: Record<ShopCategory, string>;
      items: { name: string; price: number; category: Exclude<ShopCategory, "all"> }[];
      comingSoon: string;
      open: string;
    };
  };
  how: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: { title: string; desc: string }[];
  };
  guide: {
    eyebrow: string;
    title: string;
    subtitle: string;
    prev: string;
    next: string;
    restart: string;
    stepOf: (n: string, total: string) => string;
    steps: { title: string; desc: string; tip: string }[];
  };
  cta: { title: string; subtitle: string; button: string };
  footer: { tagline: string; rights: string; madeFor: string; explore: string };
  auth: {
    signInTab: string;
    signUpTab: string;
    titleSignIn: string;
    titleSignUp: string;
    subtitleSignIn: string;
    subtitleSignUp: string;
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholderSignIn: string;
    passwordPlaceholderSignUp: string;
    showPassword: string;
    hidePassword: string;
    submitSignIn: string;
    submitSignUp: string;
    loadingSignIn: string;
    loadingSignUp: string;
    close: string;
    noAccount: string;
    haveAccount: string;
    reasons: Record<AuthReasonKey, string>;
    savedPrompt: string;
    imageKept: string;
    errors: {
      invalidCredentials: string;
      userExists: string;
      passwordShort: string;
      invalidEmail: string;
      nameRequired: string;
      rateLimited: string;
      network: string;
      generic: string;
    };
    welcome: (name: string) => string;
    resuming: string;
    uploadReady: string;
    chooseImage: string;
    panelTitle: string;
    panelPoints: string[];
    trust: string;
  };
  account: { signIn: string; signOut: string; menu: string; signingOut: string };
  shopPage: { title: string; subtitle: string; greeting: (name: string) => string; comingSoon: string };
  chatPage: {
    back: string;
    title: string;
    you: string;
    assistant: string;
    empty: string;
    pendingTitle: string;
    pendingBody: string;
    attachedImage: string;
    sending: string;
    errorGeneric: string;
    retry: string;
    greeting: (name: string) => string;
  };
}

export type AuthReasonKey = "chat" | "upload" | "shop" | "analyze" | "protected" | "retry" | "expired";

type Level = "low" | "medium" | "high";

export interface AppDictionary {
  aiErrors: Record<AiErrorCode, string>;
  chat: {
    title: string;
    newChat: string;
    history: string;
    historyEmpty: string;
    openHistory: string;
    closeHistory: string;
    deleteChat: string;
    emptyTitle: (name: string) => string;
    emptySubtitle: string;
    placeholder: string;
    send: string;
    stop: string;
    attach: string;
    removeImage: string;
    regenerate: string;
    retry: string;
    copy: string;
    copied: string;
    thinking: string;
    you: string;
    assistant: string;
    photo: string;
    notConfiguredTitle: string;
    notConfiguredBody: string;
    loadFailed: string;
    disclaimer: string;
    analyzeLink: string;
    voice: {
      start: string;
      stop: string;
      recording: string;
      listen: string;
      stopListening: string;
      loadingAudio: string;
      errors: Record<"micDenied" | "micUnsupported" | "nothingHeard" | "failed", string>;
    };
  };
  analyze: {
    title: string;
    subtitle: string;
    dropTitle: string;
    dropHint: string;
    dropActive: string;
    choose: string;
    change: string;
    remove: string;
    noteLabel: string;
    notePlaceholder: string;
    tipsTitle: string;
    submit: string;
    preparing: string;
    analyzingSteps: string[];
    cancel: string;
    results: {
      title: string;
      healthStatus: Record<"healthy" | "issues" | "unclear", string>;
      confidence: string;
      urgency: string;
      levels: Record<Level, string>;
      issues: string;
      noIssues: string;
      likelihood: string;
      treatment: string;
      organic: string;
      nonOrganic: string;
      prevention: string;
      notPlantTitle: string;
      notPlantBody: string;
      betterPhotoTitle: string;
      unknownPlant: string;
      askInChat: string;
      askPrompt: (summary: string) => string;
      newPhoto: string;
      disclaimer: string;
    };
    imageInvalid: string;
    imageTooLarge: string;
    imageUnreadable: string;
  };
}

const bn: Omit<Dictionary, keyof FeatureDictionary | keyof DesignerDictionary | keyof ProblemsDictionary | keyof ShellDictionary> = {
  meta: { skipToContent: "মূল অংশে যান" },
  nav: {
    benefits: "সুবিধা",
    features: "ফিচার",
    how: "কীভাবে কাজ করে",
    guide: "নির্দেশিকা",
    start: "প্রশ্ন করুন",
    openMenu: "মেনু খুলুন",
    closeMenu: "মেনু বন্ধ করুন",
    languageLabel: "ভাষা নির্বাচন",
    shop: "শপ",
  },
  hero: {
    greetings: {
      welcome: "স্বাগতম",
      morning: "শুভ সকাল",
      noon: "শুভ দুপুর",
      afternoon: "শুভ বিকেল",
      evening: "শুভ সন্ধ্যা",
      night: "শুভ রাত্রি",
    },
    brand: "ছাদকৃষি",
    tagline: "আপনার ছাদবাগানের বুদ্ধিমান সঙ্গী",
    intro:
      "গাছের পাতায় দাগ? কখন পানি দেবেন, কোন সার লাগবে? বাংলায় প্রশ্ন করুন বা ছবি তুলে দিন — ছাদকৃষি বাংলাদেশের আবহাওয়া ও মৌসুম বুঝে সহজ পরামর্শ দেবে।",
    placeholder: "আপনার গাছ নিয়ে যেকোনো প্রশ্ন লিখুন…",
    send: "পাঠান",
    attach: "গাছের ছবি যুক্ত করুন",
    removeImage: "ছবি সরান",
    voiceStart: "কথা বলে প্রশ্ন করুন",
    voiceStop: "শোনা বন্ধ করুন",
    listening: "শুনছি… বলুন",
    hint: "পাঠাতে Enter, নতুন লাইনে Shift + Enter",
    imageTooLarge: "ছবিটি ১০ মেগাবাইটের বেশি বড়। ছোট একটি ছবি দিন।",
    imageInvalid: "শুধু ছবি (JPG, PNG, WEBP) যুক্ত করা যাবে।",
    voiceError: "মাইক্রোফোন চালু করা যায়নি। অনুমতি দিয়ে আবার চেষ্টা করুন।",
    suggestionsLabel: "প্রশ্নের কিছু উদাহরণ",
    suggestions: [
      "টমেটো গাছের পাতা হলুদ হচ্ছে কেন?",
      "বর্ষায় ছাদে কোন সবজি লাগাবো?",
      "মরিচ গাছে জৈব সার কীভাবে দেব?",
      "টবে লেবু গাছের যত্ন কীভাবে নেব?",
    ],
    cardsLabel: "ছাদকৃষির মূল সেবা",
    cards: {
      chat: {
        title: "এআই চ্যাট",
        desc: "বাংলায় প্রশ্ন, সাথে সাথে উত্তর",
        prompt: "আমি ছাদবাগান শুরু করতে চাই, কোথা থেকে শুরু করবো?",
      },
      scan: {
        title: "রোগ নির্ণয়",
        desc: "ছবি দিয়ে সমস্যা শনাক্ত",
        prompt: "এই গাছটির কী সমস্যা হয়েছে?",
      },
      care: {
        title: "যত্নের রুটিন",
        desc: "পানি, সার ও রোদের সময়সূচি",
        prompt: "আমার ১০টি টবের জন্য একটি সাপ্তাহিক যত্নের রুটিন বানিয়ে দাও।",
      },
      shop: {
        title: "কৃষি শপ",
        desc: "বীজ, টব ও জৈব সার",
        prompt: "",
      },
    },
  },
  benefits: {
    eyebrow: "কেন ছাদকৃষি",
    title: "ছোট্ট ছাদেই সবুজ সাফল্য",
    subtitle: "ব্যস্ত শহুরে জীবনেও বাগান করা কঠিন নয় — সঠিক সময়ে সঠিক পরামর্শই যথেষ্ট।",
    items: [
      {
        title: "সম্পূর্ণ বাংলায়",
        desc: "জটিল কৃষি পরিভাষা নয়, প্রতিদিনের সহজ ভাষায় পরামর্শ। চাইলে ইংরেজিতেও।",
      },
      {
        title: "বাংলাদেশের মৌসুম মেনে",
        desc: "খরিফ, রবি আর বর্ষার হিসাব মিলিয়ে জানুন কখন কী লাগাবেন।",
      },
      {
        title: "দ্রুত রোগ শনাক্তকরণ",
        desc: "পাতার একটি ছবিই যথেষ্ট — সমস্যা চিহ্নিত করে নিরাপদ, জৈব সমাধান।",
      },
      {
        title: "কম খরচে বেশি ফলন",
        desc: "সঠিক পরিমাণে পানি ও সার দিয়ে অপচয় কমান, টাকাও বাঁচান।",
      },
    ],
  },
  features: {
    eyebrow: "ফিচারসমূহ",
    title: "এক জায়গায় বাগানের সব সমাধান",
    subtitle: "প্রতিটি ফিচারে ক্লিক করে দেখে নিন কীভাবে কাজ করে।",
    exampleBadge: "উদাহরণ",
    tabs: {
      chat: { title: "এআই চ্যাট", desc: "যেকোনো প্রশ্ন বাংলায় লিখুন বা বলুন, পান ধাপে ধাপে উত্তর।" },
      scan: { title: "ছবি দিয়ে রোগ নির্ণয়", desc: "আক্রান্ত পাতার ছবি দিন, জানুন রোগের নাম ও প্রতিকার।" },
      care: { title: "যত্নের রুটিন", desc: "প্রতিদিনের কাজের তালিকা আর সময়মতো রিমাইন্ডার।" },
      shop: { title: "কৃষি শপ", desc: "মানসম্মত বীজ, টব ও জৈব সার — ঘরে বসেই।" },
    },
    chat: {
      question: "আমার বেগুন গাছের পাতা কুঁকড়ে যাচ্ছে, কী করবো?",
      answer:
        "সম্ভবত জাবপোকা বা সাদা মাছির আক্রমণ। পাতার নিচের দিক দেখুন। ১ লিটার পানিতে ৫ মিলি নিমতেল ও সামান্য তরল সাবান মিশিয়ে বিকেলে স্প্রে করুন, ৭ দিন পর আবার দিন।",
      typing: "উত্তর লিখছে…",
      you: "আপনি",
      assistant: "ছাদকৃষি",
    },
    scan: {
      analyzing: "ছবি বিশ্লেষণ চলছে…",
      result: "পাতায় দাগ রোগ (Leaf Spot)",
      confidence: "নিশ্চয়তা",
      tip: "আক্রান্ত পাতা ছেঁটে ফেলুন, গোড়ায় পানি দিন — পাতা ভেজাবেন না।",
    },
    care: {
      title: "আজকের কাজ",
      tasks: [
        "সকালে টমেটো গাছে পানি দিন",
        "মরিচ গাছে সরিষার খৈল দিন",
        "লাউয়ের মাচা শক্ত করে বাঁধুন",
        "পুদিনার টব ছায়ায় সরিয়ে রাখুন",
      ],
      progress: (done, total) => `${total}টির মধ্যে ${done}টি সম্পন্ন`,
      allDone: "চমৎকার! আজকের সব কাজ শেষ 🌱",
    },
    shop: {
      filters: { all: "সব", seed: "বীজ", pot: "টব", fertilizer: "সার" },
      items: [
        { name: "দেশি টমেটো বীজ", price: 60, category: "seed" },
        { name: "কাঁচা মরিচ বীজ", price: 40, category: "seed" },
        { name: "১২ ইঞ্চি মাটির টব", price: 180, category: "pot" },
        { name: "জিও ব্যাগ (৫টি)", price: 250, category: "pot" },
        { name: "ভার্মিকম্পোস্ট ৫ কেজি", price: 220, category: "fertilizer" },
        { name: "নিম খৈল ১ কেজি", price: 90, category: "fertilizer" },
      ],
      comingSoon: "দামগুলো নমুনা হিসেবে দেখানো হয়েছে।",
      open: "শপে যান",
    },
  },
  how: {
    eyebrow: "কীভাবে কাজ করে",
    title: "তিন ধাপে সুস্থ বাগান",
    subtitle: "প্রশ্ন থেকে সমাধান — পুরো পথটা সহজ আর দ্রুত।",
    steps: [
      { title: "প্রশ্ন করুন বা ছবি দিন", desc: "লিখে, বলে বা গাছের ছবি তুলে আপনার সমস্যা জানান।" },
      { title: "এআই বিশ্লেষণ করে", desc: "আপনার গাছ, এলাকার আবহাওয়া ও মৌসুম মিলিয়ে কারণ খুঁজে বের করে।" },
      { title: "পরামর্শ মেনে চলুন", desc: "ধাপে ধাপে সমাধান আর যত্নের রিমাইন্ডার পেয়ে যান।" },
    ],
  },
  guide: {
    eyebrow: "ব্যবহার নির্দেশিকা",
    title: "প্রথমবার? এভাবে শুরু করুন",
    subtitle: "পাঁচটি সহজ ধাপে ছাদকৃষির পুরো সুবিধা নিন।",
    prev: "আগের ধাপ",
    next: "পরের ধাপ",
    restart: "আবার দেখুন",
    stepOf: (n, total) => `ধাপ ${n} / ${total}`,
    steps: [
      {
        title: "অ্যাকাউন্ট খুলুন",
        desc: "নাম, ইমেইল আর একটি পাসওয়ার্ড দিয়ে বিনামূল্যে নিবন্ধন করুন।",
        tip: "এক মিনিটও লাগবে না।",
      },
      {
        title: "আপনার বাগান যুক্ত করুন",
        desc: "কোন কোন গাছ আছে, টবের সংখ্যা আর ছাদে কতটা রোদ আসে তা জানান।",
        tip: "যত বেশি তথ্য, তত নির্ভুল পরামর্শ।",
      },
      {
        title: "প্রশ্ন করুন",
        desc: "চ্যাট বক্সে বাংলায় লিখুন অথবা মাইক্রোফোনে বলুন।",
        tip: "আঞ্চলিক ভাষাতেও প্রশ্ন করতে পারেন।",
      },
      {
        title: "ছবি দিয়ে রোগ যাচাই",
        desc: "আক্রান্ত পাতার কাছ থেকে, পরিষ্কার আলোতে একটি ছবি তুলুন।",
        tip: "ঝাপসা ছবি এড়িয়ে চলুন।",
      },
      {
        title: "রুটিন মেনে চলুন",
        desc: "পানি ও সারের রিমাইন্ডার চালু রাখুন আর বাগানের অগ্রগতি দেখুন।",
        tip: "নিয়মিত যত্নেই ভালো ফলন।",
      },
    ],
  },
  cta: {
    title: "আজই শুরু হোক সবুজ যাত্রা",
    subtitle: "প্রথম প্রশ্নটি করুন — বাকিটা ছাদকৃষি দেখবে।",
    button: "এখনই প্রশ্ন করুন",
  },
  footer: {
    tagline: "বাংলাদেশের ছাদবাগানিদের জন্য এআই সহায়ক।",
    rights: "সর্বস্বত্ব সংরক্ষিত।",
    madeFor: "বাংলাদেশের জন্য ভালোবাসা দিয়ে তৈরি",
    explore: "ঘুরে দেখুন",
  },
  auth: {
    signInTab: "লগইন",
    signUpTab: "নতুন অ্যাকাউন্ট",
    titleSignIn: "আবার স্বাগতম",
    titleSignUp: "ছাদকৃষিতে যোগ দিন",
    subtitleSignIn: "আপনার অ্যাকাউন্টে লগইন করুন।",
    subtitleSignUp: "বিনামূল্যে অ্যাকাউন্ট খুলুন — এক মিনিটও লাগবে না।",
    name: "আপনার নাম",
    namePlaceholder: "যেমন: রহিমা খাতুন",
    email: "ইমেইল",
    emailPlaceholder: "you@example.com",
    password: "পাসওয়ার্ড",
    passwordPlaceholderSignIn: "আপনার পাসওয়ার্ড",
    passwordPlaceholderSignUp: "কমপক্ষে ৮ অক্ষর",
    showPassword: "পাসওয়ার্ড দেখান",
    hidePassword: "পাসওয়ার্ড লুকান",
    submitSignIn: "লগইন করুন",
    submitSignUp: "অ্যাকাউন্ট খুলুন",
    loadingSignIn: "লগইন হচ্ছে…",
    loadingSignUp: "অ্যাকাউন্ট খোলা হচ্ছে…",
    close: "বন্ধ করুন",
    noAccount: "অ্যাকাউন্ট নেই?",
    haveAccount: "আগেই অ্যাকাউন্ট আছে?",
    reasons: {
      chat: "প্রশ্নটি পাঠাতে লগইন করুন — আপনার লেখা সংরক্ষিত আছে।",
      upload: "গাছের ছবি দিতে লগইন করুন।",
      shop: "কৃষি শপে যেতে লগইন করুন।",
      protected: "এই অংশটি দেখতে লগইন করুন।",
      retry: "আপনার প্রশ্নটি আবার পাঠাতে লগইন করুন।",
      analyze: "গাছের ছবি বিশ্লেষণ করতে লগইন করুন।",
      expired: "আপনার সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।",
    },
    savedPrompt: "আপনার প্রশ্ন",
    imageKept: "ছবিটিও সংরক্ষিত আছে",
    errors: {
      invalidCredentials: "ইমেইল বা পাসওয়ার্ড সঠিক নয়।",
      userExists: "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে। লগইন করুন।",
      passwordShort: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।",
      invalidEmail: "একটি সঠিক ইমেইল ঠিকানা দিন।",
      nameRequired: "আপনার নাম লিখুন।",
      rateLimited: "অনেকবার চেষ্টা করা হয়েছে। এক মিনিট পর আবার চেষ্টা করুন।",
      network: "সংযোগে সমস্যা হচ্ছে। ইন্টারনেট দেখে আবার চেষ্টা করুন।",
      generic: "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।",
    },
    welcome: (name) => `স্বাগতম, ${name}!`,
    resuming: "আপনার কাজটি চালু করছি…",
    uploadReady: "লগইন সফল! এখন গাছের ছবি বেছে নিন।",
    chooseImage: "ছবি বেছে নিন",
    panelTitle: "আপনার ছাদবাগান, আরও সবুজ",
    panelPoints: ["বাংলায় এআই পরামর্শ", "ছবি দিয়ে রোগ নির্ণয়", "যত্নের রুটিন ও কৃষি শপ"],
    trust: "আপনার পাসওয়ার্ড এনক্রিপ্ট করে নিরাপদে রাখা হয়।",
  },
  account: { signIn: "লগইন", signOut: "লগআউট", menu: "অ্যাকাউন্ট মেনু", signingOut: "লগআউট হচ্ছে…" },
  shopPage: {
    title: "কৃষি শপ",
    subtitle: "মানসম্মত বীজ, টব ও জৈব সার — আপনার ছাদবাগানের জন্য বাছাই করা।",
    greeting: (name) => `${name}, আপনার জন্য বাছাই করা পণ্য`,
    comingSoon: "দামগুলো নমুনা হিসেবে দেখানো হয়েছে।",
  },
  aiErrors: {
    UNAUTHORIZED: "আপনার সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।",
    AI_NOT_CONFIGURED: "এআই সেবাটি এখনো চালু করা হয়নি।",
    AI_AUTH_FAILED: "এআই সেবার সাথে সংযোগ যাচাই করা যায়নি। সার্ভারের কনফিগারেশন দেখুন।",
    AI_RATE_LIMITED: "এআই সেবা এখন ব্যস্ত। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    USER_RATE_LIMITED: "আপনি খুব দ্রুত অনেকগুলো অনুরোধ পাঠিয়েছেন। এক মিনিট পর আবার চেষ্টা করুন।",
    AI_UNAVAILABLE: "এআই সেবা সাময়িকভাবে পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।",
    AI_BAD_OUTPUT: "এআই একটি অসম্পূর্ণ উত্তর দিয়েছে। আবার চেষ্টা করুন।",
    INVALID_REQUEST: "অনুরোধটি সঠিক নয়। পাতাটি রিফ্রেশ করে আবার চেষ্টা করুন।",
    INVALID_IMAGE: "শুধু JPG, PNG বা WEBP ছবি দেওয়া যাবে।",
    IMAGE_TOO_LARGE: "ছবিটি অনেক বড়। ছোট একটি ছবি দিন।",
    TEXT_TOO_LONG: "লেখাটি অনেক বড়। একটু ছোট করে লিখুন।",
    NOT_FOUND: "এই কথোপকথনটি পাওয়া যায়নি।",
    AI_FAILED: "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।",
  },
  chat: {
    title: "এআই চ্যাট",
    newChat: "নতুন চ্যাট",
    history: "আগের কথোপকথন",
    historyEmpty: "এখনো কোনো কথোপকথন নেই।",
    openHistory: "কথোপকথনের তালিকা খুলুন",
    closeHistory: "তালিকা বন্ধ করুন",
    deleteChat: "কথোপকথন মুছুন",
    emptyTitle: (name) => `${name}, আজ আপনার বাগানে কী সাহায্য করতে পারি?`,
    emptySubtitle: "প্রশ্ন লিখুন, অথবা গাছের ছবি যুক্ত করে জিজ্ঞেস করুন।",
    placeholder: "আপনার গাছ নিয়ে প্রশ্ন লিখুন…",
    send: "পাঠান",
    stop: "থামান",
    attach: "ছবি যুক্ত করুন",
    removeImage: "ছবি সরান",
    regenerate: "আবার উত্তর তৈরি করুন",
    retry: "আবার চেষ্টা করুন",
    copy: "কপি করুন",
    copied: "কপি হয়েছে",
    thinking: "ভাবছে…",
    you: "আপনি",
    assistant: "ছাদকৃষি",
    photo: "গাছের ছবি",
    notConfiguredTitle: "এআই এখনো যুক্ত হয়নি",
    notConfiguredBody: "এই সার্ভারে কোনো এআই সেবার চাবি (যেমন OPENROUTER_API_KEY) সেট করা নেই, তাই এখন উত্তর দেওয়া সম্ভব নয়। অ্যাডমিন কনফিগারেশন যোগ করলেই চালু হবে।",
    loadFailed: "কথোপকথন লোড করা যায়নি।",
    disclaimer: "এআই ভুল করতে পারে। বড় সমস্যায় স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।",
    analyzeLink: "ছবি বিশ্লেষণ",
    voice: {
      start: "কথা বলে প্রশ্ন করুন",
      stop: "রেকর্ডিং শেষ করুন",
      recording: "শুনছি… শেষ হলে আবার চাপুন",
      listen: "শুনুন",
      stopListening: "থামান",
      loadingAudio: "লোড হচ্ছে…",
      errors: {
        micDenied: "মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। ব্রাউজারের সেটিংস থেকে অনুমতি দিন।",
        micUnsupported: "এই ব্রাউজারে ভয়েস রেকর্ডিং কাজ করে না।",
        nothingHeard: "কোনো কথা শোনা যায়নি। আবার চেষ্টা করুন।",
        failed: "ভয়েস সেবা এখন কাজ করছে না। একটু পরে আবার চেষ্টা করুন।",
      },
    },
  },
  analyze: {
    title: "গাছের ছবি বিশ্লেষণ",
    subtitle: "আক্রান্ত পাতা বা গাছের একটি পরিষ্কার ছবি দিন — এআই সম্ভাব্য সমস্যা ও প্রতিকার জানাবে।",
    dropTitle: "ছবি বেছে নিন বা এখানে টেনে আনুন",
    dropHint: "JPG, PNG বা WEBP · সর্বোচ্চ ১০ MB",
    dropActive: "ছেড়ে দিন — ছবিটি যুক্ত হবে",
    choose: "ছবি বেছে নিন",
    change: "ছবি বদলান",
    remove: "ছবি সরান",
    noteLabel: "কিছু জানাতে চাইলে (ঐচ্ছিক)",
    tipsTitle: "ভালো ছবি তোলার টিপস",
    notePlaceholder: "যেমন: গত সপ্তাহ থেকে পাতায় হলুদ দাগ, প্রতিদিন সকালে পানি দিই",
    submit: "বিশ্লেষণ করুন",
    preparing: "ছবি প্রস্তুত করা হচ্ছে…",
    analyzingSteps: ["ছবি পাঠানো হচ্ছে…", "পাতা ও কাণ্ড পরীক্ষা করা হচ্ছে…", "সম্ভাব্য সমস্যা খোঁজা হচ্ছে…", "প্রতিকার সাজানো হচ্ছে…"],
    cancel: "বাতিল করুন",
    results: {
      title: "বিশ্লেষণের ফলাফল",
      healthStatus: { healthy: "সুস্থ দেখাচ্ছে", issues: "সমস্যা দেখা যাচ্ছে", unclear: "নিশ্চিত নয়" },
      confidence: "নিশ্চয়তা",
      urgency: "কত দ্রুত ব্যবস্থা নেবেন",
      levels: { low: "কম", medium: "মাঝারি", high: "বেশি" },
      issues: "সম্ভাব্য সমস্যা",
      noIssues: "কোনো স্পষ্ট সমস্যা দেখা যায়নি।",
      likelihood: "সম্ভাবনা",
      treatment: "প্রতিকার",
      organic: "জৈব",
      nonOrganic: "রাসায়নিক — সাবধানে",
      prevention: "প্রতিরোধ",
      notPlantTitle: "ছবিতে গাছ পাওয়া যায়নি",
      notPlantBody: "অনুগ্রহ করে গাছ বা আক্রান্ত পাতার কাছ থেকে তোলা একটি ছবি দিন।",
      betterPhotoTitle: "আরও পরিষ্কার ছবি দরকার",
      unknownPlant: "গাছটি নিশ্চিতভাবে চেনা যায়নি",
      askInChat: "এই ফলাফল নিয়ে চ্যাটে প্রশ্ন করুন",
      askPrompt: (summary) => `আমার গাছের ছবি বিশ্লেষণে এসেছে: "${summary}" — এখন আমার কী করা উচিত?`,
      newPhoto: "নতুন ছবি বিশ্লেষণ",
      disclaimer: "এআই-এর তৈরি ফলাফল ভুল হতে পারে। ক্ষতি বেশি হলে স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।",
    },
    imageInvalid: "শুধু JPG, PNG বা WEBP ছবি দেওয়া যাবে।",
    imageTooLarge: "ছবিটি ১০ মেগাবাইটের বেশি বড়।",
    imageUnreadable: "ছবিটি পড়া যায়নি। অন্য একটি ছবি চেষ্টা করুন।",
  },
  chatPage: {
    back: "হোমে ফিরুন",
    title: "এআই চ্যাট",
    you: "আপনি",
    assistant: "ছাদকৃষি",
    empty: "হোম পেজ থেকে একটি প্রশ্ন লিখে শুরু করুন।",
    pendingTitle: "এআই সহকারী যুক্ত হচ্ছে",
    pendingBody:
      "আপনার প্রশ্নটি পেয়েছি। এআই উত্তর দেওয়ার ব্যবস্থাটি আমাদের পরবর্তী ধাপে চালু হবে — খুব শিগগিরই এখানে উত্তর দেখতে পাবেন।",
    attachedImage: "যুক্ত করা ছবি",
    sending: "পাঠানো হচ্ছে…",
    errorGeneric: "প্রশ্নটি পাঠানো যায়নি।",
    retry: "আবার চেষ্টা করুন",
    greeting: (name) => `${name}, আপনার প্রশ্ন`,
  },
};

const en: Omit<Dictionary, keyof FeatureDictionary | keyof DesignerDictionary | keyof ProblemsDictionary | keyof ShellDictionary> = {
  meta: { skipToContent: "Skip to content" },
  nav: {
    benefits: "Benefits",
    features: "Features",
    how: "How it works",
    guide: "Guide",
    start: "Ask now",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    languageLabel: "Choose language",
    shop: "Shop",
  },
  hero: {
    greetings: {
      welcome: "Welcome",
      morning: "Good morning",
      noon: "Good afternoon",
      afternoon: "Good afternoon",
      evening: "Good evening",
      night: "Good night",
    },
    brand: "ChhadKrishi",
    tagline: "Your smart rooftop garden companion",
    intro:
      "Spots on the leaves? Not sure when to water or which fertiliser to use? Ask in Bangla or English, or snap a photo — ChhadKrishi gives simple advice tuned to Bangladesh's weather and seasons.",
    placeholder: "Ask anything about your plants…",
    send: "Send",
    attach: "Attach a plant photo",
    removeImage: "Remove photo",
    voiceStart: "Ask by voice",
    voiceStop: "Stop listening",
    listening: "Listening… go ahead",
    hint: "Enter to send, Shift + Enter for a new line",
    imageTooLarge: "That image is larger than 10 MB. Please choose a smaller one.",
    imageInvalid: "Only image files (JPG, PNG, WEBP) can be attached.",
    voiceError: "Couldn't start the microphone. Allow access and try again.",
    suggestionsLabel: "Example questions",
    suggestions: [
      "Why are my tomato leaves turning yellow?",
      "Which vegetables grow well on a rooftop in monsoon?",
      "How do I apply organic fertiliser to chilli plants?",
      "How should I care for a lemon tree in a pot?",
    ],
    cardsLabel: "Core ChhadKrishi services",
    cards: {
      chat: {
        title: "AI Chat",
        desc: "Ask in Bangla, get instant answers",
        prompt: "I want to start a rooftop garden. Where should I begin?",
      },
      scan: {
        title: "Plant Diagnosis",
        desc: "Spot problems from a photo",
        prompt: "What's wrong with this plant?",
      },
      care: {
        title: "Care Routine",
        desc: "Water, feeding and sunlight plans",
        prompt: "Make me a weekly care routine for my 10 pots.",
      },
      shop: {
        title: "Garden Shop",
        desc: "Seeds, pots and organic fertiliser",
        prompt: "",
      },
    },
  },
  benefits: {
    eyebrow: "Why ChhadKrishi",
    title: "Green success on a small rooftop",
    subtitle: "Gardening fits into busy city life — all it takes is the right advice at the right time.",
    items: [
      {
        title: "Fully in Bangla",
        desc: "No jargon — just everyday language. English is available whenever you prefer.",
      },
      {
        title: "Made for Bangladesh's seasons",
        desc: "Know what to plant and when, aligned with Kharif, Rabi and monsoon cycles.",
      },
      {
        title: "Fast disease detection",
        desc: "One leaf photo is enough to identify the problem and suggest safe, organic fixes.",
      },
      {
        title: "Better harvests, lower cost",
        desc: "Use the right amount of water and fertiliser, cut waste and save money.",
      },
    ],
  },
  features: {
    eyebrow: "Features",
    title: "Everything your garden needs, in one place",
    subtitle: "Tap a feature to see how it works.",
    exampleBadge: "Example",
    tabs: {
      chat: { title: "AI Chat", desc: "Type or speak any question and get step-by-step answers." },
      scan: { title: "Photo Diagnosis", desc: "Upload an affected leaf to learn the disease and its remedy." },
      care: { title: "Care Routine", desc: "A daily task list with timely reminders." },
      shop: { title: "Garden Shop", desc: "Quality seeds, pots and organic fertiliser, delivered." },
    },
    chat: {
      question: "My brinjal leaves are curling. What should I do?",
      answer:
        "Likely aphids or whiteflies — check the underside of the leaves. Mix 5 ml neem oil and a drop of liquid soap in 1 litre of water, spray in the late afternoon, and repeat after 7 days.",
      typing: "Typing…",
      you: "You",
      assistant: "ChhadKrishi",
    },
    scan: {
      analyzing: "Analysing photo…",
      result: "Leaf Spot disease",
      confidence: "Confidence",
      tip: "Prune affected leaves and water at the base — keep the foliage dry.",
    },
    care: {
      title: "Today's tasks",
      tasks: [
        "Water the tomatoes in the morning",
        "Feed chilli plants with mustard cake",
        "Tie the bottle-gourd trellis firmly",
        "Move the mint pot into the shade",
      ],
      progress: (done, total) => `${done} of ${total} done`,
      allDone: "Great job! All of today's tasks are done 🌱",
    },
    shop: {
      filters: { all: "All", seed: "Seeds", pot: "Pots", fertilizer: "Fertiliser" },
      items: [
        { name: "Local tomato seeds", price: 60, category: "seed" },
        { name: "Green chilli seeds", price: 40, category: "seed" },
        { name: "12-inch clay pot", price: 180, category: "pot" },
        { name: "Grow bags (5 pcs)", price: 250, category: "pot" },
        { name: "Vermicompost 5 kg", price: 220, category: "fertilizer" },
        { name: "Neem cake 1 kg", price: 90, category: "fertilizer" },
      ],
      comingSoon: "Prices shown are samples.",
      open: "Visit the shop",
    },
  },
  how: {
    eyebrow: "How it works",
    title: "A healthy garden in three steps",
    subtitle: "From question to solution — simple and fast.",
    steps: [
      { title: "Ask or share a photo", desc: "Type, speak or snap a picture of your plant to describe the issue." },
      { title: "AI analyses it", desc: "It weighs your plant, local weather and the season to find the cause." },
      { title: "Follow the advice", desc: "Get step-by-step fixes and care reminders." },
    ],
  },
  guide: {
    eyebrow: "User guide",
    title: "New here? Start like this",
    subtitle: "Five easy steps to get the most out of ChhadKrishi.",
    prev: "Previous step",
    next: "Next step",
    restart: "Start over",
    stepOf: (n, total) => `Step ${n} of ${total}`,
    steps: [
      {
        title: "Create an account",
        desc: "Sign up for free with your name, email and a password.",
        tip: "It takes less than a minute.",
      },
      {
        title: "Add your garden",
        desc: "Tell us your plants, how many pots you have and how much sun your roof gets.",
        tip: "More detail means more accurate advice.",
      },
      {
        title: "Ask a question",
        desc: "Type in the chat box in Bangla or English, or use the microphone.",
        tip: "Regional dialects are welcome too.",
      },
      {
        title: "Check disease by photo",
        desc: "Take a close, well-lit photo of the affected leaf.",
        tip: "Avoid blurry photos.",
      },
      {
        title: "Follow your routine",
        desc: "Keep watering and feeding reminders on and track your garden's progress.",
        tip: "Consistent care brings better harvests.",
      },
    ],
  },
  cta: {
    title: "Start your green journey today",
    subtitle: "Ask your first question — ChhadKrishi will take care of the rest.",
    button: "Ask a question now",
  },
  footer: {
    tagline: "An AI assistant for rooftop gardeners in Bangladesh.",
    rights: "All rights reserved.",
    madeFor: "Made with love for Bangladesh",
    explore: "Explore",
  },
  auth: {
    signInTab: "Log in",
    signUpTab: "Create account",
    titleSignIn: "Welcome back",
    titleSignUp: "Join ChhadKrishi",
    subtitleSignIn: "Log in to your account.",
    subtitleSignUp: "Create a free account — it takes less than a minute.",
    name: "Your name",
    namePlaceholder: "e.g. Rahima Khatun",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholderSignIn: "Your password",
    passwordPlaceholderSignUp: "At least 8 characters",
    showPassword: "Show password",
    hidePassword: "Hide password",
    submitSignIn: "Log in",
    submitSignUp: "Create account",
    loadingSignIn: "Logging in…",
    loadingSignUp: "Creating account…",
    close: "Close",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    reasons: {
      chat: "Log in to send your question — what you typed is saved.",
      upload: "Log in to add a plant photo.",
      shop: "Log in to visit the Garden Shop.",
      protected: "Log in to view this section.",
      retry: "Log in to send your question again.",
      analyze: "Log in to analyse a plant photo.",
      expired: "Your session has expired. Please log in again.",
    },
    savedPrompt: "Your question",
    imageKept: "Your photo is saved too",
    errors: {
      invalidCredentials: "Incorrect email or password.",
      userExists: "An account with this email already exists. Please log in.",
      passwordShort: "Password must be at least 8 characters.",
      invalidEmail: "Please enter a valid email address.",
      nameRequired: "Please enter your name.",
      rateLimited: "Too many attempts. Please try again in a minute.",
      network: "Connection problem. Check your internet and try again.",
      generic: "Something went wrong. Please try again.",
    },
    welcome: (name) => `Welcome, ${name}!`,
    resuming: "Picking up where you left off…",
    uploadReady: "You're logged in! Now choose a plant photo.",
    chooseImage: "Choose photo",
    panelTitle: "Your rooftop garden, greener",
    panelPoints: ["AI advice in Bangla", "Disease diagnosis by photo", "Care routines and Garden Shop"],
    trust: "Your password is encrypted and stored securely.",
  },
  account: { signIn: "Log in", signOut: "Log out", menu: "Account menu", signingOut: "Logging out…" },
  shopPage: {
    title: "Garden Shop",
    subtitle: "Quality seeds, pots and organic fertiliser — picked for rooftop gardens.",
    greeting: (name) => `${name}, products picked for you`,
    comingSoon: "Prices are shown as samples.",
  },
  aiErrors: {
    UNAUTHORIZED: "Your session has expired. Please log in again.",
    AI_NOT_CONFIGURED: "The AI service hasn't been set up yet.",
    AI_AUTH_FAILED: "Couldn't authenticate with the AI service. Check the server configuration.",
    AI_RATE_LIMITED: "The AI service is busy right now. Please try again shortly.",
    USER_RATE_LIMITED: "You've sent many requests quickly. Please try again in a minute.",
    AI_UNAVAILABLE: "The AI service is temporarily unavailable. Please try again.",
    AI_BAD_OUTPUT: "The AI returned an incomplete answer. Please try again.",
    INVALID_REQUEST: "That request wasn't valid. Refresh the page and try again.",
    INVALID_IMAGE: "Only JPG, PNG or WEBP images can be used.",
    IMAGE_TOO_LARGE: "That image is too large. Please use a smaller one.",
    TEXT_TOO_LONG: "That message is too long. Please shorten it.",
    NOT_FOUND: "This conversation couldn't be found.",
    AI_FAILED: "Something went wrong. Please try again.",
  },
  chat: {
    title: "AI Chat",
    newChat: "New chat",
    history: "Previous chats",
    historyEmpty: "No conversations yet.",
    openHistory: "Open chat list",
    closeHistory: "Close chat list",
    deleteChat: "Delete conversation",
    emptyTitle: (name) => `${name}, how can I help your garden today?`,
    emptySubtitle: "Type a question, or attach a plant photo and ask about it.",
    placeholder: "Ask about your plants…",
    send: "Send",
    stop: "Stop",
    attach: "Attach a photo",
    removeImage: "Remove photo",
    regenerate: "Regenerate answer",
    retry: "Try again",
    copy: "Copy",
    copied: "Copied",
    thinking: "Thinking…",
    you: "You",
    assistant: "ChhadKrishi",
    photo: "Plant photo",
    notConfiguredTitle: "AI isn't connected yet",
    notConfiguredBody: "This server has no AI service key (e.g. OPENROUTER_API_KEY) configured, so answers can't be generated yet. It will work as soon as an admin adds the configuration.",
    loadFailed: "Couldn't load the conversation.",
    disclaimer: "AI can make mistakes. For serious problems, consult your local agriculture officer.",
    analyzeLink: "Photo analysis",
    voice: {
      start: "Ask by voice",
      stop: "Stop recording",
      recording: "Listening… tap again when you're done",
      listen: "Listen",
      stopListening: "Stop",
      loadingAudio: "Loading…",
      errors: {
        micDenied: "Microphone access was blocked. Allow it in your browser settings.",
        micUnsupported: "Voice recording doesn't work in this browser.",
        nothingHeard: "Didn't catch anything. Please try again.",
        failed: "The voice service isn't working right now. Try again shortly.",
      },
    },
  },
  analyze: {
    title: "Plant Photo Analysis",
    subtitle: "Upload a clear photo of the affected leaf or plant — the AI will suggest likely problems and remedies.",
    dropTitle: "Choose a photo or drag it here",
    dropHint: "JPG, PNG or WEBP · up to 10 MB",
    dropActive: "Drop to add the photo",
    choose: "Choose photo",
    change: "Change photo",
    remove: "Remove photo",
    noteLabel: "Anything to add? (optional)",
    tipsTitle: "Tips for a good photo",
    notePlaceholder: "e.g. Yellow spots for a week, I water every morning",
    submit: "Analyse",
    preparing: "Preparing photo…",
    analyzingSteps: ["Uploading photo…", "Examining leaves and stems…", "Looking for likely problems…", "Putting together remedies…"],
    cancel: "Cancel",
    results: {
      title: "Analysis result",
      healthStatus: { healthy: "Looks healthy", issues: "Problems spotted", unclear: "Not certain" },
      confidence: "Confidence",
      urgency: "How soon to act",
      levels: { low: "Low", medium: "Medium", high: "High" },
      issues: "Likely problems",
      noIssues: "No clear problems were spotted.",
      likelihood: "Likelihood",
      treatment: "Treatment",
      organic: "Organic",
      nonOrganic: "Chemical — use with care",
      prevention: "Prevention",
      notPlantTitle: "No plant found in the photo",
      notPlantBody: "Please upload a close-up photo of the plant or the affected leaf.",
      betterPhotoTitle: "A clearer photo is needed",
      unknownPlant: "Plant not identified with certainty",
      askInChat: "Ask about this result in chat",
      askPrompt: (summary) => `My plant photo analysis said: "${summary}" — what should I do next?`,
      newPhoto: "Analyse another photo",
      disclaimer: "AI-generated results can be wrong. If damage is severe, consult your local agriculture officer.",
    },
    imageInvalid: "Only JPG, PNG or WEBP images can be used.",
    imageTooLarge: "That image is larger than 10 MB.",
    imageUnreadable: "Couldn't read that image. Please try another one.",
  },
  chatPage: {
    back: "Back to home",
    title: "AI Chat",
    you: "You",
    assistant: "ChhadKrishi",
    empty: "Start by asking a question from the home page.",
    pendingTitle: "The AI assistant is being connected",
    pendingBody:
      "We've received your question. AI answers will be switched on in our next phase — you'll see responses right here very soon.",
    attachedImage: "Attached photo",
    sending: "Sending…",
    errorGeneric: "Your question couldn't be sent.",
    retry: "Try again",
    greeting: (name) => `${name}, your question`,
  },
};

export const dictionaries: Record<Lang, Dictionary> = {
  bn: { ...bn, ...featureDictionaries.bn, ...designerDictionaries.bn, ...problemsDictionaries.bn, ...shellDictionaries.bn },
  en: { ...en, ...featureDictionaries.en, ...designerDictionaries.en, ...problemsDictionaries.en, ...shellDictionaries.en },
};

/** Render a number with Bangla digits when the active language is Bangla. */
export function formatNumber(n: number, lang: Lang): string {
  return n.toLocaleString(lang === "bn" ? "bn-BD" : "en-US");
}
