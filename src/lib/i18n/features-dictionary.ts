/** Strings for the signed-in app areas: navigation, dashboard, garden, care routine, cart and orders. */

type CareKindKey = "water" | "fertilize" | "prune" | "pest" | "other";
type TimeKey = "morning" | "afternoon" | "evening";

export interface FeatureDictionary {
  landingCta: Record<"chat" | "scan" | "care" | "shop", string>;
  common: {
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    loading: string;
    retry: string;
    saved: string;
    deleted: string;
    confirmDelete: string;
    errors: Record<"VALIDATION_FAILED" | "LIMIT_REACHED" | "NOT_FOUND" | "NETWORK" | "GENERIC", string>;
  };
  appNav: {
    label: string;
    dashboard: string;
    chat: string;
    analyze: string;
    designer: string;
    problems: string;
    garden: string;
    care: string;
    shop: string;
    orders: string;
    weather: string;
    profile: string;
    home: string;
    openMenu: string;
    closeMenu: string;
  };
  dashboard: {
    title: string;
    greeting: (name: string) => string;
    subtitle: string;
    todayTasks: string;
    tasksDone: (done: string, total: string) => string;
    noTasksToday: string;
    noRoutine: string;
    setUpRoutine: string;
    garden: string;
    plantsCount: (n: string) => string;
    noPlants: string;
    addPlants: string;
    recentChats: string;
    noChats: string;
    startChat: string;
    orders: string;
    noOrders: string;
    cartItems: (n: string) => string;
    quickActions: string;
    viewAll: string;
  };
  garden: {
    title: string;
    subtitle: string;
    sunTitle: string;
    sunHelp: string;
    sunHours: (n: string) => string;
    sunUnknown: string;
    plantsTitle: string;
    empty: string;
    name: string;
    namePlaceholder: string;
    pots: string;
    notes: string;
    notesPlaceholder: string;
    addPlant: string;
    potsCount: (n: string) => string;
    suggestions: string[];
    makeRoutine: string;
    aiNote: string;
  };
  care: {
    title: string;
    subtitle: string;
    today: string;
    progress: (done: string, total: string) => string;
    allDone: string;
    nothingToday: string;
    allTasks: string;
    noTasks: string;
    newTask: string;
    taskTitle: string;
    taskTitlePlaceholder: string;
    plant: string;
    wholeGarden: string;
    kind: string;
    kinds: Record<CareKindKey, string>;
    every: string;
    everyDays: (n: string) => string;
    daily: string;
    time: string;
    times: Record<TimeKey, string>;
    nextDue: (date: string) => string;
    dueToday: string;
    suggestTitle: string;
    suggestBody: string;
    suggestButton: string;
    suggesting: string;
    suggestNeedsPlants: string;
    suggestReview: string;
    addSelected: (n: string) => string;
    discard: string;
    added: (n: string) => string;
    remindersNote: string;
  };
  cart: {
    title: string;
    open: string;
    empty: string;
    add: string;
    added: string;
    inCart: (n: string) => string;
    increase: string;
    decrease: string;
    remove: string;
    total: string;
    checkout: string;
    sampleNote: string;
    photoCredits: string;
  };
  checkout: {
    title: string;
    name: string;
    phone: string;
    phonePlaceholder: string;
    phoneInvalid: string;
    address: string;
    addressPlaceholder: string;
    note: string;
    submit: string;
    submitting: string;
    requestNote: string;
    success: string;
    viewOrders: string;
    cartEmpty: string;
    fieldErrors: Record<"customerName" | "phone" | "address", string>;
  };
  orders: {
    title: string;
    subtitle: string;
    empty: string;
    goShop: string;
    placedOn: (date: string) => string;
    status: Record<"requested" | "cancelled", string>;
    cancel: string;
    cancelConfirm: string;
    cancelled: string;
    notCancellable: string;
    total: string;
    deliverTo: string;
    paymentNote: string;
  };
}

const bn: FeatureDictionary = {
  landingCta: { chat: "চ্যাট শুরু করুন", scan: "ছবি বিশ্লেষণ করুন", care: "আমার রুটিন খুলুন", shop: "শপে যান" },
  common: {
    save: "সংরক্ষণ করুন",
    saving: "সংরক্ষণ হচ্ছে…",
    cancel: "বাতিল",
    delete: "মুছুন",
    edit: "সম্পাদনা",
    add: "যোগ করুন",
    loading: "লোড হচ্ছে…",
    retry: "আবার চেষ্টা করুন",
    saved: "সংরক্ষিত হয়েছে",
    deleted: "মুছে ফেলা হয়েছে",
    confirmDelete: "নিশ্চিত? আবার চাপুন",
    errors: {
      VALIDATION_FAILED: "কিছু তথ্য সঠিক নয়। চিহ্নিত ঘরগুলো দেখুন।",
      LIMIT_REACHED: "সর্বোচ্চ সীমায় পৌঁছে গেছেন। কিছু পুরোনো আইটেম মুছে আবার চেষ্টা করুন।",
      NOT_FOUND: "আইটেমটি পাওয়া যায়নি। পাতাটি রিফ্রেশ করুন।",
      NETWORK: "সংযোগে সমস্যা। ইন্টারনেট দেখে আবার চেষ্টা করুন।",
      GENERIC: "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।",
    },
  },
  appNav: {
    label: "অ্যাপ নেভিগেশন",
    dashboard: "ড্যাশবোর্ড",
    chat: "এআই চ্যাট",
    analyze: "ছবি বিশ্লেষণ",
    designer: "গার্ডেন ডিজাইনার",
    problems: "সাধারণ সমস্যা",
    garden: "আমার বাগান",
    care: "যত্নের রুটিন",
    shop: "কৃষি শপ",
    orders: "আমার অর্ডার",
    weather: "আবহাওয়া",
    profile: "আমার প্রোফাইল",
    home: "হোম পেজ",
    openMenu: "মেনু খুলুন",
    closeMenu: "মেনু বন্ধ করুন",
  },
  dashboard: {
    title: "ড্যাশবোর্ড",
    greeting: (name) => `স্বাগতম, ${name}`,
    subtitle: "আজ আপনার বাগানের এক নজরে সব।",
    todayTasks: "আজকের কাজ",
    tasksDone: (done, total) => `${total}টির মধ্যে ${done}টি সম্পন্ন`,
    noTasksToday: "আজ কোনো কাজ বাকি নেই।",
    noRoutine: "এখনো কোনো যত্নের রুটিন নেই।",
    setUpRoutine: "রুটিন সাজান",
    garden: "আমার বাগান",
    plantsCount: (n) => `${n} ধরনের গাছ`,
    noPlants: "এখনো কোনো গাছ যোগ করা হয়নি।",
    addPlants: "গাছ যোগ করুন",
    recentChats: "সাম্প্রতিক কথোপকথন",
    noChats: "এখনো কোনো প্রশ্ন করেননি।",
    startChat: "প্রশ্ন করুন",
    orders: "অর্ডার",
    noOrders: "এখনো কোনো অর্ডার নেই।",
    cartItems: (n) => `কার্টে ${n}টি পণ্য`,
    quickActions: "দ্রুত কাজ",
    viewAll: "সব দেখুন",
  },
  garden: {
    title: "আমার বাগান",
    subtitle: "আপনার গাছ ও ছাদের রোদের তথ্য দিন — এআই পরামর্শ আরও নির্ভুল হবে।",
    sunTitle: "ছাদে রোদ",
    sunHelp: "দিনে প্রায় কত ঘণ্টা সরাসরি রোদ আসে?",
    sunHours: (n) => `${n} ঘণ্টা`,
    sunUnknown: "জানা নেই",
    plantsTitle: "গাছের তালিকা",
    empty: "এখনো কোনো গাছ নেই। নিচে প্রথম গাছটি যোগ করুন।",
    name: "গাছের নাম",
    namePlaceholder: "যেমন: টমেটো",
    pots: "টবের সংখ্যা",
    notes: "নোট (ঐচ্ছিক)",
    notesPlaceholder: "যেমন: হাইব্রিড জাত, ২ মাস বয়স",
    addPlant: "গাছ যোগ করুন",
    potsCount: (n) => `${n}টি টব`,
    suggestions: ["টমেটো", "মরিচ", "বেগুন", "লাউ", "লেবু", "পুদিনা", "ধনেপাতা", "পেঁপে"],
    makeRoutine: "এই গাছগুলোর যত্নের রুটিন সাজান",
    aiNote: "এই তথ্য শুধু আপনার এআই পরামর্শে ব্যবহার হয়।",
  },
  care: {
    title: "যত্নের রুটিন",
    subtitle: "পানি, সার আর পরিচর্যার কাজ — প্রতিদিন কী করতে হবে তা এক জায়গায়।",
    today: "আজকের কাজ",
    progress: (done, total) => `${total}টির মধ্যে ${done}টি সম্পন্ন`,
    allDone: "চমৎকার! আজকের সব কাজ শেষ 🌱",
    nothingToday: "আজ কোনো কাজ নির্ধারিত নেই।",
    allTasks: "সব রুটিন",
    noTasks: "এখনো কোনো রুটিন নেই। নিচে কাজ যোগ করুন অথবা এআই দিয়ে সাজিয়ে নিন।",
    newTask: "নতুন কাজ",
    taskTitle: "কাজ",
    taskTitlePlaceholder: "যেমন: গোড়ায় পানি দিন",
    plant: "গাছ",
    wholeGarden: "পুরো বাগান",
    kind: "ধরন",
    kinds: { water: "পানি", fertilize: "সার", prune: "ছাঁটাই/মাচা", pest: "পোকা দমন", other: "অন্যান্য" },
    every: "কত দিন পরপর",
    everyDays: (n) => `প্রতি ${n} দিনে`,
    daily: "প্রতিদিন",
    time: "সময়",
    times: { morning: "সকাল", afternoon: "দুপুর", evening: "বিকেল/সন্ধ্যা" },
    nextDue: (date) => `পরবর্তী: ${date}`,
    dueToday: "আজ",
    suggestTitle: "এআই দিয়ে রুটিন সাজান",
    suggestBody: "আপনার বাগানের গাছ ও রোদের তথ্য দেখে এআই একটি রুটিন প্রস্তাব করবে। পছন্দেরগুলো বেছে যোগ করুন।",
    suggestButton: "রুটিন প্রস্তাব করুন",
    suggesting: "এআই রুটিন সাজাচ্ছে… (এক মিনিট পর্যন্ত লাগতে পারে)",
    suggestNeedsPlants: "আগে 'আমার বাগান'-এ অন্তত একটি গাছ যোগ করুন।",
    suggestReview: "প্রস্তাবিত কাজ — যেগুলো চান বেছে নিন",
    addSelected: (n) => `${n}টি কাজ যোগ করুন`,
    discard: "বাদ দিন",
    added: (n) => `${n}টি কাজ রুটিনে যোগ হয়েছে`,
    remindersNote: "যেদিন কাজ থাকবে, সকালে 🔔 নোটিফিকেশনে রিমাইন্ডার পাবেন।",
  },
  cart: {
    title: "আপনার কার্ট",
    open: "কার্ট দেখুন",
    empty: "কার্ট খালি। পছন্দের পণ্য যোগ করুন।",
    add: "কার্টে যোগ করুন",
    added: "কার্টে যোগ হয়েছে",
    inCart: (n) => `কার্টে ${n}টি`,
    increase: "পরিমাণ বাড়ান",
    decrease: "পরিমাণ কমান",
    remove: "কার্ট থেকে সরান",
    total: "মোট",
    checkout: "অর্ডার অনুরোধ করুন",
    sampleNote: "দামগুলো নমুনা — চূড়ান্ত দাম অর্ডার নিশ্চিত করার সময় জানানো হবে।",
    photoCredits: "ছবির কৃতজ্ঞতা (Wikimedia Commons)",
  },
  checkout: {
    title: "ডেলিভারির তথ্য",
    name: "নাম",
    phone: "মোবাইল নম্বর",
    phonePlaceholder: "01XXXXXXXXX",
    phoneInvalid: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01 দিয়ে শুরু, ১১ সংখ্যা)।",
    address: "ঠিকানা",
    addressPlaceholder: "বাড়ি, রাস্তা, এলাকা, জেলা",
    note: "নোট (ঐচ্ছিক)",
    submit: "অর্ডার অনুরোধ পাঠান",
    submitting: "পাঠানো হচ্ছে…",
    requestNote: "এটি একটি অর্ডার অনুরোধ — এখন কোনো পেমেন্ট নেওয়া হবে না।",
    success: "অর্ডার অনুরোধ জমা হয়েছে!",
    viewOrders: "আমার অর্ডার দেখুন",
    cartEmpty: "কার্ট খালি — আগে পণ্য যোগ করুন।",
    fieldErrors: { customerName: "আপনার নাম লিখুন (কমপক্ষে ২ অক্ষর)।", phone: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01 দিয়ে শুরু, ১১ সংখ্যা)।", address: "পূর্ণ ঠিকানা লিখুন (কমপক্ষে ৮ অক্ষর)।" },
  },
  orders: {
    title: "আমার অর্ডার",
    subtitle: "আপনার পাঠানো অর্ডার অনুরোধগুলো।",
    empty: "এখনো কোনো অর্ডার নেই।",
    goShop: "শপে যান",
    placedOn: (date) => `অনুরোধ: ${date}`,
    status: { requested: "অপেক্ষমাণ", cancelled: "বাতিল" },
    cancel: "অনুরোধ বাতিল করুন",
    cancelConfirm: "নিশ্চিত? আবার চাপুন",
    cancelled: "অর্ডার অনুরোধ বাতিল হয়েছে",
    notCancellable: "এই অর্ডারটি আর বাতিল করা যাবে না।",
    total: "মোট",
    deliverTo: "ডেলিভারি",
    paymentNote: "অনলাইন পেমেন্ট ও ডেলিভারি এখনো চালু হয়নি; অনুরোধগুলো সংরক্ষিত থাকছে।",
  },
};

const en: FeatureDictionary = {
  landingCta: { chat: "Start chatting", scan: "Analyse a photo", care: "Open my routine", shop: "Visit the shop" },
  common: {
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    loading: "Loading…",
    retry: "Try again",
    saved: "Saved",
    deleted: "Deleted",
    confirmDelete: "Sure? Tap again",
    errors: {
      VALIDATION_FAILED: "Some details aren't valid. Check the highlighted fields.",
      LIMIT_REACHED: "You've reached the limit. Remove some old items and try again.",
      NOT_FOUND: "That item couldn't be found. Please refresh the page.",
      NETWORK: "Connection problem. Check your internet and try again.",
      GENERIC: "Something went wrong. Please try again.",
    },
  },
  appNav: {
    label: "App navigation",
    dashboard: "Dashboard",
    chat: "AI Chat",
    analyze: "Photo Analysis",
    designer: "Garden Designer",
    problems: "Common Problems",
    garden: "My Garden",
    care: "Care Routine",
    shop: "Garden Shop",
    orders: "My Orders",
    weather: "Weather",
    profile: "My Profile",
    home: "Home page",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },
  dashboard: {
    title: "Dashboard",
    greeting: (name) => `Welcome, ${name}`,
    subtitle: "Your garden at a glance today.",
    todayTasks: "Today's tasks",
    tasksDone: (done, total) => `${done} of ${total} done`,
    noTasksToday: "Nothing left to do today.",
    noRoutine: "You don't have a care routine yet.",
    setUpRoutine: "Set up a routine",
    garden: "My garden",
    plantsCount: (n) => `${n} kinds of plants`,
    noPlants: "No plants added yet.",
    addPlants: "Add plants",
    recentChats: "Recent conversations",
    noChats: "You haven't asked anything yet.",
    startChat: "Ask a question",
    orders: "Orders",
    noOrders: "No orders yet.",
    cartItems: (n) => `${n} items in cart`,
    quickActions: "Quick actions",
    viewAll: "View all",
  },
  garden: {
    title: "My Garden",
    subtitle: "Tell us about your plants and rooftop sun — AI advice gets more accurate.",
    sunTitle: "Rooftop sunlight",
    sunHelp: "About how many hours of direct sun does it get per day?",
    sunHours: (n) => `${n} hours`,
    sunUnknown: "Not sure",
    plantsTitle: "Plants",
    empty: "No plants yet. Add your first one below.",
    name: "Plant name",
    namePlaceholder: "e.g. Tomato",
    pots: "Number of pots",
    notes: "Notes (optional)",
    notesPlaceholder: "e.g. hybrid variety, 2 months old",
    addPlant: "Add plant",
    potsCount: (n) => `${n} pots`,
    suggestions: ["Tomato", "Chilli", "Brinjal", "Bottle gourd", "Lemon", "Mint", "Coriander", "Papaya"],
    makeRoutine: "Create a care routine for these plants",
    aiNote: "This is only used to personalise your AI advice.",
  },
  care: {
    title: "Care Routine",
    subtitle: "Watering, feeding and upkeep — what to do each day, in one place.",
    today: "Today's tasks",
    progress: (done, total) => `${done} of ${total} done`,
    allDone: "Great job! All of today's tasks are done 🌱",
    nothingToday: "Nothing is scheduled for today.",
    allTasks: "All routines",
    noTasks: "No routines yet. Add a task below or let the AI suggest some.",
    newTask: "New task",
    taskTitle: "Task",
    taskTitlePlaceholder: "e.g. Water at the base",
    plant: "Plant",
    wholeGarden: "Whole garden",
    kind: "Type",
    kinds: { water: "Water", fertilize: "Fertilise", prune: "Prune/support", pest: "Pest control", other: "Other" },
    every: "Repeat every",
    everyDays: (n) => `Every ${n} days`,
    daily: "Daily",
    time: "Time",
    times: { morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
    nextDue: (date) => `Next: ${date}`,
    dueToday: "Today",
    suggestTitle: "Plan a routine with AI",
    suggestBody: "The AI looks at your plants and sunlight and proposes a routine. Pick the tasks you want.",
    suggestButton: "Suggest a routine",
    suggesting: "The AI is planning your routine… (this can take up to a minute)",
    suggestNeedsPlants: "Add at least one plant in 'My Garden' first.",
    suggestReview: "Suggested tasks — choose the ones you want",
    addSelected: (n) => `Add ${n} tasks`,
    discard: "Discard",
    added: (n) => `${n} tasks added to your routine`,
    remindersNote: "On days with tasks you'll get a morning reminder under 🔔.",
  },
  cart: {
    title: "Your cart",
    open: "View cart",
    empty: "Your cart is empty. Add some products.",
    add: "Add to cart",
    added: "Added to cart",
    inCart: (n) => `${n} in cart`,
    increase: "Increase quantity",
    decrease: "Decrease quantity",
    remove: "Remove from cart",
    total: "Total",
    checkout: "Request order",
    sampleNote: "Prices are samples — the final price is confirmed with your order.",
    photoCredits: "Photo credits (Wikimedia Commons)",
  },
  checkout: {
    title: "Delivery details",
    name: "Name",
    phone: "Mobile number",
    phonePlaceholder: "01XXXXXXXXX",
    phoneInvalid: "Enter a valid Bangladeshi mobile number (starts with 01, 11 digits).",
    address: "Address",
    addressPlaceholder: "House, road, area, district",
    note: "Note (optional)",
    submit: "Send order request",
    submitting: "Sending…",
    requestNote: "This is an order request — no payment is taken now.",
    success: "Order request submitted!",
    viewOrders: "View my orders",
    cartEmpty: "Your cart is empty — add products first.",
    fieldErrors: { customerName: "Enter your name (at least 2 characters).", phone: "Enter a valid Bangladeshi mobile number (starts with 01, 11 digits).", address: "Enter your full address (at least 8 characters)." },
  },
  orders: {
    title: "My Orders",
    subtitle: "Order requests you've sent.",
    empty: "No orders yet.",
    goShop: "Go to the shop",
    placedOn: (date) => `Requested ${date}`,
    status: { requested: "Pending", cancelled: "Cancelled" },
    cancel: "Cancel request",
    cancelConfirm: "Sure? Tap again",
    cancelled: "Order request cancelled",
    notCancellable: "This order can no longer be cancelled.",
    total: "Total",
    deliverTo: "Deliver to",
    paymentNote: "Online payment and delivery aren't live yet; your requests are saved.",
  },
};

export const featureDictionaries = { bn, en };
