/**
 * The ChhadKrishi Shop catalogue: seeded into `shop_product` (prices are samples) and the source
 * of each product's photo. Photos are real, freely licensed images from Wikimedia Commons, stored
 * in /public/products (800×600) and credited on the shop page. No server-only imports, so the shop UI
 * can read the credits directly.
 */
export type ProductCategory = "seed" | "pot" | "fertilizer" | "tool";

export interface PhotoCredit {
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

export interface CatalogueItem {
  id: string;
  nameBn: string;
  nameEn: string;
  category: ProductCategory;
  priceBdt: number;
  credit: PhotoCredit;
}

const BY_SA_4 = { license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0" };
const BY_SA_3 = { license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0" };
const BY_3 = { license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0" };
const BY_2 = { license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0" };
const CC0 = { license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0" };
const PD = { license: "Public domain", licenseUrl: "https://commons.wikimedia.org/wiki/Help:Public_domain" };
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

export const CATALOGUE: CatalogueItem[] = [
  // --- Seeds ---
  {
    id: "seed-tomato-local",
    nameBn: "দেশি টমেটো বীজ",
    nameEn: "Local tomato seeds",
    category: "seed",
    priceBdt: 60,
    credit: { author: "Michal Klajban", ...BY_SA_4, sourceUrl: commons("Organic_home-grown_tomatoes_-_unripe_to_ripe.jpg") },
  },
  {
    id: "seed-green-chilli",
    nameBn: "কাঁচা মরিচ বীজ",
    nameEn: "Green chilli seeds",
    category: "seed",
    priceBdt: 40,
    credit: { author: "Mutney", ...BY_SA_4, sourceUrl: commons("Chilli_Peppers,_greengrocers_display,_Redruth,_Cornwall_-_October_2022.jpg") },
  },
  {
    id: "seed-red-amaranth",
    nameBn: "লাল শাক বীজ",
    nameEn: "Red amaranth seeds",
    category: "seed",
    priceBdt: 30,
    credit: { author: "Yoko Nekonomania", ...BY_2, sourceUrl: commons("Leaves,_Chinese_spinach_%22Shoujyou%22_-_Flickr_-_nekonomania.jpg") },
  },
  {
    id: "seed-spinach",
    nameBn: "পালং শাক বীজ",
    nameEn: "Spinach seeds",
    category: "seed",
    priceBdt: 35,
    credit: { author: "Nillerdk", ...BY_3, sourceUrl: commons("Spinach_leaves.jpg") },
  },
  {
    id: "seed-coriander",
    nameBn: "ধনিয়া পাতা বীজ",
    nameEn: "Coriander seeds",
    category: "seed",
    priceBdt: 35,
    credit: { author: "Rupeshm364", ...BY_SA_4, sourceUrl: commons("Coriander_Leaves.jpg") },
  },
  {
    id: "seed-okra",
    nameBn: "ঢেঁড়স বীজ",
    nameEn: "Okra seeds",
    category: "seed",
    priceBdt: 45,
    credit: { author: "Fumikas Sagisavas", ...CC0, sourceUrl: commons("Fresh_okra_(1).jpg") },
  },
  {
    id: "seed-brinjal",
    nameBn: "বেগুন বীজ",
    nameEn: "Brinjal (eggplant) seeds",
    category: "seed",
    priceBdt: 50,
    credit: { author: "Joydeep", ...BY_SA_3, sourceUrl: commons("Solanum_melongena_24_08_2012_(1).JPG") },
  },
  {
    id: "seed-cucumber",
    nameBn: "শসা বীজ",
    nameEn: "Cucumber seeds",
    category: "seed",
    priceBdt: 55,
    credit: { author: "Jason Zhang", ...BY_SA_3, sourceUrl: commons("Ryerson_Market_cucumbers_on_sale.jpg") },
  },
  {
    id: "seed-bottle-gourd",
    nameBn: "লাউ বীজ",
    nameEn: "Bottle gourd seeds",
    category: "seed",
    priceBdt: 50,
    credit: { author: "TBhagat", ...BY_SA_4, sourceUrl: commons("Lagenaria_siceraria_baby_fruit.jpeg") },
  },
  {
    id: "seed-tulsi",
    nameBn: "তুলসী বীজ",
    nameEn: "Tulsi (holy basil) seeds",
    category: "seed",
    priceBdt: 40,
    credit: { author: "Diamante Phi", ...BY_SA_4, sourceUrl: commons("Holy_Basil(Rama,Krishna;Ocimum_tenuiflorum).jpg") },
  },

  // --- Pots & containers ---
  {
    id: "pot-seedling-tray",
    nameBn: "চারা তৈরির ট্রে (৫০ ঘর)",
    nameEn: "Seedling tray (50 cells)",
    category: "pot",
    priceBdt: 120,
    credit: { author: "Furkan Akkurt", ...BY_SA_4, sourceUrl: commons("Pepper_and_tomato_seedling_trays_at_Bo%C4%9Fazi%C3%A7i_University_2026.jpg") },
  },
  {
    id: "pot-plastic-10in",
    nameBn: "১০ ইঞ্চি প্লাস্টিকের টব",
    nameEn: "10-inch plastic pot",
    category: "pot",
    priceBdt: 90,
    credit: { author: "Secretlondon", ...BY_SA_4, sourceUrl: commons("Plastic_nursery_plant_pot_2022.jpg") },
  },
  {
    id: "pot-clay-12in",
    nameBn: "১২ ইঞ্চি মাটির টব",
    nameEn: "12-inch clay pot",
    category: "pot",
    priceBdt: 180,
    credit: { author: "Acabashi", ...BY_SA_4, sourceUrl: commons("Copped_Hall_kitchen_walled_garden,_plant_pot_stack,_Essex,_England.jpg") },
  },
  {
    id: "pot-grow-bag-5",
    nameBn: "জিও ব্যাগ (৫টি)",
    nameEn: "Grow bags (5 pcs)",
    category: "pot",
    priceBdt: 250,
    credit: { author: "Seabonn123", ...BY_SA_4, sourceUrl: commons("Pot_farming_with_grow_bags.jpg") },
  },
  {
    id: "pot-hanging-basket",
    nameBn: "ঝুলন্ত টব",
    nameEn: "Hanging basket planter",
    category: "pot",
    priceBdt: 320,
    credit: { author: "Smart Pot", ...BY_SA_4, sourceUrl: commons("Hanging_Smart_Pot_Wiki.jpg") },
  },
  {
    id: "pot-window-box",
    nameBn: "লম্বা প্ল্যান্টার বক্স (২৪ ইঞ্চি)",
    nameEn: "Planter box (24-inch)",
    category: "pot",
    priceBdt: 450,
    credit: { author: "Bigmacthealmanac", ...BY_SA_4, sourceUrl: commons("Window_box_planter_-_Denver_3.jpg") },
  },
  {
    id: "pot-cement-14in",
    nameBn: "১৪ ইঞ্চি সিমেন্টের টব",
    nameEn: "14-inch cement pot",
    category: "pot",
    priceBdt: 550,
    credit: { author: "W.carter", ...BY_SA_4, sourceUrl: commons("Pink_chrysanthemum_%27Mei-Kyo%27_in_%C3%96vre_Tuntorp.jpg") },
  },

  // --- Fertiliser, soil & plant care ---
  {
    id: "fert-neem-cake-1kg",
    nameBn: "নিম খৈল ১ কেজি",
    nameEn: "Neem cake 1 kg",
    category: "fertilizer",
    priceBdt: 90,
    credit: { author: "Kevinsooryan", ...BY_SA_3, sourceUrl: commons("Azadirachta_indica,_leaves_%26_fruits.JPG") },
  },
  {
    id: "fert-bone-meal-1kg",
    nameBn: "হাড়ের গুঁড়া ১ কেজি",
    nameEn: "Bone meal 1 kg",
    category: "fertilizer",
    priceBdt: 120,
    credit: { author: "Unknown author", ...PD, sourceUrl: commons("Meat_and_bone_meal.jpg") },
  },
  {
    id: "fert-neem-oil-250ml",
    nameBn: "নিম তেল ২৫০ মিলি",
    nameEn: "Neem oil 250 ml",
    category: "fertilizer",
    priceBdt: 180,
    credit: { author: "Likhitha Lily", ...BY_SA_3, sourceUrl: commons("Azadirachta_indica_-_stem.jpg") },
  },
  {
    id: "fert-vermicompost-5kg",
    nameBn: "ভার্মিকম্পোস্ট ৫ কেজি",
    nameEn: "Vermicompost 5 kg",
    category: "fertilizer",
    priceBdt: 220,
    credit: { author: "Renatotcm", ...BY_SA_4, sourceUrl: commons("Vermicast_in_2kg_bag.png") },
  },
  {
    id: "fert-potting-mix-10kg",
    nameBn: "টবের মাটি মিশ্রণ ১০ কেজি",
    nameEn: "Potting mix 10 kg",
    category: "fertilizer",
    priceBdt: 350,
    credit: { author: "Unknown author", ...PD, sourceUrl: commons("Pro-Mix_Potting_Soil.jpg") },
  },

  // --- Tools ---
  {
    id: "tool-hand-trowel",
    nameBn: "হাতে ধরা খুরপি",
    nameEn: "Hand trowel",
    category: "tool",
    priceBdt: 150,
    credit: { author: "Qurren", ...BY_SA_3, sourceUrl: commons("Steel_trowel.jpg") },
  },
  {
    id: "tool-garden-gloves",
    nameBn: "বাগানের গ্লাভস",
    nameEn: "Gardening gloves",
    category: "tool",
    priceBdt: 180,
    credit: { author: "Shixart1985", ...BY_2, sourceUrl: commons("A_hand_wearing_bright_floral_gardening_gloves.jpg") },
  },
  {
    id: "tool-watering-can-5l",
    nameBn: "ঝাঁঝরি ৫ লিটার",
    nameEn: "Watering can 5 L",
    category: "tool",
    priceBdt: 280,
    credit: { author: "Kolforn", ...BY_SA_4, sourceUrl: commons("-2022-05-30_Red_plastic_watering_can,_Trimingham,_Norfolk.JPG") },
  },
  {
    id: "tool-hose-nozzle",
    nameBn: "পাইপের স্প্রে নজল",
    nameEn: "Hose spray nozzle",
    category: "tool",
    priceBdt: 350,
    credit: { author: "PumpkinSky", ...BY_SA_4, sourceUrl: commons("Hose_reel_with_hanging_water_nozzle.jpg") },
  },
  {
    id: "tool-pruning-shears",
    nameBn: "ডাল ছাঁটার কাঁচি",
    nameEn: "Pruning shears",
    category: "tool",
    priceBdt: 420,
    credit: { author: "shrinkin'violet", ...BY_2, sourceUrl: commons("My_trusty_gardening_gloves_%26_secateurs_which_need_a_good_clean_by_the_look_of_them_(8711272274).jpg") },
  },
];

const IDS = new Set(CATALOGUE.map((item) => item.id));

/** The product's photo in /public/products, or null for items added to the database without one. */
export function productImage(id: string): string | null {
  return IDS.has(id) ? `/products/${id}.jpg` : null;
}
