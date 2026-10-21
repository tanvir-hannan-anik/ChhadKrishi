/** Strings for the weather, profile and notification features, and the landing weather section. */
import type { Condition, Season, TipKey } from "@/lib/weather/model";

export interface WeatherDictionary {
  weather: {
    title: string;
    subtitle: string;
    loading: string;
    unavailable: string;
    retry: string;
    defaultPlace: string;
    setLocation: string;
    changeLocation: string;
    conditions: Record<Condition, string>;
    clearNight: string;
    seasons: Record<Season, { name: string; months: string; desc: string }>;
    seasonLabel: string;
    feelsLike: (n: string) => string;
    humidity: string;
    wind: string;
    rainToday: string;
    uv: string;
    sunrise: string;
    sunset: string;
    now: string;
    next24: string;
    past7: string;
    next7: string;
    today: string;
    tomorrow: string;
    yesterday: string;
    mm: (n: string) => string;
    kmh: (n: string) => string;
    chance: (n: string) => string;
    lastWeekRain: (mm: string, rainyDays: string) => string;
    tipsTitle: string;
    tips: Record<TipKey, (value: string) => string>;
    seasonTips: Record<Season, string>;
    viewDetails: string;
    updated: (time: string) => string;
    source: string;
    chipLabel: (temp: string, condition: string, place: string) => string;
    chartTitle: string;
    high: string;
    low: string;
    rain: string;
    signInNote: string;
  };
  profile: {
    title: string;
    subtitle: string;
    photo: string;
    changePhoto: string;
    removePhoto: string;
    photoHint: string;
    photoInvalid: string;
    photoSaved: string;
    photoRemoved: string;
    personal: string;
    name: string;
    nameError: string;
    email: string;
    address: string;
    addressPlaceholder: string;
    addressHint: string;
    useLocation: string;
    locating: string;
    locationDenied: string;
    locationUnsupported: string;
    locationFailed: string;
    locationFilled: string;
    years: string;
    yearsPlaceholder: string;
    yearsSuffix: string;
    yearsError: string;
    levels: { new: string; learning: string; experienced: string; expert: string };
    save: string;
    saving: string;
    saved: string;
    savedNotLocated: string;
    weatherFor: (place: string) => string;
    notificationsTitle: string;
    notificationsBody: string;
    enablePush: string;
    enablingPush: string;
    disablePush: string;
    pushOn: string;
    pushBlocked: string;
    pushUnsupported: string;
    pushNotConfigured: string;
    pushFailed: string;
    iosHint: string;
  };
  notifications: {
    title: string;
    open: (unread: string) => string;
    empty: string;
    markAll: string;
    enableCta: string;
    enableBody: string;
    justNow: string;
  };
  landingWeather: {
    nav: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: { title: string; desc: string }[];
    demoPlace: string;
    loginNote: string;
    cta: string;
  };
}

const bn: WeatherDictionary = {
  weather: {
    title: "আবহাওয়া",
    subtitle: "আপনার এলাকার গত ৭ দিন, আজ আর সামনের সপ্তাহের আবহাওয়া — বাগানের পরামর্শসহ।",
    loading: "আবহাওয়া আনা হচ্ছে…",
    unavailable: "এই মুহূর্তে আবহাওয়ার তথ্য পাওয়া যাচ্ছে না।",
    retry: "আবার চেষ্টা করুন",
    defaultPlace: "ঢাকা",
    setLocation: "প্রোফাইলে আপনার ঠিকানা দিন",
    changeLocation: "লোকেশন বদলান",
    conditions: {
      clear: "রোদেলা আকাশ",
      partly: "আংশিক মেঘলা",
      cloudy: "মেঘলা আকাশ",
      fog: "কুয়াশা",
      drizzle: "গুঁড়ি গুঁড়ি বৃষ্টি",
      rain: "বৃষ্টি",
      storm: "বজ্রসহ বৃষ্টি",
    },
    clearNight: "পরিষ্কার রাত",
    seasons: {
      grishmo: { name: "গ্রীষ্ম", months: "বৈশাখ–জ্যৈষ্ঠ", desc: "তীব্র রোদ ও গরম — ছাদের টবে পানির চাহিদা সবচেয়ে বেশি।" },
      borsha: { name: "বর্ষা", months: "আষাঢ়–শ্রাবণ", desc: "টানা বৃষ্টি — পানি নিষ্কাশন আর ছত্রাক থেকে সাবধান।" },
      shorot: { name: "শরৎ", months: "ভাদ্র–আশ্বিন", desc: "সাদা মেঘ আর কাশফুল — শীতের সবজির চারা তৈরির সময়।" },
      hemonto: { name: "হেমন্ত", months: "কার্তিক–অগ্রহায়ণ", desc: "শিশিরভেজা সকাল — শীতের সবজি লাগানোর সেরা সময়।" },
      sheet: { name: "শীত", months: "পৌষ–মাঘ", desc: "ঠান্ডা ও শুষ্ক — কম পানি, চারাকে কুয়াশা থেকে রক্ষা করুন।" },
      boshonto: { name: "বসন্ত", months: "ফাল্গুন–চৈত্র", desc: "ফুলের মৌসুম — গ্রীষ্মের সবজির বীজ বোনার সময়।" },
    },
    seasonLabel: "ঋতু",
    feelsLike: (n) => `অনুভূত ${n}°`,
    humidity: "আর্দ্রতা",
    wind: "বাতাস",
    rainToday: "আজকের বৃষ্টি",
    uv: "ইউভি সূচক",
    sunrise: "সূর্যোদয়",
    sunset: "সূর্যাস্ত",
    now: "এখন",
    next24: "আগামী ২৪ ঘণ্টা",
    past7: "গত ৭ দিন",
    next7: "আগামী ৭ দিন",
    today: "আজ",
    tomorrow: "আগামীকাল",
    yesterday: "গতকাল",
    mm: (n) => `${n} মিমি`,
    kmh: (n) => `${n} কিমি/ঘ`,
    chance: (n) => `${n}%`,
    lastWeekRain: (mm, days) => `গত ৭ দিনে মোট ${mm} মিমি বৃষ্টি, ${days} দিন বৃষ্টি হয়েছে।`,
    tipsTitle: "আবহাওয়া বুঝে বাগানের পরামর্শ",
    tips: {
      storm: () => "ঝড়-বৃষ্টির সম্ভাবনা: মাচা ও লম্বা গাছ শক্ত করে বাঁধুন, ছোট টব নিরাপদে সরান।",
      heavyRain: (v) => `ভারী বৃষ্টি (~${v} মিমি) আসছে: পানি দেওয়া বন্ধ রাখুন, টবের নিচের ছিদ্র পরিষ্কার রাখুন।`,
      rainSoon: () => "সামনে বৃষ্টির সম্ভাবনা: পানি কম দিন, স্প্রে বা সার দেওয়া বৃষ্টির পরে করুন।",
      heat: (v) => `আজ গরম (${v}°C): সকাল ও সন্ধ্যায় পানি দিন, দুপুরে শেড নেট দিন, মালচিং করুন।`,
      humid: (v) => `আর্দ্রতা বেশি (${v}%): ছত্রাকের দাগ খেয়াল করুন, পাতায় নয়, গোড়ায় পানি দিন।`,
      windy: (v) => `জোরালো বাতাস (${v} কিমি/ঘ): লম্বা গাছে খুঁটি দিন, হালকা টব দেয়ালের পাশে রাখুন।`,
      dry: () => "গত সপ্তাহ শুকনো গেছে: মাটির ২ ইঞ্চি নিচে শুকনো হলে ভালো করে পানি দিন।",
      cold: (v) => `রাতে ঠান্ডা (${v}°C): চারা ও কচি গাছ রাতে ঢেকে রাখুন।`,
      uv: (v) => `ইউভি খুব বেশি (${v}): কচি চারা দুপুরে ছায়ায় রাখুন।`,
    },
    seasonTips: {
      grishmo: "গ্রীষ্মে ঢেঁড়স, পুঁইশাক, কাঁকরোল ভালো হয়; টবের মাটি মালচ দিয়ে ঢেকে রাখুন।",
      borsha: "বর্ষায় উঁচু বেড বা টব ব্যবহার করুন; লাউ, চিচিঙ্গা, ধুন্দুল লাগানোর সময়।",
      shorot: "শরতে ফুলকপি, বাঁধাকপি, টমেটোর চারা তৈরি শুরু করুন।",
      hemonto: "হেমন্তে শীতের সবজির চারা টবে লাগান, জৈব সার দিন।",
      sheet: "শীতে পানি কম দিন, দুপুরের রোদে টব রাখুন; টমেটো, লালশাক, পালং ভালো হয়।",
      boshonto: "বসন্তে গ্রীষ্মের সবজির বীজ বুনুন; জাবপোকা ও মাকড় খেয়াল রাখুন।",
    },
    viewDetails: "বিস্তারিত দেখুন",
    updated: (time) => `হালনাগাদ ${time}`,
    source: "তথ্যসূত্র: Open-Meteo",
    chipLabel: (temp, condition, place) => `আবহাওয়া: ${place} — ${temp}°, ${condition}। বিস্তারিত দেখুন`,
    chartTitle: "তাপমাত্রা ও বৃষ্টি",
    high: "সর্বোচ্চ",
    low: "সর্বনিম্ন",
    rain: "বৃষ্টি",
    signInNote: "আবহাওয়া দেখতে লগইন করুন।",
  },
  profile: {
    title: "আমার প্রোফাইল",
    subtitle: "আপনার তথ্য দিলে আবহাওয়া আর পরামর্শ আরও নির্ভুল হয়।",
    photo: "প্রোফাইল ছবি",
    changePhoto: "ছবি বদলান",
    removePhoto: "ছবি সরান",
    photoHint: "JPG, PNG বা WebP — আমরা ছোট করে সংরক্ষণ করি।",
    photoInvalid: "ছবিটি পড়া গেল না। অন্য একটি ছবি দিন।",
    photoSaved: "প্রোফাইল ছবি হালনাগাদ হয়েছে",
    photoRemoved: "প্রোফাইল ছবি সরানো হয়েছে",
    personal: "ব্যক্তিগত তথ্য",
    name: "নাম",
    nameError: "কমপক্ষে ২ অক্ষরের নাম দিন।",
    email: "ইমেইল",
    address: "ঠিকানা",
    addressPlaceholder: "বাসা/রোড, এলাকা, শহর — যেমন: রোড ৮, ধানমন্ডি, ঢাকা",
    addressHint: "নিজে লিখুন অথবা লাইভ লোকেশন দিন — এই ঠিকানা অনুযায়ী আবহাওয়া দেখানো হবে।",
    useLocation: "লাইভ লোকেশন ব্যবহার করুন",
    locating: "লোকেশন খোঁজা হচ্ছে…",
    locationDenied: "লোকেশনের অনুমতি দেওয়া হয়নি। ব্রাউজারের সেটিংস থেকে অনুমতি দিন অথবা ঠিকানা লিখুন।",
    locationUnsupported: "এই ব্রাউজারে লোকেশন সুবিধা নেই। ঠিকানা লিখে দিন।",
    locationFailed: "লোকেশন থেকে ঠিকানা পাওয়া যায়নি। আবার চেষ্টা করুন অথবা লিখে দিন।",
    locationFilled: "ঠিকানা বসানো হয়েছে — দেখে নিয়ে সংরক্ষণ করুন।",
    years: "কত বছর ধরে বাগান করছেন?",
    yearsPlaceholder: "যেমন: ৩",
    yearsSuffix: "বছর",
    yearsError: "০ থেকে ৮০-এর মধ্যে একটি সংখ্যা দিন।",
    levels: { new: "নতুন বাগানি", learning: "শিখছেন", experienced: "অভিজ্ঞ বাগানি", expert: "দক্ষ বাগানি" },
    save: "সংরক্ষণ করুন",
    saving: "সংরক্ষণ হচ্ছে…",
    saved: "প্রোফাইল সংরক্ষিত হয়েছে",
    savedNotLocated: "সংরক্ষিত হয়েছে, তবে ঠিকানাটি মানচিত্রে পাওয়া যায়নি — নির্ভুল আবহাওয়ার জন্য লাইভ লোকেশন দিন।",
    weatherFor: (place) => `আবহাওয়া দেখানো হচ্ছে: ${place}`,
    notificationsTitle: "নোটিফিকেশন",
    notificationsBody: "ঝড়-বৃষ্টি, তীব্র গরমের সতর্কতা আর যত্নের রিমাইন্ডার সরাসরি এই ফোন বা কম্পিউটারে পান — ওয়েবসাইট বন্ধ থাকলেও।",
    enablePush: "এই ডিভাইসে নোটিফিকেশন চালু করুন",
    enablingPush: "চালু হচ্ছে…",
    disablePush: "এই ডিভাইসে বন্ধ করুন",
    pushOn: "এই ডিভাইসে নোটিফিকেশন চালু আছে।",
    pushBlocked: "ব্রাউজারে নোটিফিকেশন ব্লক করা আছে। ঠিকানাবারের 🔒 আইকন থেকে অনুমতি দিন।",
    pushUnsupported: "এই ব্রাউজার পুশ নোটিফিকেশন সমর্থন করে না। তবুও ওয়েবসাইটের 🔔 তালিকায় সব দেখতে পাবেন।",
    pushNotConfigured: "সার্ভারে পুশ নোটিফিকেশন এখনো চালু করা হয়নি।",
    pushFailed: "নোটিফিকেশন চালু করা যায়নি। আবার চেষ্টা করুন।",
    iosHint: "iPhone/iPad-এ: Safari-তে Share → “Add to Home Screen” করে সেখান থেকে খুলে চালু করুন।",
  },
  notifications: {
    title: "নোটিফিকেশন",
    open: (unread) => (unread === "০" ? "নোটিফিকেশন" : `নোটিফিকেশন, ${unread}টি নতুন`),
    empty: "এখনো কোনো নোটিফিকেশন নেই। আবহাওয়ার সতর্কতা আর রিমাইন্ডার এখানে আসবে।",
    markAll: "সব পড়া হয়েছে",
    enableCta: "ফোনে নোটিফিকেশন চালু করুন",
    enableBody: "ওয়েবসাইট বন্ধ থাকলেও ঝড়-বৃষ্টির সতর্কতা পাবেন।",
    justNow: "এইমাত্র",
  },
  landingWeather: {
    nav: "আবহাওয়া",
    eyebrow: "লাইভ আবহাওয়া",
    title: "আপনার ছাদের আবহাওয়া, বাগানের ভাষায়",
    subtitle: "লগইন করলেই আপনার এলাকার আবহাওয়া, ষড়ঋতুর হিসাব আর সময়মতো সতর্কতা — সব এক জায়গায়।",
    steps: [
      { title: "লোকেশন দিন", desc: "প্রোফাইলে এক ট্যাপে লাইভ লোকেশন দিন, বা ঠিকানা লিখে দিন।" },
      { title: "লাইভ পূর্বাভাস", desc: "ড্যাশবোর্ডে বৃষ্টি-রোদের অ্যানিমেশন, ঋতু আর গত ৭ দিনের হিসাব দেখুন।" },
      { title: "এআই বুঝে পরামর্শ দেয়", desc: "চ্যাটে প্রশ্ন করলে এআই আজকের আবহাওয়া মিলিয়ে উত্তর দেয় — যেমন বৃষ্টির আগে পানি না দেওয়া।" },
      { title: "সময়মতো নোটিফিকেশন", desc: "ঝড়, ভারী বৃষ্টি বা তীব্র গরমের আগে ফোনে সতর্কবার্তা পান।" },
    ],
    demoPlace: "মিরপুর, ঢাকা",
    loginNote: "আবহাওয়া ফিচারটি শুধু লগইন করা ব্যবহারকারীদের জন্য।",
    cta: "আমার এলাকার আবহাওয়া দেখুন",
  },
};

const en: WeatherDictionary = {
  weather: {
    title: "Weather",
    subtitle: "The last 7 days, today and the week ahead where you garden — with garden advice.",
    loading: "Loading the weather…",
    unavailable: "Weather is unavailable right now.",
    retry: "Try again",
    defaultPlace: "Dhaka",
    setLocation: "Add your address in your profile",
    changeLocation: "Change location",
    conditions: {
      clear: "Sunny",
      partly: "Partly cloudy",
      cloudy: "Overcast",
      fog: "Foggy",
      drizzle: "Drizzle",
      rain: "Rain",
      storm: "Thunderstorm",
    },
    clearNight: "Clear night",
    seasons: {
      grishmo: { name: "Grishmo · Summer", months: "Boishakh–Joishtho", desc: "Fierce sun and heat — rooftop pots need the most water." },
      borsha: { name: "Borsha · Monsoon", months: "Asharh–Srabon", desc: "Steady rain — watch drainage and fungus." },
      shorot: { name: "Shorot · Early autumn", months: "Bhadro–Ashwin", desc: "White clouds and kash flowers — time to raise winter seedlings." },
      hemonto: { name: "Hemonto · Late autumn", months: "Kartik–Ogrohayon", desc: "Dewy mornings — the best time to plant winter vegetables." },
      sheet: { name: "Sheet · Winter", months: "Poush–Magh", desc: "Cool and dry — water less and shield seedlings from fog." },
      boshonto: { name: "Boshonto · Spring", months: "Falgun–Choitro", desc: "Flower season — sow summer vegetables." },
    },
    seasonLabel: "Season",
    feelsLike: (n) => `Feels ${n}°`,
    humidity: "Humidity",
    wind: "Wind",
    rainToday: "Rain today",
    uv: "UV index",
    sunrise: "Sunrise",
    sunset: "Sunset",
    now: "Now",
    next24: "Next 24 hours",
    past7: "Last 7 days",
    next7: "Next 7 days",
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    mm: (n) => `${n} mm`,
    kmh: (n) => `${n} km/h`,
    chance: (n) => `${n}%`,
    lastWeekRain: (mm, days) => `${mm} mm of rain over the last 7 days, on ${days} ${days === "1" ? "day" : "days"}.`,
    tipsTitle: "Garden advice for this weather",
    tips: {
      storm: () => "Thunderstorm likely: tie down trellises and tall plants, move small pots to shelter.",
      heavyRain: (v) => `Heavy rain (~${v} mm) coming: skip watering and keep drainage holes clear.`,
      rainSoon: () => "Rain is likely: water less, and spray or feed after the rain.",
      heat: (v) => `Hot today (${v}°C): water morning and evening, shade at midday, mulch the pots.`,
      humid: (v) => `Very humid (${v}%): watch for fungal spots; water the soil, not the leaves.`,
      windy: (v) => `Strong wind (${v} km/h): stake tall plants and keep light pots by a wall.`,
      dry: () => "A dry week: water deeply when the soil is dry 2 inches down.",
      cold: (v) => `Cold night (${v}°C): cover seedlings and young plants overnight.`,
      uv: (v) => `Very high UV (${v}): keep young seedlings in shade at midday.`,
    },
    seasonTips: {
      grishmo: "Okra, Malabar spinach and teasel gourd thrive now; mulch pot soil against the heat.",
      borsha: "Use raised beds or pots; time to plant bottle gourd, snake gourd and sponge gourd.",
      shorot: "Start cauliflower, cabbage and tomato seedlings for winter.",
      hemonto: "Transplant winter vegetable seedlings and add organic compost.",
      sheet: "Water less and give pots the midday sun; tomato, red amaranth and spinach do well.",
      boshonto: "Sow summer vegetables; keep an eye out for aphids and mites.",
    },
    viewDetails: "View details",
    updated: (time) => `Updated ${time}`,
    source: "Data: Open-Meteo",
    chipLabel: (temp, condition, place) => `Weather in ${place}: ${temp}°, ${condition}. View details`,
    chartTitle: "Temperature and rain",
    high: "High",
    low: "Low",
    rain: "Rain",
    signInNote: "Log in to see the weather.",
  },
  profile: {
    title: "My profile",
    subtitle: "Your details make the weather and advice more accurate.",
    photo: "Profile photo",
    changePhoto: "Change photo",
    removePhoto: "Remove photo",
    photoHint: "JPG, PNG or WebP — we store a small copy.",
    photoInvalid: "That image could not be read. Try another one.",
    photoSaved: "Profile photo updated",
    photoRemoved: "Profile photo removed",
    personal: "Personal details",
    name: "Name",
    nameError: "Enter a name of at least 2 characters.",
    email: "Email",
    address: "Address",
    addressPlaceholder: "House/road, area, city — e.g. Road 8, Dhanmondi, Dhaka",
    addressHint: "Type it or use your live location — the weather follows this address.",
    useLocation: "Use live location",
    locating: "Finding your location…",
    locationDenied: "Location permission was denied. Allow it in your browser settings or type your address.",
    locationUnsupported: "This browser can't share a location. Please type your address.",
    locationFailed: "Couldn't turn your location into an address. Try again or type it.",
    locationFilled: "Address filled in — check it, then save.",
    years: "How many years have you been gardening?",
    yearsPlaceholder: "e.g. 3",
    yearsSuffix: "years",
    yearsError: "Enter a number from 0 to 80.",
    levels: { new: "New gardener", learning: "Learning", experienced: "Experienced", expert: "Expert gardener" },
    save: "Save",
    saving: "Saving…",
    saved: "Profile saved",
    savedNotLocated: "Saved, but that address wasn't found on the map — use live location for accurate weather.",
    weatherFor: (place) => `Weather shown for: ${place}`,
    notificationsTitle: "Notifications",
    notificationsBody: "Get storm, heavy-rain and heat alerts and care reminders on this phone or computer — even when the website is closed.",
    enablePush: "Turn on notifications on this device",
    enablingPush: "Turning on…",
    disablePush: "Turn off on this device",
    pushOn: "Notifications are on for this device.",
    pushBlocked: "Notifications are blocked in your browser. Allow them from the 🔒 icon in the address bar.",
    pushUnsupported: "This browser doesn't support push notifications. You'll still see everything under 🔔 on the website.",
    pushNotConfigured: "Push notifications are not set up on the server yet.",
    pushFailed: "Couldn't turn on notifications. Please try again.",
    iosHint: "On iPhone/iPad: in Safari tap Share → “Add to Home Screen”, open it from there, then turn this on.",
  },
  notifications: {
    title: "Notifications",
    open: (unread) => (unread === "0" ? "Notifications" : `Notifications, ${unread} new`),
    empty: "No notifications yet. Weather alerts and reminders will appear here.",
    markAll: "Mark all read",
    enableCta: "Get alerts on your phone",
    enableBody: "Receive storm and rain alerts even when the website is closed.",
    justNow: "just now",
  },
  landingWeather: {
    nav: "Weather",
    eyebrow: "Live weather",
    title: "Your rooftop's weather, in garden terms",
    subtitle: "Log in to get your area's weather, Bangladesh's six seasons and timely alerts — all in one place.",
    steps: [
      { title: "Share your location", desc: "Tap once for live location in your profile, or type your address." },
      { title: "Live forecast", desc: "See rain or sun animated on your dashboard, the season, and the last 7 days." },
      { title: "AI that knows the weather", desc: "Ask in chat and the AI factors in today's weather — like not watering before rain." },
      { title: "Timely notifications", desc: "Get a phone alert before storms, heavy rain or a heatwave." },
    ],
    demoPlace: "Mirpur, Dhaka",
    loginNote: "The weather feature is for logged-in gardeners.",
    cta: "See the weather where I live",
  },
};

export const weatherDictionaries = { bn, en };
