import type { Lang } from "@/lib/i18n/dictionary";

/**
 * Common Gardening Problems — a static, bilingual educational library. Deliberately independent
 * of the AI features: no model calls, no user data. Photos are real, freely licensed images from
 * Wikimedia Commons, stored in /public/problems and credited on each detail page.
 */
export type ProblemCategory = "health" | "water" | "pests" | "environment" | "space";
export type Severity = "low" | "medium" | "high";

export interface ProblemContent {
  title: string;
  summary: string;
  overview: string;
  signs: string[];
  causes: string[];
  prevention: string[];
  steps: { title: string; detail: string }[];
}

export interface GardenProblem {
  slug: string;
  category: ProblemCategory;
  severity: Severity;
  image: {
    src: string;
    width: number;
    height: number;
    alt: Record<Lang, string>;
    credit: { author: string; license: string; licenseUrl: string; sourceUrl: string };
  };
  related: string[];
  content: Record<Lang, ProblemContent>;
}

export const PROBLEMS: GardenProblem[] = [
  {
    slug: "yellow-leaves",
    category: "health",
    severity: "medium",
    image: {
      src: "/problems/yellow-leaves.jpg",
      width: 1050,
      height: 1400,
      alt: {
        bn: "বাগানে গোলাপ গাছের কচি পাতা হলুদ হয়ে গেছে, শিরাগুলো তুলনামূলক সবুজ — আয়রনের অভাবজনিত ক্লোরোসিস",
        en: "Young rose leaves in a garden turned pale yellow with greener veins — iron chlorosis",
      },
      credit: {
        author: "Natalka Ukraine",
        license: "CC BY 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Iron_chlorosis_on_young_rose_leaves_in_a_garden,_by_baby-bear.org.jpg",
      },
    },
    related: ["overwatering", "poor-drainage", "root-bound"],
    content: {
      bn: {
        title: "পাতা হলুদ হয়ে যাওয়া",
        summary: "পুষ্টির অভাব, অতিরিক্ত পানি বা কম আলো — হলুদ পাতা গাছের সবচেয়ে সাধারণ সতর্কসংকেত।",
        overview:
          "পাতার সবুজ রং আসে ক্লোরোফিল থেকে। শিকড় ঠিকমতো পানি ও পুষ্টি নিতে না পারলে, বা আলো কম পেলে গাছ ক্লোরোফিল কম তৈরি করে, ফলে পাতা হলুদ হয়। কোন পাতা আগে হলুদ হচ্ছে — পুরোনো নিচের পাতা নাকি নতুন কচি পাতা — তা দেখেই কারণ অনেকটা বোঝা যায়। নিচের দু-একটি পুরোনো পাতা মাঝে মাঝে হলুদ হয়ে ঝরে পড়া স্বাভাবিক।",
        signs: [
          "নিচের পুরোনো পাতা পুরোটা হলুদ — সাধারণত নাইট্রোজেনের অভাব",
          "কচি পাতা হলুদ কিন্তু শিরা সবুজ — আয়রন বা ম্যাগনেসিয়ামের অভাব",
          "হলুদ পাতা নরম ও ঝুলে পড়া, মাটি ভেজা — অতিরিক্ত পানি",
          "হলুদ পাতার সাথে বাদামি মচমচে কিনারা — পানির অভাব বা অতিরিক্ত সার",
        ],
        causes: [
          "মাটিতে নাইট্রোজেন, আয়রন বা ম্যাগনেসিয়ামের ঘাটতি",
          "অতিরিক্ত পানি দেওয়া বা টবে পানি জমে থাকা",
          "দীর্ঘদিন একই মাটিতে থাকায় পুষ্টি ফুরিয়ে যাওয়া",
          "পর্যাপ্ত রোদ না পাওয়া",
          "মাটির pH বেশি (ক্ষারীয়) হলে আয়রন শোষণ বাধাগ্রস্ত হওয়া",
        ],
        prevention: [
          "প্রতি ১৫–২০ দিনে পচা গোবর বা ভার্মিকম্পোস্ট দিন",
          "আঙুল দিয়ে ১ ইঞ্চি মাটি শুকনো লাগলে তবেই পানি দিন",
          "প্রতি ১–২ বছরে টবের মাটি বদলান বা উপরের মাটি নতুন করুন",
          "গাছের চাহিদা অনুযায়ী রোদযুক্ত জায়গায় টব রাখুন",
        ],
        steps: [
          { title: "কোন পাতা হলুদ দেখুন", detail: "পুরোনো নিচের পাতা হলুদ হলে নাইট্রোজেন, কচি পাতায় শিরা-সবুজ হলুদ হলে আয়রন/ম্যাগনেসিয়ামের অভাব ধরে নিন।" },
          { title: "মাটির আর্দ্রতা পরীক্ষা করুন", detail: "আঙুল ২ ইঞ্চি ঢুকিয়ে দেখুন। ভেজা ও দুর্গন্ধযুক্ত হলে পানি দেওয়া বন্ধ করে নিষ্কাশন ঠিক করুন।" },
          { title: "পুষ্টি যোগ করুন", detail: "নাইট্রোজেনের জন্য ভার্মিকম্পোস্ট বা সরিষার খৈল-পচা পানি (১:১০) দিন। ম্যাগনেসিয়ামের জন্য ১ লিটার পানিতে ১ চা-চামচ ইপসম লবণ মিশিয়ে মাসে একবার স্প্রে করুন।" },
          { title: "আলো ঠিক করুন", detail: "গাছ যদি দিনে ৪ ঘণ্টার কম রোদ পায়, ধীরে ধীরে (৩–৪ দিনে) বেশি আলোর দিকে সরান।" },
          { title: "নতুন পাতায় নজর রাখুন", detail: "হলুদ পাতা আবার সবুজ হয় না; ২–৩ সপ্তাহে নতুন পাতা সবুজ এলে বুঝবেন সমাধান কাজ করছে। পুরোপুরি হলুদ পাতা ছেঁটে ফেলুন।" },
        ],
      },
      en: {
        title: "Yellow leaves",
        summary: "Nutrient shortage, too much water or too little light — yellowing is a plant's most common warning sign.",
        overview:
          "Leaves are green because of chlorophyll. When roots can't take up water and nutrients properly, or light is too low, the plant makes less chlorophyll and leaves turn yellow. Which leaves yellow first — old lower leaves or new young ones — tells you a lot about the cause. An occasional old lower leaf yellowing and dropping is normal.",
        signs: [
          "Whole older, lower leaves turn yellow — usually nitrogen deficiency",
          "Young leaves yellow while the veins stay green — iron or magnesium deficiency",
          "Yellow, soft, drooping leaves in wet soil — overwatering",
          "Yellowing with brown crispy edges — underwatering or too much fertiliser",
        ],
        causes: [
          "Soil short of nitrogen, iron or magnesium",
          "Overwatering or water sitting in the pot",
          "Nutrients exhausted after a long time in the same soil",
          "Not enough sunlight",
          "High (alkaline) soil pH blocking iron uptake",
        ],
        prevention: [
          "Feed with well-rotted cow manure or vermicompost every 15–20 days",
          "Water only when the top inch of soil feels dry",
          "Refresh or replace potting soil every 1–2 years",
          "Place pots where they get the sun their species needs",
        ],
        steps: [
          { title: "Check which leaves are yellow", detail: "Old lower leaves point to nitrogen; young leaves with green veins point to iron or magnesium." },
          { title: "Test soil moisture", detail: "Push a finger 2 inches in. If it is wet and smells sour, stop watering and fix the drainage first." },
          { title: "Feed the plant", detail: "For nitrogen, add vermicompost or diluted fermented mustard-cake liquid (1:10). For magnesium, spray 1 teaspoon of Epsom salt per litre of water once a month." },
          { title: "Correct the light", detail: "If the plant gets under 4 hours of sun, move it gradually (over 3–4 days) to a brighter spot." },
          { title: "Watch the new growth", detail: "Yellow leaves won't turn green again; green new leaves within 2–3 weeks mean the fix is working. Trim fully yellow leaves." },
        ],
      },
    },
  },
  {
    slug: "overwatering",
    category: "water",
    severity: "high",
    image: {
      src: "/problems/overwatering.jpg",
      width: 711,
      height: 679,
      alt: {
        bn: "ভেজা মাটির টবে তুলসী জাতীয় চারা গোড়া পচে নেতিয়ে পড়েছে — অতিরিক্ত পানিতে পিথিয়াম ছত্রাকের আক্রমণ",
        en: "Basil seedlings collapsing in soggy potting soil from Pythium root and stem rot caused by excess water",
      },
      credit: {
        author: "Roswitha Ulrich, Pflanzenschutzdienst",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Basilikum_Pythium-1--Roswitha_Ulrich.jpg",
      },
    },
    related: ["poor-drainage", "yellow-leaves", "root-bound"],
    content: {
      bn: {
        title: "অতিরিক্ত পানি দেওয়া",
        summary: "ভালোবেসে বেশি পানি দেওয়াই টবের গাছ মরার এক নম্বর কারণ — শিকড় দম বন্ধ হয়ে পচে যায়।",
        overview:
          "শিকড়ের শ্বাস নিতে মাটির ফাঁকে বাতাস দরকার। সবসময় ভেজা মাটিতে সেই বাতাস থাকে না, ফলে শিকড় মরে যায় এবং পিথিয়াম বা ফাইটোফথোরার মতো ছত্রাক শিকড় ও গোড়া পচিয়ে দেয়। অদ্ভুত ব্যাপার হলো, শিকড় নষ্ট হলে গাছ পানি টানতে পারে না, তাই অতিরিক্ত পানিতে গাছ দেখতে পানির অভাবের মতোই নেতিয়ে পড়ে। বর্ষাকালে ছাদবাগানে এই সমস্যা সবচেয়ে বেশি।",
        signs: [
          "মাটি ভেজা থাকা সত্ত্বেও গাছ নেতিয়ে পড়ছে",
          "নিচের পাতা হলুদ ও নরম হয়ে ঝরে যাচ্ছে",
          "গোড়ার কাছে কাণ্ড কালো, নরম বা পচা",
          "মাটি থেকে টক বা পচা গন্ধ, উপরে শ্যাওলা বা সাদা ছত্রাক",
          "টবের চারপাশে ছোট কালো মাছি (ফাঙ্গাস ন্যাট) উড়ছে",
        ],
        causes: [
          "মাটি শুকানোর আগেই রুটিন মেনে প্রতিদিন পানি দেওয়া",
          "গাছের তুলনায় অনেক বড় টব — বেশি মাটি বেশি পানি ধরে রাখে",
          "কাদামাটি বা এঁটেল মাটি, যাতে বাতাস চলাচল কম",
          "নিচে থালায় পানি জমে থাকা",
          "বর্ষায় বৃষ্টির পানির সাথে বাড়তি পানি দেওয়া",
        ],
        prevention: [
          "পানি দেওয়ার আগে আঙুল বা কাঠি দিয়ে মাটি পরীক্ষা করুন",
          "মাটির মিশ্রণে কোকোপিট, বালু বা ইটের খোয়া মেশান",
          "গাছের শিকড়ের আকারের চেয়ে ২ ইঞ্চি বড় টব বেছে নিন",
          "বর্ষায় পানি দেওয়া কমান, বৃষ্টির পর থালা খালি করুন",
        ],
        steps: [
          { title: "পানি দেওয়া বন্ধ করুন", detail: "থালার জমা পানি ফেলে দিন এবং টব ছায়াযুক্ত, বাতাস চলাচলের জায়গায় রাখুন।" },
          { title: "শিকড় পরীক্ষা করুন", detail: "গাছটি আলতো করে টব থেকে বের করুন। সুস্থ শিকড় সাদা ও শক্ত; পচা শিকড় বাদামি-কালো, নরম ও দুর্গন্ধযুক্ত।" },
          { title: "পচা অংশ কেটে ফেলুন", detail: "জীবাণুমুক্ত কাঁচি দিয়ে সব পচা শিকড় ও কাণ্ড কেটে ফেলুন। কাটা জায়গায় দারুচিনি গুঁড়া বা ছত্রাকনাশক (যেমন ট্রাইকোডার্মা) লাগান।" },
          { title: "নতুন ঝুরঝুরে মাটিতে লাগান", detail: "পুরোনো ভেজা মাটি ফেলে দিন। মাটি, কোকোপিট ও কম্পোস্ট (২:১:১) মিশিয়ে নিষ্কাশন-ছিদ্রযুক্ত টবে লাগান।" },
          { title: "ধীরে ধীরে যত্নে ফেরান", detail: "প্রথম পানি অল্প দিন, তারপর উপরের মাটি শুকালে তবেই। ১ সপ্তাহ হালকা ছায়ায় রাখুন, সার দেবেন না।" },
        ],
      },
      en: {
        title: "Overwatering",
        summary: "Loving a plant with too much water is the number-one killer of potted plants — roots suffocate and rot.",
        overview:
          "Roots breathe through air pockets in the soil. Constantly wet soil has none, so roots die and fungi like Pythium and Phytophthora rot the roots and stem base. Ironically, damaged roots can't take up water, so an overwatered plant wilts just like a thirsty one. In Bangladesh, rooftop gardens suffer this most during the monsoon.",
        signs: [
          "The plant wilts even though the soil is wet",
          "Lower leaves turn yellow, soft and drop",
          "Stem base is dark, mushy or rotting",
          "Sour or rotten smell from the soil, algae or white mould on top",
          "Tiny black flies (fungus gnats) hovering around the pot",
        ],
        causes: [
          "Watering on a fixed daily schedule before the soil dries",
          "A pot far too large for the plant — extra soil holds extra water",
          "Heavy clay soil with little air space",
          "Water left standing in the saucer",
          "Watering on top of monsoon rain",
        ],
        prevention: [
          "Check the soil with a finger or stick before watering",
          "Mix cocopeat, sand or brick chips into the potting soil",
          "Choose a pot only about 2 inches wider than the root ball",
          "Water less in the monsoon and empty saucers after rain",
        ],
        steps: [
          { title: "Stop watering", detail: "Empty the saucer and move the pot to a bright, airy, shaded spot." },
          { title: "Inspect the roots", detail: "Gently slide the plant out. Healthy roots are white and firm; rotten roots are brown-black, mushy and smelly." },
          { title: "Cut away rot", detail: "With clean scissors, remove all rotten roots and stem tissue. Dust cuts with cinnamon powder or a fungicide such as Trichoderma." },
          { title: "Repot in fresh, airy mix", detail: "Discard the old wet soil. Use soil, cocopeat and compost (2:1:1) in a pot with drainage holes." },
          { title: "Ease back into care", detail: "Water lightly once, then only when the top soil is dry. Keep in light shade for a week and don't fertilise yet." },
        ],
      },
    },
  },
  {
    slug: "poor-drainage",
    category: "water",
    severity: "high",
    image: {
      src: "/problems/poor-drainage.jpg",
      width: 1400,
      height: 933,
      alt: {
        bn: "দুটি টবের তলা — নিষ্কাশনের ছিদ্র এবং মাটি আটকাতে ছিদ্রের ওপর জাল বসানো",
        en: "The undersides of two plant pots showing drainage holes, with mesh fitted over the holes to hold soil in",
      },
      credit: {
        author: "Ragesoss",
        license: "CC BY-SA 3.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Bonsai_pots_with_mesh_over_drainage_holes.jpg",
      },
    },
    related: ["overwatering", "rooftop-heat", "yellow-leaves"],
    content: {
      bn: {
        title: "দুর্বল পানি নিষ্কাশন",
        summary: "টবে বা ছাদে পানি বের হওয়ার পথ না থাকলে শিকড় পচে, মশা জন্মায়, ছাদের ক্ষতি হয়।",
        overview:
          "ভালো নিষ্কাশন মানে পানি দেওয়ার পর বাড়তি পানি কয়েক মিনিটের মধ্যে টবের তলা দিয়ে বেরিয়ে যাবে। ছিদ্রহীন টব, বন্ধ ছিদ্র বা ভারী মাটি থাকলে পানি তলায় জমে থাকে — যা অতিরিক্ত পানির মতোই শিকড় পচায়। ছাদবাগানে ছাদের ঢালু ও ড্রেন ঠিক না থাকলে জমা পানি ছাদে ড্যাম্প ও চুইয়ে পড়ার সমস্যা তৈরি করে, আর জমা পানিতে এডিস মশা জন্মায়।",
        signs: [
          "পানি দেওয়ার পর অনেকক্ষণ মাটির উপরে পানি জমে থাকে",
          "টবের তলা দিয়ে পানি বের হয় না",
          "মাটি শক্ত চাক বেঁধে যায়, উপরে শ্যাওলা",
          "টবের নিচে বা ছাদে স্থায়ী ভেজা দাগ, ড্যাম্প",
          "জমা পানিতে মশার লার্ভা",
        ],
        causes: [
          "ছিদ্রহীন টব বা সাজানোর পাত্র",
          "ছিদ্র মাটি বা শিকড়ে বন্ধ হয়ে যাওয়া",
          "টব সরাসরি ছাদের মেঝেতে বসানো, পানি বেরোতে পারে না",
          "শুধু এঁটেল বা বাগানের মাটি ব্যবহার",
          "ছাদের ড্রেন আবর্জনা বা পাতায় বন্ধ",
        ],
        prevention: [
          "প্রতিটি টবে অন্তত একটি বড় বা কয়েকটি ছোট ছিদ্র রাখুন",
          "ছিদ্রের ওপর জাল বা ভাঙা টবের টুকরো দিন যাতে মাটি না আটকায়",
          "টব ইট বা স্ট্যান্ডের ওপর রাখুন, মেঝে থেকে একটু উঁচুতে",
          "বর্ষার আগে ছাদের ড্রেন পরিষ্কার করুন",
        ],
        steps: [
          { title: "ছিদ্র পরীক্ষা করুন", detail: "টব উঁচু করে দেখুন ছিদ্র আছে কিনা এবং খোলা কিনা। প্লাস্টিকের টবে গরম লোহার শিক বা ড্রিল দিয়ে ৩–৪টি ছিদ্র করা যায়।" },
          { title: "নিষ্কাশন স্তর দিন", detail: "ছিদ্রের ওপর জাল বা খোলামকুচি রাখুন, তার ওপর ১ ইঞ্চি ইটের খোয়া বা নুড়ি দিন।" },
          { title: "মাটির মিশ্রণ হালকা করুন", detail: "মাটি ৪০%, কোকোপিট ২০%, কম্পোস্ট ৩০%, বালু বা পার্লাইট ১০% — এমন মিশ্রণে পানি সহজে বের হয়।" },
          { title: "টব উঁচু করুন", detail: "প্রতিটি টব দুটি ইট বা প্লাস্টিকের পায়ার ওপর বসান যাতে নিচে বাতাস ও পানি চলাচল করে।" },
          { title: "ছাদের পানি সরানোর পথ ঠিক করুন", detail: "ড্রেনের মুখে জাল দিন ও নিয়মিত পরিষ্কার করুন। স্থায়ী বেড করলে নিচে ওয়াটারপ্রুফিং ও নিষ্কাশন স্তর রাখুন।" },
        ],
      },
      en: {
        title: "Poor drainage",
        summary: "When water can't escape a pot or roof, roots rot, mosquitoes breed and the roof can be damaged.",
        overview:
          "Good drainage means excess water runs out of the bottom of the pot within minutes of watering. Pots without holes, blocked holes or heavy soil keep water pooled at the bottom, which rots roots just like overwatering. On rooftops, poor slope and blocked drains also cause damp and leaks in the ceiling below, and standing water breeds Aedes mosquitoes.",
        signs: [
          "Water sits on the soil surface long after watering",
          "No water comes out of the bottom of the pot",
          "Soil packs into a hard crust, with algae on top",
          "Permanent wet patches or damp under pots or on the roof",
          "Mosquito larvae in standing water",
        ],
        causes: [
          "Pots or decorative containers with no holes",
          "Holes blocked by soil or roots",
          "Pots sitting flat on the roof so water can't escape",
          "Using only heavy clay or garden soil",
          "Roof drains clogged with leaves and debris",
        ],
        prevention: [
          "Give every pot one large or several small drainage holes",
          "Cover holes with mesh or a pottery shard so soil doesn't block them",
          "Raise pots on bricks or stands, slightly off the floor",
          "Clear roof drains before the monsoon",
        ],
        steps: [
          { title: "Check the holes", detail: "Lift the pot and confirm it has open holes. You can make 3–4 holes in plastic pots with a heated metal rod or a drill." },
          { title: "Add a drainage layer", detail: "Put mesh or broken pottery over the holes, then about 1 inch of brick chips or gravel." },
          { title: "Lighten the soil mix", detail: "Use roughly 40% soil, 20% cocopeat, 30% compost and 10% sand or perlite so water drains freely." },
          { title: "Raise the pots", detail: "Set each pot on two bricks or plastic feet so air and water can move underneath." },
          { title: "Fix the roof's runoff", detail: "Fit mesh over drain mouths and clear them regularly. For permanent beds, include waterproofing and a drainage layer underneath." },
        ],
      },
    },
  },
  {
    slug: "pest-attack",
    category: "pests",
    severity: "high",
    image: {
      src: "/problems/pest-attack.jpg",
      width: 1400,
      height: 788,
      alt: {
        bn: "সবুজ পাতার শিরা বরাবর জাবপোকার (এফিড) দল, পাশে শিকারি পোকা",
        en: "A cluster of aphids feeding along the vein of a green leaf, with predatory insects nearby",
      },
      credit: {
        author: "ISAAC THE BOY",
        license: "CC BY 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Aphids_on_a_leaf,_2025_early_summertime_Alconbury_Weald.jpg",
      },
    },
    related: ["yellow-leaves", "small-spaces", "limited-sunlight"],
    content: {
      bn: {
        title: "পোকামাকড়ের আক্রমণ",
        summary: "জাবপোকা, সাদা মাছি, মিলিবাগ ও মাকড় — কচি পাতার রস চুষে গাছ দুর্বল করে, দ্রুত ছড়ায়।",
        overview:
          "ছাদ ও বারান্দার বাগানে সবচেয়ে বেশি দেখা যায় রস-চোষা পোকা: জাবপোকা (এফিড), সাদা মাছি, মিলিবাগ ও লাল মাকড় (স্পাইডার মাইট)। এরা কচি ডগা ও পাতার নিচে দলবেঁধে থাকে, পাতা কুঁকড়ে দেয় এবং আঠালো মধুরস ছাড়ে, যাতে কালো ঝুল ছত্রাক জন্মায়। গরম ও শুকনো আবহাওয়ায় এবং অতিরিক্ত নাইট্রোজেন সারে নরম ডগা হলে আক্রমণ বাড়ে। শুরুতেই ধরতে পারলে জৈব পদ্ধতিতেই নিয়ন্ত্রণ সম্ভব।",
        signs: [
          "পাতার নিচে বা কচি ডগায় ছোট সবুজ, কালো বা সাদা পোকার দল",
          "পাতা কুঁকড়ে যাওয়া, বিকৃত নতুন পাতা",
          "পাতায় আঠালো ভাব ও কালো ঝুলের মতো আবরণ",
          "গাছে পিঁপড়ার আনাগোনা (তারা মধুরস খায়)",
          "পাতায় সূক্ষ্ম জাল ও হলদে ছিট ছিট দাগ — মাকড়",
        ],
        causes: [
          "নার্সারি থেকে আনা আক্রান্ত নতুন চারা",
          "গরম, শুকনো ও বাতাস চলাচলহীন জায়গা",
          "অতিরিক্ত ইউরিয়া বা নাইট্রোজেন সারে নরম ডগা",
          "গাছ ঘন করে রাখা, নিয়মিত পরিদর্শন না করা",
          "উপকারী পোকা (লেডিবার্ড) রাসায়নিকে মারা যাওয়া",
        ],
        prevention: [
          "নতুন গাছ ১–২ সপ্তাহ আলাদা রেখে পরীক্ষা করুন",
          "সপ্তাহে একবার পাতার নিচ দেখুন",
          "১৫ দিন পরপর নিম তেল স্প্রে করুন",
          "গাঁদা, তুলসী, পুদিনার মতো পোকা-তাড়ানো গাছ পাশে লাগান",
          "হলুদ আঠালো ফাঁদ ঝুলিয়ে রাখুন",
        ],
        steps: [
          { title: "পোকা চিহ্নিত করুন", detail: "পাতার নিচ ও কচি ডগা ভালো করে দেখুন। ছবি তুলে ছাদকৃষির ছবি বিশ্লেষণে দিলে পোকা শনাক্ত করতে সাহায্য পাবেন।" },
          { title: "আক্রান্ত অংশ সরান", detail: "বেশি আক্রান্ত পাতা ও ডগা কেটে পলিথিনে ভরে ফেলে দিন। গাছটি অন্য গাছ থেকে আলাদা করুন।" },
          { title: "পানির ঝাপটা দিন", detail: "জোরে পানি স্প্রে করে জাবপোকা ও মাকড় ধুয়ে ফেলুন। মিলিবাগ তুলায় স্পিরিট লাগিয়ে মুছে তুলুন।" },
          { title: "জৈব স্প্রে করুন", detail: "১ লিটার পানিতে ৫ মিলি নিম তেল ও ২–৩ ফোঁটা তরল সাবান মিশিয়ে বিকেলে পাতার দুই পিঠে স্প্রে করুন। ৫–৭ দিন পরপর ৩ বার দিন।" },
          { title: "ফিরে আসা ঠেকান", detail: "সপ্তাহে একবার পরিদর্শন চালিয়ে যান, হলুদ আঠালো ফাঁদ দিন, এবং নাইট্রোজেন সার কমিয়ে সুষম সার দিন। ব্যাপক আক্রমণে কৃষি অফিসের পরামর্শ নিন।" },
        ],
      },
      en: {
        title: "Pest attack",
        summary: "Aphids, whiteflies, mealybugs and mites suck sap from young growth, weaken plants and spread fast.",
        overview:
          "Rooftop and balcony gardens are most often hit by sap-sucking pests: aphids, whiteflies, mealybugs and red spider mites. They gather on tender tips and leaf undersides, curl leaves and excrete sticky honeydew on which black sooty mould grows. Attacks increase in hot, dry weather and when heavy nitrogen feeding produces soft growth. Caught early, they can be controlled organically.",
        signs: [
          "Clusters of tiny green, black or white insects under leaves or on tips",
          "Curled leaves and distorted new growth",
          "Sticky leaves with a black, sooty coating",
          "Ants running up and down the plant (they farm honeydew)",
          "Fine webbing and pale speckling on leaves — mites",
        ],
        causes: [
          "Infested new plants brought home from a nursery",
          "Hot, dry, still air",
          "Soft growth from too much urea or nitrogen fertiliser",
          "Crowded plants that are rarely inspected",
          "Beneficial insects such as ladybirds killed by chemical sprays",
        ],
        prevention: [
          "Quarantine new plants for 1–2 weeks",
          "Check leaf undersides once a week",
          "Spray neem oil every 15 days as a routine",
          "Grow pest-repelling marigold, basil and mint nearby",
          "Hang yellow sticky traps",
        ],
        steps: [
          { title: "Identify the pest", detail: "Look closely under leaves and at new tips. A photo in ChhadKrishi's photo analysis can help identify it." },
          { title: "Remove the worst parts", detail: "Cut heavily infested leaves and tips, bag them and bin them. Move the plant away from others." },
          { title: "Blast with water", detail: "A strong water spray knocks off aphids and mites. Wipe mealybugs off with cotton dipped in rubbing alcohol." },
          { title: "Spray organically", detail: "Mix 5 ml neem oil and 2–3 drops of liquid soap in 1 litre of water; spray both sides of leaves in the late afternoon. Repeat 3 times, 5–7 days apart." },
          { title: "Stop it coming back", detail: "Keep weekly checks, use yellow sticky traps and switch to balanced feeding with less nitrogen. For severe outbreaks, ask your local agriculture office." },
        ],
      },
    },
  },
  {
    slug: "limited-sunlight",
    category: "environment",
    severity: "medium",
    image: {
      src: "/problems/limited-sunlight.jpg",
      width: 1400,
      height: 1050,
      alt: {
        bn: "অন্ধকারে গজানো চারা — লম্বা, সরু, ফ্যাকাশে হলুদ ডাঁটা ও ছোট পাতা (ইটিওলেশন)",
        en: "Seedlings sprouted in darkness — long, thin, pale yellow stems with tiny leaves (etiolation)",
      },
      credit: {
        author: "சஞ்சீவி சிவகுமார்",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Etiolation_of_plants.JPG",
      },
    },
    related: ["small-spaces", "yellow-leaves", "pest-attack"],
    content: {
      bn: {
        title: "পর্যাপ্ত রোদ না পাওয়া",
        summary: "আলোর খোঁজে গাছ লম্বা, সরু ও ফ্যাকাশে হয়ে যায়, ফুল-ফল ধরে না।",
        overview:
          "বেশিরভাগ ফল ও সবজি গাছের দিনে অন্তত ৬ ঘণ্টা সরাসরি রোদ দরকার। শহরের বারান্দা বা পাশের উঁচু দালানের ছায়ায় অনেক জায়গা ৩–৪ ঘণ্টার বেশি রোদ পায় না। তখন গাছ আলোর দিকে হেলে লম্বা ও দুর্বল হয় (একে ইটিওলেশন বলে), পাতা ছোট ও ফ্যাকাশে হয়, ফুল ঝরে যায়। সমাধান হলো জায়গা অনুযায়ী সঠিক গাছ বাছাই এবং পাওয়া আলোর সর্বোচ্চ ব্যবহার।",
        signs: [
          "কাণ্ড লম্বা ও সরু, দুই পাতার মাঝে অনেক ফাঁক",
          "পুরো গাছ একদিকে আলোর দিকে হেলে আছে",
          "পাতা ছোট, ফ্যাকাশে সবুজ বা হলদেটে",
          "ফুল আসে না বা কুঁড়ি ঝরে যায়, ফল ধরে না",
          "মাটি দীর্ঘক্ষণ ভেজা থাকে, ছত্রাক হয়",
        ],
        causes: [
          "উত্তরমুখী বা ঢাকা বারান্দা",
          "পাশের উঁচু ভবন, গাছ বা পানির ট্যাংকের ছায়া",
          "রোদপ্রিয় গাছ (টমেটো, মরিচ, গোলাপ) ছায়ায় লাগানো",
          "চারা ঘন করে লাগানো, একে অপরকে ঢেকে ফেলা",
        ],
        prevention: [
          "সারাদিন খেয়াল করে লিখে রাখুন কোথায় কত ঘণ্টা রোদ পড়ে",
          "ছায়া-সহিষ্ণু গাছ বেছে নিন: পুদিনা, ধনেপাতা, লেটুস, মানিপ্লান্ট, স্নেক প্লান্ট",
          "সবচেয়ে রোদের জায়গা ফল-সবজির জন্য রাখুন",
          "চারার মাঝে যথেষ্ট দূরত্ব রাখুন",
        ],
        steps: [
          { title: "রোদের ম্যাপ করুন", detail: "সকাল ৯টা, দুপুর ১২টা ও বিকেল ৩টায় ছবি তুলে দেখুন কোন জায়গায় কতক্ষণ সরাসরি রোদ থাকে।" },
          { title: "গাছ সঠিক জায়গায় সরান", detail: "রোদপ্রিয় গাছ সবচেয়ে উজ্জ্বল জায়গায়, পাতাবাহার ও শাক ছায়ার দিকে রাখুন। ঝুলন্ত বা উঁচু স্ট্যান্ড ব্যবহার করে গাছকে আলোর কাছে তুলুন।" },
          { title: "আলো প্রতিফলিত করুন", detail: "দেয়াল সাদা রং করুন বা গাছের পেছনে সাদা বোর্ড/অ্যালুমিনিয়াম ফয়েল দিন — এতে ছায়ার দিকেও আলো বাড়ে।" },
          { title: "নিয়মিত টব ঘোরান", detail: "প্রতি ৩–৪ দিনে টব এক-চতুর্থাংশ ঘুরিয়ে দিন যাতে গাছ সোজা ও সমানভাবে বাড়ে।" },
          { title: "দরকারে গ্রো লাইট", detail: "ঘরের ভেতর বা খুব অন্ধকার বারান্দায় ১৫–২০ ওয়াটের LED গ্রো লাইট গাছ থেকে ১ ফুট উপরে দিনে ১০–১২ ঘণ্টা জ্বালান।" },
        ],
      },
      en: {
        title: "Limited sunlight",
        summary: "Searching for light, plants grow tall, thin and pale — and won't flower or fruit.",
        overview:
          "Most fruiting plants and vegetables need at least 6 hours of direct sun a day. City balconies, or spaces shaded by neighbouring buildings, often get only 3–4. Plants then lean and stretch towards the light (etiolation), leaves turn small and pale, and flowers drop. The fix is choosing plants that match the light and making the most of the light you have.",
        signs: [
          "Long, thin stems with big gaps between leaves",
          "The whole plant leans in one direction",
          "Small, pale green or yellowish leaves",
          "No flowers, buds dropping, no fruit",
          "Soil stays wet for long and grows mould",
        ],
        causes: [
          "North-facing or covered balconies",
          "Shade from tall buildings, trees or water tanks",
          "Sun-lovers (tomato, chilli, rose) planted in shade",
          "Seedlings crowded so they shade each other",
        ],
        prevention: [
          "Track and note how many hours of sun each spot gets",
          "Choose shade-tolerant plants: mint, coriander, lettuce, money plant, snake plant",
          "Reserve the sunniest spots for fruit and vegetables",
          "Space seedlings properly",
        ],
        steps: [
          { title: "Map your sunlight", detail: "Take photos at 9 am, noon and 3 pm to see how long each spot gets direct sun." },
          { title: "Move plants to the right spot", detail: "Put sun-lovers in the brightest spot and foliage plants and leafy greens toward the shade. Use hanging planters or tall stands to lift plants into the light." },
          { title: "Reflect light", detail: "Paint walls white or place a white board or aluminium foil behind plants to bounce light into shaded corners." },
          { title: "Rotate pots", detail: "Turn each pot a quarter-turn every 3–4 days so plants grow straight and even." },
          { title: "Add a grow light if needed", detail: "Indoors or on very dark balconies, run a 15–20 W LED grow light about 1 foot above plants for 10–12 hours a day." },
        ],
      },
    },
  },
  {
    slug: "rooftop-heat",
    category: "environment",
    severity: "high",
    image: {
      src: "/problems/rooftop-heat.jpg",
      width: 1400,
      height: 1050,
      alt: {
        bn: "তীব্র রোদ ও গরমে কলাপাতার কিনারা বাদামি হয়ে শুকিয়ে ঝুলে পড়েছে, পেছনে দালান",
        en: "A banana leaf scorched brown and drooping at the edges in strong sun and heat, with buildings behind",
      },
      credit: {
        author: "ChimaBee",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Wilting_Banana_Leaf.jpg",
      },
    },
    related: ["poor-drainage", "limited-sunlight", "small-spaces"],
    content: {
      bn: {
        title: "ছাদের অতিরিক্ত গরম",
        summary: "গ্রীষ্মে কংক্রিটের ছাদ ৫০°সে ছাড়িয়ে যায় — টবের মাটি গরম হয়ে শিকড় পোড়ে, পাতা ঝলসে যায়।",
        overview:
          "বাংলাদেশে এপ্রিল-জুনে ছাদের কংক্রিট সারাদিন রোদ শুষে রাতেও তাপ ছাড়ে। কালো প্লাস্টিকের টব আরও গরম হয়, ফলে মাটির তাপমাত্রা এত বাড়ে যে সূক্ষ্ম শিকড় মরে যায়। গাছ দুপুরে নেতিয়ে পড়ে, পাতার কিনারা বাদামি হয়ে ঝলসে যায়, ফুল-ফল ঝরে। ছায়া, মালচিং ও সঠিক সময়ে পানি দিয়ে এই ক্ষতি অনেকটাই ঠেকানো যায়।",
        signs: [
          "দুপুরে গাছ নেতিয়ে পড়ে, সন্ধ্যায় আবার কিছুটা সোজা হয়",
          "পাতার কিনারা ও ডগা বাদামি, মচমচে",
          "রোদের দিকের পাতায় সাদা বা বাদামি পোড়া দাগ",
          "ফুল ও কচি ফল ঝরে যাওয়া",
          "মাটি সকালে পানি দিলেও দুপুরের আগেই শুকিয়ে যায়",
        ],
        causes: [
          "সরাসরি কংক্রিটের মেঝেতে রাখা টব",
          "কালো বা পাতলা প্লাস্টিকের টব",
          "দুপুরের রোদে পানি দেওয়া বা অনিয়মিত পানি",
          "মাটির ওপর কোনো আবরণ (মালচ) না থাকা",
          "চারপাশে বাতাস আটকানো বা গরম বাতাস প্রবাহ",
        ],
        prevention: [
          "গ্রীষ্মে ৩০–৫০% শেড নেট টানিয়ে দিন",
          "মাটির টব বা হালকা রঙের টব ব্যবহার করুন",
          "টব ইট বা কাঠের তক্তার ওপর বসান",
          "মাটির ওপর ২ ইঞ্চি খড়, শুকনো পাতা বা নারকেলের ছোবড়ার মালচ দিন",
          "তাপ-সহিষ্ণু গাছ বেছে নিন: বোগেনভিলিয়া, নয়নতারা, পর্তুলাকা, ঢেঁড়স, পুঁইশাক",
        ],
        steps: [
          { title: "এখনই ছায়া দিন", detail: "দুপুর ১১টা থেকে বিকেল ৩টা পর্যন্ত শেড নেট, পুরোনো শাড়ি বা চাটাই দিয়ে আক্রান্ত গাছ ঢেকে দিন।" },
          { title: "ঠিক সময়ে পানি দিন", detail: "ভোরে গভীরভাবে পানি দিন যাতে টবের তলা দিয়ে বের হয়; খুব গরমের দিনে বিকেলে আবার। দুপুরের তপ্ত রোদে পাতায় পানি দেবেন না।" },
          { title: "মালচ বিছান", detail: "মাটির ওপর ২ ইঞ্চি খড় বা নারকেলের ছোবড়া দিন — এতে মাটির তাপমাত্রা অনেক কমে ও পানি কম শুকায়।" },
          { title: "টব ঠান্ডা রাখুন", detail: "টব মেঝে থেকে উঁচু করুন, কালো টব সাদা রং করুন বা চটের বস্তায় মুড়ে দিন। ছোট টবগুলো একসাথে গুচ্ছ করে রাখুন যাতে একে অপরকে ছায়া দেয়।" },
          { title: "পোড়া অংশ ছাঁটুন ও যত্ন নিন", detail: "পুরোপুরি পোড়া পাতা ছেঁটে ফেলুন। গরমের সময় রাসায়নিক সার দেবেন না; ঠান্ডা পড়লে হালকা জৈব সার দিন।" },
        ],
      },
      en: {
        title: "Rooftop heat",
        summary: "In summer, concrete roofs pass 50 °C — potting soil overheats, roots cook and leaves scorch.",
        overview:
          "From April to June in Bangladesh, rooftop concrete soaks up sun all day and radiates heat well into the night. Black plastic pots get hotter still, pushing soil temperatures high enough to kill fine roots. Plants wilt at midday, leaf edges brown and scorch, and flowers and young fruit drop. Shade, mulch and well-timed watering prevent most of the damage.",
        signs: [
          "Plants wilt at midday and partly recover by evening",
          "Brown, crispy leaf edges and tips",
          "White or brown burnt patches on sun-facing leaves",
          "Flowers and young fruit dropping",
          "Soil watered in the morning is dry before noon",
        ],
        causes: [
          "Pots placed directly on bare concrete",
          "Black or thin plastic pots",
          "Watering at midday or irregularly",
          "Bare soil with no mulch",
          "Trapped hot air or hot, drying winds",
        ],
        prevention: [
          "Stretch a 30–50% shade net over the garden in summer",
          "Use clay or light-coloured pots",
          "Raise pots on bricks or wooden planks",
          "Mulch the soil with 2 inches of straw, dry leaves or coconut coir",
          "Choose heat-tolerant plants: bougainvillea, periwinkle, portulaca, okra, Malabar spinach",
        ],
        steps: [
          { title: "Give shade right away", detail: "Cover stressed plants from 11 am to 3 pm with shade net, an old sari or a bamboo mat." },
          { title: "Water at the right time", detail: "Water deeply at dawn until it drains out of the bottom; on very hot days water again in the late afternoon. Don't splash leaves in the midday sun." },
          { title: "Mulch the soil", detail: "A 2-inch layer of straw or coconut coir cuts soil temperature sharply and slows drying." },
          { title: "Keep pots cool", detail: "Lift pots off the floor, paint black pots white or wrap them in jute sacking. Group small pots so they shade each other." },
          { title: "Trim and recover", detail: "Remove fully scorched leaves. Don't apply chemical fertiliser during heat stress; feed lightly with organic fertiliser once it cools." },
        ],
      },
    },
  },
  {
    slug: "small-spaces",
    category: "space",
    severity: "low",
    image: {
      src: "/problems/small-spaces.jpg",
      width: 1400,
      height: 1323,
      alt: {
        bn: "শহরের একটি ছোট বারান্দা — রেলিং, দেয়াল ও তাকে সাজানো অনেক টবের গাছ",
        en: "A small city balcony packed with potted plants on the railing, walls and shelves",
      },
      credit: {
        author: "FreCha",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Balcon_et_plantes_en_pot.jpg",
      },
    },
    related: ["limited-sunlight", "root-bound", "rooftop-heat"],
    content: {
      bn: {
        title: "ছোট জায়গায় বাগান",
        summary: "সরু বারান্দা বা জানালার পাশেও ভালো বাগান সম্ভব — শুধু উপরের দিকে ভাবতে হবে।",
        overview:
          "শহরের বেশিরভাগ মানুষের বাগানের জন্য আছে ছোট একটি বারান্দা বা জানালার কার্নিশ। সমস্যা হলো জায়গার অভাবে টব গাদাগাদি হয়, হাঁটাচলা কঠিন হয়, ভারী টব রেলিংয়ে ঝুঁকি তৈরি করে, পানি নিচের ফ্ল্যাটে পড়ে। ঠিক পরিকল্পনায় দেয়াল, রেলিং ও উচ্চতা কাজে লাগিয়ে অল্প জায়গাতেই অনেক গাছ রাখা যায়।",
        signs: [
          "টব এত ঘন যে চলাফেরা বা পানি দেওয়া কঠিন",
          "গাছগুলো একে অপরকে ঢেকে ফেলছে",
          "নিচের ফ্ল্যাটে বা রাস্তায় পানি চুইয়ে পড়ছে",
          "রেলিংয়ে ঝোলানো ভারী টব নড়বড়ে",
          "প্রতিবেশীর অভিযোগ বা মেঝেতে স্থায়ী দাগ",
        ],
        causes: [
          "শুধু মেঝে ব্যবহার, দেয়াল ও উচ্চতা অব্যবহৃত",
          "জায়গার তুলনায় বড় আকারের গাছ বাছাই",
          "পরিকল্পনা ছাড়া একের পর এক টব কেনা",
          "নিচে থালা বা ট্রে না রাখা",
        ],
        prevention: [
          "কেনার আগে জায়গা মেপে নিন ও কোথায় কী বসবে আঁকুন",
          "বামন বা কমপ্যাক্ট জাত বেছে নিন: চেরি টমেটো, বামন মরিচ, লেটুস, ভেষজ",
          "প্রতিটি টবের নিচে থালা দিন",
          "হাঁটার জন্য অন্তত ২ ফুট পথ খালি রাখুন",
        ],
        steps: [
          { title: "মেপে পরিকল্পনা করুন", detail: "দৈর্ঘ্য-প্রস্থ মাপুন, কোথায় কতক্ষণ রোদ পড়ে লিখুন। চাইলে ছাদকৃষির এআই গার্ডেন ডিজাইনারে ছবি দিয়ে পরিকল্পনা নিন।" },
          { title: "উপরের দিকে বাড়ান", detail: "দেয়ালে তাক বা ভার্টিকাল প্ল্যান্টার, রেলিংয়ে শক্ত হুকে রেলিং-প্ল্যান্টার, ছাদ থেকে ঝুলন্ত টব ব্যবহার করুন। লতানো গাছ (পুঁই, শিম) মাচায় তুলুন।" },
          { title: "হালকা টব ব্যবহার করুন", detail: "রেলিং ও ঝুলন্ত জায়গায় প্লাস্টিক বা গ্রো-ব্যাগ ব্যবহার করুন; ভারী মাটির টব মেঝেতে দেয়ালের পাশে রাখুন।" },
          { title: "স্তরে স্তরে সাজান", detail: "পেছনে লম্বা গাছ, মাঝে মাঝারি, সামনে ছোট — যাতে সবাই আলো পায়। ধাপযুক্ত স্ট্যান্ড খুব কাজে দেয়।" },
          { title: "পানি নিয়ন্ত্রণ করুন", detail: "প্রতি টবের নিচে থালা দিন, সকালে পানি দিন, এবং ছোট বোতল-ড্রিপ বা সেলফ-ওয়াটারিং টব ব্যবহার করুন যাতে পানি নিচে না পড়ে।" },
        ],
      },
      en: {
        title: "Gardening in small spaces",
        summary: "A narrow balcony or a windowsill can still hold a great garden — you just have to think vertically.",
        overview:
          "Most city dwellers have only a small balcony or a window ledge to garden on. Without a plan, pots crowd the floor, walking and watering get awkward, heavy pots on railings become a hazard and water drips onto the flat below. Using walls, railings and height well lets a small space hold many plants.",
        signs: [
          "Pots so crowded that moving or watering is hard",
          "Plants shading each other out",
          "Water dripping onto the flat below or the street",
          "Heavy railing pots that wobble",
          "Complaints from neighbours or permanent floor stains",
        ],
        causes: [
          "Using only the floor, leaving walls and height unused",
          "Choosing plants too big for the space",
          "Buying pots one at a time with no plan",
          "No saucers or trays under pots",
        ],
        prevention: [
          "Measure the space and sketch what goes where before buying",
          "Choose dwarf or compact varieties: cherry tomato, dwarf chilli, lettuce, herbs",
          "Put a saucer under every pot",
          "Keep at least a 2-foot path clear",
        ],
        steps: [
          { title: "Measure and plan", detail: "Measure length and width and note how long each spot gets sun. You can also upload a photo to ChhadKrishi's AI Garden Designer for a plan." },
          { title: "Grow upwards", detail: "Use wall shelves or vertical planters, railing planters on strong hooks and hanging pots. Train climbers (Malabar spinach, beans) up a trellis." },
          { title: "Use light containers", detail: "Use plastic pots or grow bags on railings and hangers; keep heavy clay pots on the floor against the wall." },
          { title: "Arrange in tiers", detail: "Tall plants at the back, medium in the middle, small in front so all get light. Step stands work well." },
          { title: "Control the water", detail: "Saucers under every pot, water in the morning, and use bottle drips or self-watering pots so nothing drips below." },
        ],
      },
    },
  },
  {
    slug: "root-bound",
    category: "health",
    severity: "medium",
    image: {
      src: "/problems/root-bound.jpg",
      width: 1037,
      height: 1400,
      alt: {
        bn: "টব থেকে বের করা গাছের শিকড় — টবের আকারে ঘন জট পাকিয়ে চারপাশে ঘুরছে",
        en: "A plant lifted out of its pot with a dense mass of roots circling in the shape of the pot",
      },
      credit: {
        author: "Keith Williamson",
        license: "CC BY 2.0",
        licenseUrl: "https://creativecommons.org/licenses/by/2.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Root-bound_Chlorophytum_comosum.jpg",
      },
    },
    related: ["yellow-leaves", "overwatering", "small-spaces"],
    content: {
      bn: {
        title: "টবে শিকড় জট বাঁধা",
        summary: "টব ছোট হয়ে গেলে শিকড় ঘুরে ঘুরে জট পাকায় — গাছ পানি ও পুষ্টি পায় না, বাড়া থেমে যায়।",
        overview:
          "টবের গাছ বড় হলে শিকড় টবের দেয়ালে ধাক্কা খেয়ে চারদিকে ঘুরতে থাকে। একসময় মাটির চেয়ে শিকড়ই বেশি হয়ে যায় — পানি দিলে দ্রুত বেরিয়ে যায়, মাটি ধরে রাখতে পারে না, পুষ্টিও ফুরিয়ে যায়। ফলগাছ ও দ্রুত বাড়ে এমন গাছে প্রতি ১–২ বছরে এমন হয়।",
        signs: [
          "টবের তলার ছিদ্র দিয়ে শিকড় বেরিয়ে আসছে",
          "পানি দিলেই সাথে সাথে বেরিয়ে যায়, মাটি দ্রুত শুকায়",
          "নিয়মিত যত্নেও বাড়া থেমে গেছে, পাতা ছোট",
          "মাটির ওপরেও শিকড় দেখা যায়",
          "প্লাস্টিকের টব ফুলে বা ফেটে গেছে",
        ],
        causes: [
          "দীর্ঘদিন রিপট না করা",
          "শুরু থেকেই খুব ছোট টবে বড় হওয়া গাছ লাগানো",
          "নার্সারির পলিব্যাগেই গাছ রেখে দেওয়া",
        ],
        prevention: [
          "প্রতি বছর বর্ষার শুরুতে বা শীতের শেষে শিকড় পরীক্ষা করুন",
          "গাছের প্রত্যাশিত আকার অনুযায়ী টব বাছুন",
          "নার্সারি থেকে আনার ২–৩ সপ্তাহের মধ্যে পলিব্যাগ থেকে টবে নিন",
        ],
        steps: [
          { title: "আগের দিন পানি দিন", detail: "রিপটের আগের দিন ভালো করে পানি দিলে শিকড়সহ মাটি সহজে বের হয় ও কম ক্ষতি হয়।" },
          { title: "সাবধানে বের করুন", detail: "টব কাত করে কিনারায় আলতো চাপ দিন। খুব শক্ত হলে প্লাস্টিকের টব কেটে ফেলুন, টান দেবেন না।" },
          { title: "শিকড়ের জট খুলুন", detail: "আঙুল দিয়ে ঘোরানো শিকড় আলগা করুন। খুব ঘন হলে ছুরি দিয়ে চারপাশে ৩–৪টি হালকা লম্বা চির দিন এবং মরা শিকড় কেটে ফেলুন।" },
          { title: "এক সাইজ বড় টবে লাগান", detail: "আগের চেয়ে ২–৪ ইঞ্চি বড় টবে নিষ্কাশন স্তর ও নতুন মাটির মিশ্রণে আগের গভীরতায় লাগান।" },
          { title: "পরে যত্ন", detail: "ভালো করে পানি দিন, ৫–৭ দিন হালকা ছায়ায় রাখুন, ২–৩ সপ্তাহ সার দেবেন না।" },
        ],
      },
      en: {
        title: "Root-bound plants",
        summary: "When a pot gets too small, roots circle and tangle — the plant can't get water or food, and growth stalls.",
        overview:
          "As a potted plant grows, its roots hit the pot wall and start circling. Eventually there are more roots than soil: water runs straight through, the soil can't hold it, and nutrients run out. Fruit trees and fast growers usually reach this point every 1–2 years.",
        signs: [
          "Roots growing out of the drainage holes",
          "Water runs straight through and the soil dries fast",
          "Growth has stopped despite good care; leaves are smaller",
          "Roots visible on the soil surface",
          "Plastic pots bulging or cracking",
        ],
        causes: [
          "Not repotting for a long time",
          "Planting a large-growing plant in a small pot from the start",
          "Leaving plants in their nursery poly-bags",
        ],
        prevention: [
          "Check roots every year at the start of the monsoon or the end of winter",
          "Choose pots for the plant's expected mature size",
          "Move nursery plants out of poly-bags within 2–3 weeks",
        ],
        steps: [
          { title: "Water the day before", detail: "Watering well the day before repotting helps the root ball slide out with less damage." },
          { title: "Remove it gently", detail: "Tilt the pot and press around the rim. If it's stuck, cut a plastic pot away rather than pulling the plant." },
          { title: "Loosen the roots", detail: "Tease circling roots apart with your fingers. If very dense, make 3–4 shallow vertical cuts around the root ball and trim dead roots." },
          { title: "Move up one size", detail: "Replant at the same depth in a pot 2–4 inches wider, with a drainage layer and fresh potting mix." },
          { title: "Aftercare", detail: "Water thoroughly, keep in light shade for 5–7 days and don't fertilise for 2–3 weeks." },
        ],
      },
    },
  },
];

export function getProblem(slug: string): GardenProblem | undefined {
  return PROBLEMS.find((problem) => problem.slug === slug);
}
