import type { Lang } from "@/lib/i18n/dictionary";
import type { Question, RequirementField } from "./schema";

/**
 * Deterministic questions for every required field. The model normally writes its own,
 * context-aware questions; these are used when it marks the consultation done too early,
 * forgets to ask, or a turn fails — so the gardener can always keep going.
 */
type Bank = Record<RequirementField, Omit<Question, "field">>;

const bn: Bank = {
  spaceType: {
    text: "এটি কোন ধরনের জায়গা?",
    hint: "জায়গার ধরন অনুযায়ী টবের ওজন ও গাছ বাছাই বদলায়।",
    inputKind: "single",
    options: [
      { label: "বারান্দা", value: "balcony" },
      { label: "ছাদ", value: "rooftop" },
      { label: "টেরেস", value: "terrace" },
      { label: "জানালার পাশ", value: "windowsill" },
      { label: "উঠান", value: "yard" },
    ],
    allowCustom: false,
    unit: "",
  },
  areaSqft: {
    text: "বাগানের জন্য মোটামুটি কত বর্গফুট জায়গা আছে?",
    hint: "আন্দাজ হলেও চলবে — দৈর্ঘ্য × প্রস্থ (ফুটে)।",
    inputKind: "number",
    options: [
      { label: "২৫ বর্গফুটের কম", value: "20" },
      { label: "২৫–৮০ বর্গফুট", value: "50" },
      { label: "৮০–২৫০ বর্গফুট", value: "150" },
      { label: "২৫০+ বর্গফুট", value: "400" },
    ],
    allowCustom: true,
    unit: "বর্গফুট",
  },
  sunlight: {
    text: "দিনে কতক্ষণ সরাসরি রোদ পড়ে?",
    hint: "রোদের পরিমাণই ঠিক করে কোন গাছ ভালো হবে।",
    inputKind: "single",
    options: [
      { label: "৬ ঘণ্টার বেশি", value: "full" },
      { label: "৩–৬ ঘণ্টা", value: "partial" },
      { label: "৩ ঘণ্টার কম", value: "shade" },
    ],
    allowCustom: false,
    unit: "",
  },
  budgetBdt: {
    text: "শুরু করতে মোট কত টাকা খরচ করতে চান?",
    hint: "টব, মাটি, চারা ও সরঞ্জাম মিলিয়ে।",
    inputKind: "number",
    options: [
      { label: "৫,০০০ পর্যন্ত", value: "5000" },
      { label: "১০,০০০ পর্যন্ত", value: "10000" },
      { label: "২৫,০০০ পর্যন্ত", value: "25000" },
      { label: "৫০,০০০+", value: "50000" },
    ],
    allowCustom: true,
    unit: "৳",
  },
  preferredPlants: {
    text: "কোন ধরনের গাছ চান? একাধিক বাছতে পারেন।",
    hint: "",
    inputKind: "multi",
    options: [
      { label: "শাকসবজি", value: "vegetables" },
      { label: "ফলের গাছ", value: "fruit trees" },
      { label: "ফুল", value: "flowers" },
      { label: "ভেষজ ও মসলা", value: "herbs" },
      { label: "পাতাবাহার", value: "foliage plants" },
      { label: "ক্যাকটাস ও সাকুলেন্ট", value: "succulents" },
    ],
    allowCustom: true,
    unit: "",
  },
  experience: {
    text: "বাগান করার অভিজ্ঞতা কেমন?",
    hint: "",
    inputKind: "single",
    options: [
      { label: "একদম নতুন", value: "beginner" },
      { label: "কিছুটা আছে", value: "intermediate" },
      { label: "অভিজ্ঞ", value: "experienced" },
    ],
    allowCustom: false,
    unit: "",
  },
  style: {
    text: "কেমন দেখতে চান আপনার বাগান?",
    hint: "",
    inputKind: "single",
    options: [
      { label: "সবুজে ঘেরা ট্রপিক্যাল", value: "lush tropical" },
      { label: "কিচেন গার্ডেন", value: "productive kitchen garden" },
      { label: "সাজানো-গোছানো আধুনিক", value: "clean modern minimal" },
      { label: "রঙিন ফুলের বাগান", value: "colourful flower garden" },
      { label: "বসার জায়গাসহ আরামদায়ক", value: "cosy sit-out with greenery" },
    ],
    allowCustom: true,
    unit: "",
  },
  potCount: {
    text: "মোটামুটি কয়টি টব রাখতে চান?",
    hint: "",
    inputKind: "number",
    options: [
      { label: "৫টির কম", value: "4" },
      { label: "৫–১০টি", value: "8" },
      { label: "১০–২০টি", value: "15" },
      { label: "২০টির বেশি", value: "25" },
    ],
    allowCustom: true,
    unit: "টি",
  },
  maintenance: {
    text: "গাছের যত্নে প্রতিদিন কতটা সময় দিতে পারবেন?",
    hint: "",
    inputKind: "single",
    options: [
      { label: "খুব কম (১০ মিনিট)", value: "low" },
      { label: "মাঝারি (২০–৩০ মিনিট)", value: "medium" },
      { label: "অনেক (১ ঘণ্টা+)", value: "high" },
    ],
    allowCustom: false,
    unit: "",
  },
};

const en: Bank = {
  spaceType: {
    text: "What kind of space is this?",
    hint: "It changes pot weight limits and plant choices.",
    inputKind: "single",
    options: [
      { label: "Balcony", value: "balcony" },
      { label: "Rooftop", value: "rooftop" },
      { label: "Terrace", value: "terrace" },
      { label: "Windowsill", value: "windowsill" },
      { label: "Yard", value: "yard" },
    ],
    allowCustom: false,
    unit: "",
  },
  areaSqft: {
    text: "Roughly how many square feet can you use?",
    hint: "An estimate is fine — length × width in feet.",
    inputKind: "number",
    options: [
      { label: "Under 25 sq ft", value: "20" },
      { label: "25–80 sq ft", value: "50" },
      { label: "80–250 sq ft", value: "150" },
      { label: "250+ sq ft", value: "400" },
    ],
    allowCustom: true,
    unit: "sq ft",
  },
  sunlight: {
    text: "How many hours of direct sun does it get?",
    hint: "Sunlight decides which plants will thrive.",
    inputKind: "single",
    options: [
      { label: "More than 6 hours", value: "full" },
      { label: "3–6 hours", value: "partial" },
      { label: "Under 3 hours", value: "shade" },
    ],
    allowCustom: false,
    unit: "",
  },
  budgetBdt: {
    text: "What's your total budget to get started?",
    hint: "Pots, soil, plants and supplies together.",
    inputKind: "number",
    options: [
      { label: "Up to ৳5,000", value: "5000" },
      { label: "Up to ৳10,000", value: "10000" },
      { label: "Up to ৳25,000", value: "25000" },
      { label: "৳50,000+", value: "50000" },
    ],
    allowCustom: true,
    unit: "৳",
  },
  preferredPlants: {
    text: "Which kinds of plants would you like? Pick any.",
    hint: "",
    inputKind: "multi",
    options: [
      { label: "Vegetables", value: "vegetables" },
      { label: "Fruit trees", value: "fruit trees" },
      { label: "Flowers", value: "flowers" },
      { label: "Herbs & spices", value: "herbs" },
      { label: "Foliage plants", value: "foliage plants" },
      { label: "Cacti & succulents", value: "succulents" },
    ],
    allowCustom: true,
    unit: "",
  },
  experience: {
    text: "How much gardening experience do you have?",
    hint: "",
    inputKind: "single",
    options: [
      { label: "Complete beginner", value: "beginner" },
      { label: "Some experience", value: "intermediate" },
      { label: "Experienced", value: "experienced" },
    ],
    allowCustom: false,
    unit: "",
  },
  style: {
    text: "What look are you going for?",
    hint: "",
    inputKind: "single",
    options: [
      { label: "Lush tropical", value: "lush tropical" },
      { label: "Kitchen garden", value: "productive kitchen garden" },
      { label: "Clean & modern", value: "clean modern minimal" },
      { label: "Colourful flowers", value: "colourful flower garden" },
      { label: "Cosy sit-out", value: "cosy sit-out with greenery" },
    ],
    allowCustom: true,
    unit: "",
  },
  potCount: {
    text: "About how many pots would you like?",
    hint: "",
    inputKind: "number",
    options: [
      { label: "Fewer than 5", value: "4" },
      { label: "5–10", value: "8" },
      { label: "10–20", value: "15" },
      { label: "More than 20", value: "25" },
    ],
    allowCustom: true,
    unit: "pots",
  },
  maintenance: {
    text: "How much time can you give the plants each day?",
    hint: "",
    inputKind: "single",
    options: [
      { label: "Very little (10 min)", value: "low" },
      { label: "Some (20–30 min)", value: "medium" },
      { label: "Plenty (1 hour+)", value: "high" },
    ],
    allowCustom: false,
    unit: "",
  },
};

export function fallbackQuestion(field: RequirementField, lang: Lang): Question {
  return { field, ...(lang === "bn" ? bn : en)[field] };
}
