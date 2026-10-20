/** Strings for the AI Garden Designer (/designer). */

type Level = "low" | "medium" | "high";

export interface DesignerDictionary {
  designer: {
    title: string;
    subtitle: string;
    stages: { photo: string; consult: string; confirm: string; design: string };
    upload: {
      dropTitle: string;
      dropActive: string;
      dropHint: string;
      preparing: string;
      change: string;
      remove: string;
      start: string;
      starting: string;
      tipsTitle: string;
      tips: string[];
      imageInvalid: string;
      imageTooLarge: string;
      imageUnreadable: string;
    };
    space: { title: string; notGarden: string; continueAnyway: string; changePhoto: string; features: string };
    chat: {
      label: string;
      you: string;
      designer: string;
      thinking: string;
      typeAnswer: string;
      numberAnswer: (unit: string) => string;
      send: string;
      continue: string;
      orType: string;
      progress: (asked: string, total: string) => string;
      fallbackNote: string;
      reviewNow: string;
    };
    review: {
      title: string;
      subtitle: string;
      edit: string;
      done: string;
      missing: string;
      addPlant: string;
      addPlantPlaceholder: string;
      notes: string;
      noNotes: string;
      confirm: string;
      backToChat: string;
      fields: {
        spaceType: string;
        areaSqft: string;
        sunlight: string;
        budgetBdt: string;
        preferredPlants: string;
        experience: string;
        style: string;
        potCount: string;
        maintenance: string;
      };
      units: { sqft: string; pots: string };
      notSet: string;
    };
    values: {
      spaceType: Record<"balcony" | "rooftop" | "terrace" | "windowsill" | "yard" | "indoor" | "other", string>;
      sunlight: Record<"full" | "partial" | "shade", string>;
      experience: Record<"beginner" | "intermediate" | "experienced", string>;
      maintenance: Record<Level, string>;
      care: Record<"easy" | "moderate" | "demanding", string>;
    };
    generating: { planTitle: string; planSteps: string[]; renderTitle: string; renderSteps: string[]; cancel: string; slowNote: string };
    result: {
      eyebrow: string;
      before: string;
      after: string;
      compareLabel: string;
      dragHint: string;
      download: string;
      regenerate: string;
      imageFailedTitle: string;
      imageFailedBody: string;
      retryImage: string;
      concept: string;
      layout: string;
      plants: string;
      qty: (n: string) => string;
      materials: string;
      budget: string;
      total: string;
      yourBudget: (amount: string) => string;
      fitsBudget: string;
      overBudget: string;
      steps: string;
      maintenance: string;
      tips: string;
      editRequirements: string;
      startOver: string;
      askInChat: string;
      askPrompt: (title: string) => string;
      learnProblems: string;
      disclaimer: string;
      planFailed: string;
      testRender: string;
    };
  };
}

const bn: DesignerDictionary = {
  designer: {
    title: "এআই গার্ডেন ডিজাইনার",
    subtitle: "আপনার বারান্দা বা ছাদের একটি ছবি দিন। কয়েকটি প্রশ্নে চাহিদা বুঝে এআই আপনার নিজের জায়গাতেই বাগানের নকশা এঁকে দেবে — সাথে গাছের তালিকা, খরচ ও কাজের ধাপ।",
    stages: { photo: "ছবি", consult: "আলাপ", confirm: "নিশ্চিত", design: "নকশা" },
    upload: {
      dropTitle: "আপনার জায়গার ছবি দিন",
      dropActive: "এখানে ছেড়ে দিন",
      dropHint: "বারান্দা, ছাদ বা জানালার পাশ — JPG, PNG বা WebP, ১০ MB পর্যন্ত",
      preparing: "ছবি প্রস্তুত হচ্ছে…",
      change: "বদলান",
      remove: "ছবি সরান",
      start: "আলাপ শুরু করুন",
      starting: "আপনার জায়গাটি দেখছি…",
      tipsTitle: "ভালো নকশার জন্য ছবি তোলার টিপস",
      tips: ["পুরো জায়গাটা ফ্রেমে রাখুন — কোণ থেকে তুলুন", "দিনের আলোয় তুলুন", "টব বা জিনিসপত্র সরানোর দরকার নেই"],
      imageInvalid: "শুধু JPG, PNG বা WebP ছবি দিন।",
      imageTooLarge: "ছবিটি অনেক বড় — ১০ MB-এর ছোট ছবি দিন।",
      imageUnreadable: "ছবিটি পড়া যাচ্ছে না। অন্য একটি ছবি চেষ্টা করুন।",
    },
    space: {
      title: "আপনার জায়গা",
      notGarden: "ছবিতে বারান্দা বা ছাদের মতো কোনো জায়গা স্পষ্ট বোঝা যাচ্ছে না। তবুও চালিয়ে যেতে পারেন, অথবা অন্য ছবি দিন।",
      continueAnyway: "তবুও চালিয়ে যান",
      changePhoto: "অন্য ছবি দিন",
      features: "যা রাখা হবে",
    },
    chat: {
      label: "ডিজাইন আলাপ",
      you: "আপনি",
      designer: "ডিজাইনার",
      thinking: "ভাবছি…",
      typeAnswer: "নিজের ভাষায় উত্তর লিখুন…",
      numberAnswer: (unit) => (unit ? `সংখ্যা লিখুন (${unit})` : "সংখ্যা লিখুন"),
      send: "পাঠান",
      continue: "এগিয়ে যান",
      orType: "অথবা নিজে লিখুন",
      progress: (asked, total) => `প্রশ্ন ${asked} / সর্বোচ্চ ${total}`,
      fallbackNote: "এআই এখন একটু ব্যস্ত, তাই একটি সাধারণ প্রশ্ন করছি।",
      reviewNow: "যথেষ্ট হয়েছে, পর্যালোচনা করুন",
    },
    review: {
      title: "আপনার চাহিদা নিশ্চিত করুন",
      subtitle: "সব ঠিক আছে কিনা দেখে নিন। যেকোনো তথ্য বদলাতে পারেন।",
      edit: "বদলান",
      done: "ঠিক আছে",
      missing: "কিছু তথ্য বাকি আছে — দয়া করে পূরণ করুন।",
      addPlant: "যোগ করুন",
      addPlantPlaceholder: "যেমন: টমেটো",
      notes: "অন্যান্য বিষয়",
      noNotes: "কিছু নেই",
      confirm: "আমার বাগানের নকশা তৈরি করুন",
      backToChat: "আলাপে ফিরুন",
      fields: {
        spaceType: "জায়গার ধরন",
        areaSqft: "আয়তন",
        sunlight: "রোদ",
        budgetBdt: "বাজেট",
        preferredPlants: "পছন্দের গাছ",
        experience: "অভিজ্ঞতা",
        style: "ডিজাইন স্টাইল",
        potCount: "টবের সংখ্যা",
        maintenance: "যত্নের সময়",
      },
      units: { sqft: "বর্গফুট", pots: "টি টব" },
      notSet: "দেওয়া হয়নি",
    },
    values: {
      spaceType: { balcony: "বারান্দা", rooftop: "ছাদ", terrace: "টেরেস", windowsill: "জানালার পাশ", yard: "উঠান", indoor: "ঘরের ভেতর", other: "অন্যান্য" },
      sunlight: { full: "পূর্ণ রোদ (৬+ ঘণ্টা)", partial: "আংশিক রোদ (৩–৬ ঘণ্টা)", shade: "ছায়া (৩ ঘণ্টার কম)" },
      experience: { beginner: "নতুন", intermediate: "কিছুটা অভিজ্ঞ", experienced: "অভিজ্ঞ" },
      maintenance: { low: "কম", medium: "মাঝারি", high: "বেশি" },
      care: { easy: "সহজ যত্ন", moderate: "মাঝারি যত্ন", demanding: "বেশি যত্ন" },
    },
    generating: {
      planTitle: "আপনার নকশা পরিকল্পনা করছি",
      planSteps: ["জায়গা ও রোদ মিলিয়ে দেখছি", "উপযুক্ত গাছ বাছাই করছি", "বাজেট হিসাব করছি", "কাজের ধাপ সাজাচ্ছি"],
      renderTitle: "আপনার ছবিতে বাগান আঁকছি",
      renderSteps: ["ছবির কাঠামো ঠিক রাখছি", "টব ও গাছ বসাচ্ছি", "আলো-ছায়া মেলাচ্ছি"],
      cancel: "বাতিল",
      slowNote: "ছবি তৈরি করতে ৩০–৬০ সেকেন্ড লাগতে পারে।",
    },
    result: {
      eyebrow: "আপনার বাগানের নকশা",
      before: "আগে",
      after: "পরে",
      compareLabel: "আগে ও পরের তুলনা — স্লাইডার সরিয়ে দেখুন",
      dragHint: "স্লাইডার টেনে আগে-পরে দেখুন",
      download: "ছবি ডাউনলোড",
      regenerate: "নতুন ছবি তৈরি",
      imageFailedTitle: "নকশার ছবি তৈরি করা গেল না",
      imageFailedBody: "পরিকল্পনা তৈরি আছে — নিচে দেখুন। ছবিটি আবার চেষ্টা করতে পারেন।",
      retryImage: "ছবি আবার চেষ্টা করুন",
      concept: "নকশার ভাবনা",
      layout: "কোথায় কী বসবে",
      plants: "প্রস্তাবিত গাছ",
      qty: (n) => `${n}টি`,
      materials: "উপকরণ",
      budget: "আনুমানিক খরচ",
      total: "মোট",
      yourBudget: (amount) => `আপনার বাজেট ${amount}`,
      fitsBudget: "বাজেটের মধ্যে",
      overBudget: "বাজেটের বেশি",
      steps: "ধাপে ধাপে বাস্তবায়ন",
      maintenance: "নিয়মিত যত্ন",
      tips: "কাজের টিপস",
      editRequirements: "চাহিদা বদলে আবার",
      startOver: "নতুন জায়গা",
      askInChat: "চ্যাটে প্রশ্ন করুন",
      askPrompt: (title) => `আমার বাগানের নকশা "${title}" নিয়ে আরও জানতে চাই। কোথা থেকে শুরু করব?`,
      learnProblems: "সাধারণ সমস্যা ও সমাধান",
      disclaimer: "এআই-তৈরি ছবি ও খরচ আনুমানিক। বাস্তবে গাছের আকার, দাম ও প্রাপ্যতা ভিন্ন হতে পারে; ভারী টব বসানোর আগে ছাদ বা বারান্দার ভার বহনক্ষমতা যাচাই করুন।",
      planFailed: "নকশা তৈরি করা গেল না।",
      testRender: "🧪 পরীক্ষামূলক মোড — মূল ছবিটিই দেখানো হচ্ছে",
    },
  },
};

const en: DesignerDictionary = {
  designer: {
    title: "AI Garden Designer",
    subtitle: "Upload a photo of your balcony or rooftop. After a few questions, the AI designs a garden on your own space — with a plant list, budget and build steps.",
    stages: { photo: "Photo", consult: "Consult", confirm: "Confirm", design: "Design" },
    upload: {
      dropTitle: "Add a photo of your space",
      dropActive: "Drop it here",
      dropHint: "Balcony, rooftop or windowsill — JPG, PNG or WebP, up to 10 MB",
      preparing: "Preparing photo…",
      change: "Change",
      remove: "Remove photo",
      start: "Start consultation",
      starting: "Looking at your space…",
      tipsTitle: "Photo tips for a better design",
      tips: ["Fit the whole space in the frame — shoot from a corner", "Use daylight", "No need to clear pots or clutter"],
      imageInvalid: "Please choose a JPG, PNG or WebP image.",
      imageTooLarge: "That image is too large — please use one under 10 MB.",
      imageUnreadable: "We couldn't read that image. Try another one.",
    },
    space: {
      title: "Your space",
      notGarden: "We can't clearly see a balcony, rooftop or similar space in this photo. You can continue anyway or try another photo.",
      continueAnyway: "Continue anyway",
      changePhoto: "Try another photo",
      features: "We'll keep",
    },
    chat: {
      label: "Design consultation",
      you: "You",
      designer: "Designer",
      thinking: "Thinking…",
      typeAnswer: "Type your answer in your own words…",
      numberAnswer: (unit) => (unit ? `Enter a number (${unit})` : "Enter a number"),
      send: "Send",
      continue: "Continue",
      orType: "or type your own",
      progress: (asked, total) => `Question ${asked} of up to ${total}`,
      fallbackNote: "The AI is busy right now, so here's a standard question.",
      reviewNow: "That's enough — review",
    },
    review: {
      title: "Confirm your requirements",
      subtitle: "Check everything looks right. You can change any detail.",
      edit: "Edit",
      done: "Done",
      missing: "A few details are still missing — please fill them in.",
      addPlant: "Add",
      addPlantPlaceholder: "e.g. tomato",
      notes: "Other notes",
      noNotes: "None",
      confirm: "Design my garden",
      backToChat: "Back to consultation",
      fields: {
        spaceType: "Space",
        areaSqft: "Area",
        sunlight: "Sunlight",
        budgetBdt: "Budget",
        preferredPlants: "Preferred plants",
        experience: "Experience",
        style: "Design style",
        potCount: "Number of pots",
        maintenance: "Care time",
      },
      units: { sqft: "sq ft", pots: "pots" },
      notSet: "Not set",
    },
    values: {
      spaceType: { balcony: "Balcony", rooftop: "Rooftop", terrace: "Terrace", windowsill: "Windowsill", yard: "Yard", indoor: "Indoors", other: "Other" },
      sunlight: { full: "Full sun (6h+)", partial: "Partial sun (3–6h)", shade: "Shade (under 3h)" },
      experience: { beginner: "Beginner", intermediate: "Some experience", experienced: "Experienced" },
      maintenance: { low: "Low", medium: "Medium", high: "High" },
      care: { easy: "Easy care", moderate: "Moderate care", demanding: "Needs attention" },
    },
    generating: {
      planTitle: "Planning your design",
      planSteps: ["Matching space and sunlight", "Choosing suitable plants", "Working out the budget", "Ordering the build steps"],
      renderTitle: "Painting the garden onto your photo",
      renderSteps: ["Keeping your space's structure", "Placing pots and plants", "Matching light and shadow"],
      cancel: "Cancel",
      slowNote: "The image can take 30–60 seconds.",
    },
    result: {
      eyebrow: "Your garden design",
      before: "Before",
      after: "After",
      compareLabel: "Before and after comparison — move the slider",
      dragHint: "Drag the slider to compare",
      download: "Download image",
      regenerate: "New variation",
      imageFailedTitle: "We couldn't create the design image",
      imageFailedBody: "Your plan is ready below. You can try the image again.",
      retryImage: "Try the image again",
      concept: "Design concept",
      layout: "What goes where",
      plants: "Recommended plants",
      qty: (n) => `× ${n}`,
      materials: "Materials",
      budget: "Estimated budget",
      total: "Total",
      yourBudget: (amount) => `Your budget ${amount}`,
      fitsBudget: "Within budget",
      overBudget: "Over budget",
      steps: "Step-by-step build",
      maintenance: "Routine care",
      tips: "Practical tips",
      editRequirements: "Tweak requirements",
      startOver: "New space",
      askInChat: "Ask in chat",
      askPrompt: (title) => `I'd like to know more about my garden design "${title}". Where should I start?`,
      learnProblems: "Common problems & fixes",
      disclaimer: "AI images and costs are estimates. Real plant sizes, prices and availability vary; check your roof or balcony's load capacity before placing heavy pots.",
      planFailed: "We couldn't create the design.",
      testRender: "🧪 Test mode — showing your original photo",
    },
  },
};

export const designerDictionaries = { bn, en };
