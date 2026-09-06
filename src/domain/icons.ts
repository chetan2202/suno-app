// Emoji icons for categories and products. Emoji render as colourful icons on every
// platform with no asset pipeline. Products fall back to their category icon.

import { CUSTOM_CATEGORY_ID } from "./catalog.js";

const CATEGORY_ICONS: Record<string, string> = {
  vegetables: "🥬",
  fruits: "🍎",
  staples: "🌾",
  spices: "🌶️",
  dairy: "🥛",
  oils: "🫗",
  bakery_breakfast: "🍞",
  beverages: "☕",
  condiments: "🍯",
  sweeteners_dryfruits: "🍬",
  personal_care: "🧼",
  household: "🧹",
  non_vegetarian: "🍗",
  [CUSTOM_CATEGORY_ID]: "⭐",
};

const ITEM_ICONS: Record<string, string> = {
  // vegetables
  spinach: "🥬", fenugreek: "🌿", coriander: "🌿", mint: "🌿",
  onion: "🧅", potato: "🥔", tomato: "🍅", ginger: "🫚", garlic: "🧄", carrot: "🥕",
  okra: "🌱", brinjal: "🍆", cauliflower: "🥦", cabbage: "🥬", capsicum: "🫑",
  green_peas: "🫛", bottle_gourd: "🥒", green_chilli: "🌶️",
  // fruits
  banana: "🍌", apple: "🍎", orange: "🍊", mango: "🥭", papaya: "🫐", lemon: "🍋",
  // staples
  atta: "🌾", maida: "🌾", besan: "🌾", suji: "🌾", rice: "🍚", basmati_rice: "🍚",
  poha: "🍚", toor_dal: "🫘", moong_dal: "🫘", chana_dal: "🫘", masoor_dal: "🫘",
  rajma: "🫘", kabuli_chana: "🫘",
  // spices
  salt: "🧂", turmeric: "🌟", red_chilli_powder: "🌶️", coriander_powder: "🌿",
  garam_masala: "🥘", cumin: "🌰", mustard_seeds: "🌰", black_pepper: "⚫", bay_leaf: "🍃",
  // dairy
  milk: "🥛", curd: "🥣", paneer: "🧀", butter: "🧈", ghee: "🫙", cheese: "🧀",
  // oils
  cooking_oil: "🫗", mustard_oil: "🫗", refined_oil: "🫗",
  // bakery
  bread: "🍞", rusk: "🍞", cornflakes: "🥣", oats: "🥣",
  // beverages
  tea: "🍵", coffee: "☕", health_drink: "🥤",
  // condiments
  ketchup: "🍅", pickle: "🥒", jam: "🍓", honey: "🍯",
  // sweeteners / dry fruits
  sugar: "🧂", jaggery: "🟫", almonds: "🌰", cashew: "🌰", raisins: "🍇",
  // personal care
  soap: "🧼", shampoo: "🧴", hair_oil: "🧴", face_wash: "🧴", toothpaste: "🪥", toothbrush: "🪥",
  // household
  detergent: "🧴", dishwash: "🧽", floor_cleaner: "🧴", toilet_cleaner: "🚽",
  garbage_bags: "🗑️", matchbox: "🔥", agarbatti: "🪔",
  // non-veg
  eggs: "🥚", chicken: "🍗", mutton: "🥩", fish: "🐟", prawns: "🦐",
};

export function categoryIcon(categoryId: string): string {
  return CATEGORY_ICONS[categoryId] ?? "🛒";
}

export function itemIcon(itemId: string, categoryId: string): string {
  return ITEM_ICONS[itemId] ?? categoryIcon(categoryId);
}
