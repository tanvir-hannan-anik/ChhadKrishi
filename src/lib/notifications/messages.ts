import type { Lang } from "@/lib/i18n/dictionary";
import type { AlertKind } from "@/lib/weather/model";

/**
 * Notification texts. Rows store a kind and its parameters; the words are produced here, so the
 * in-app list follows the language switch and a push uses the language the device subscribed in.
 */
export type NotificationKind = "weather" | "care" | "order" | "push-enabled";

export type NotificationParams = {
  weather: { alert: AlertKind; value: number; date: string; today: string; place: string };
  care: { count: number };
  order: { total: number };
  "push-enabled": Record<string, never>;
};

const digits = (n: number, lang: Lang) => new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US").format(n);

export function notificationText(kind: string, params: unknown, lang: Lang): { title: string; body: string } {
  const bn = lang === "bn";
  switch (kind) {
    case "weather": {
      const p = params as NotificationParams["weather"];
      const when = p.date === p.today ? (bn ? "আজ" : "today") : bn ? "আগামীকাল" : "tomorrow";
      const where = p.place ? (bn ? ` (${p.place})` : ` (${p.place})`) : "";
      const v = digits(p.value, lang);
      const texts = {
        storm: bn
          ? { title: `⛈️ ${when} ঝড়-বৃষ্টির সম্ভাবনা${where}`, body: "টব ও মাচা শক্ত করে বাঁধুন, ছোট টব নিরাপদ জায়গায় সরান, আজ স্প্রে করবেন না।" }
          : { title: `⛈️ Thunderstorm likely ${when}${where}`, body: "Tie down trellises, move small pots to shelter and skip spraying today." },
        heavyRain: bn
          ? { title: `🌧️ ${when} ভারী বৃষ্টি (~${v} মিমি)${where}`, body: "পানি দেওয়া বন্ধ রাখুন, টবের নিচের ছিদ্র খোলা আছে কি না দেখে নিন।" }
          : { title: `🌧️ Heavy rain ${when} (~${v} mm)${where}`, body: "Skip watering and make sure pot drainage holes are clear." },
        heat: bn
          ? { title: `🔥 ${when} তীব্র গরম (${v}°C)${where}`, body: "সকাল ও সন্ধ্যায় পানি দিন, দুপুরে শেড নেট ব্যবহার করুন।" }
          : { title: `🔥 Hot day ${when} (${v}°C)${where}`, body: "Water early morning and evening; shade plants at midday." },
        wind: bn
          ? { title: `💨 ${when} জোরালো বাতাস (${v} কিমি/ঘণ্টা)${where}`, body: "লম্বা গাছে খুঁটি দিন, হালকা টব দেয়ালের পাশে সরান।" }
          : { title: `💨 Strong wind ${when} (${v} km/h)${where}`, body: "Stake tall plants and move light pots against a wall." },
        cold: bn
          ? { title: `🥶 ${when} ঠান্ডা রাত (${v}°C)${where}`, body: "চারা ও কচি গাছ রাতে ঢেকে রাখুন।" }
          : { title: `🥶 Cold night ${when} (${v}°C)${where}`, body: "Cover seedlings and young plants overnight." },
      };
      return texts[p.alert];
    }
    case "care": {
      const p = params as NotificationParams["care"];
      return bn
        ? { title: `🌱 আজ ${digits(p.count, lang)}টি যত্নের কাজ বাকি`, body: "রুটিন খুলে কাজগুলো শেষ করুন।" }
        : { title: `🌱 ${digits(p.count, lang)} care ${p.count === 1 ? "task" : "tasks"} due today`, body: "Open your routine to tick them off." };
    }
    case "order": {
      const p = params as NotificationParams["order"];
      return bn
        ? { title: "🧺 অর্ডার অনুরোধ পাওয়া গেছে", body: `মোট ৳${digits(p.total, lang)} — শীঘ্রই আমরা যোগাযোগ করব।` }
        : { title: "🧺 Order request received", body: `Total ৳${digits(p.total, lang)} — we will contact you soon.` };
    }
    case "push-enabled":
      return bn
        ? { title: "🔔 নোটিফিকেশন চালু হয়েছে", body: "আবহাওয়ার সতর্কতা ও যত্নের রিমাইন্ডার এখন এই ডিভাইসে আসবে।" }
        : { title: "🔔 Notifications are on", body: "Weather alerts and care reminders will now reach this device." };
    default:
      return bn ? { title: "ছাদকৃষি", body: "" } : { title: "ChhadKrishi", body: "" };
  }
}
