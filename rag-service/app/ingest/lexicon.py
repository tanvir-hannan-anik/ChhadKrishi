"""
Controlled vocabularies for chunk metadata and query filters. Tagging is deterministic (whole-word
matching), so metadata never contains anything that is not literally in the passage.

Each entry: canonical English term → synonyms (English variants, Latin names, Bangla).
The Bangla synonyms let a Bangla question map onto the English encyclopedia's tags.
"""

from __future__ import annotations

CROPS: dict[str, list[str]] = {
    "rice": ["rice", "paddy", "oryza sativa", "ধান", "চাল"],
    "wheat": ["wheat", "triticum", "গম"],
    "maize": ["maize", "corn", "zea mays", "ভুট্টা"],
    "potato": ["potato", "potatoes", "solanum tuberosum", "আলু"],
    "tomato": ["tomato", "tomatoes", "solanum lycopersicum", "lycopersicon", "টমেটো"],
    "eggplant": ["eggplant", "brinjal", "aubergine", "solanum melongena", "বেগুন"],
    "chili": ["chili", "chilli", "chile pepper", "hot pepper", "capsicum", "মরিচ", "লঙ্কা"],
    "okra": ["okra", "lady's finger", "abelmoschus", "ঢেঁড়স", "ঢ্যাঁড়স"],
    "cucumber": ["cucumber", "cucumis sativus", "শসা"],
    "gourd": ["gourd", "bottle gourd", "bitter gourd", "bitter melon", "lagenaria", "momordica", "লাউ", "করলা"],
    "pumpkin": ["pumpkin", "squash", "cucurbita", "কুমড়া", "মিষ্টি কুমড়া"],
    "spinach": ["spinach", "spinacia", "পালং", "পালংশাক"],
    "amaranth": ["amaranth", "amaranthus", "লাল শাক", "ডাটা"],
    "lettuce": ["lettuce", "lactuca", "লেটুস"],
    "cabbage": ["cabbage", "brassica oleracea", "বাঁধাকপি"],
    "cauliflower": ["cauliflower", "ফুলকপি"],
    "onion": ["onion", "allium cepa", "পেঁয়াজ"],
    "garlic": ["garlic", "allium sativum", "রসুন"],
    "bean": ["bean", "beans", "phaseolus", "cowpea", "lablab", "শিম", "বরবটি"],
    "pea": ["pea", "peas", "pisum", "মটর"],
    "lentil": ["lentil", "lentils", "lens culinaris", "মসুর"],
    "soybean": ["soybean", "soybeans", "soy", "glycine max", "সয়াবিন"],
    "mustard": ["mustard", "rapeseed", "canola", "brassica juncea", "সরিষা"],
    "groundnut": ["groundnut", "peanut", "arachis", "চীনাবাদাম"],
    "jute": ["jute", "corchorus", "পাট"],
    "sugarcane": ["sugarcane", "saccharum", "আখ"],
    "cotton": ["cotton", "gossypium", "তুলা"],
    "tea": ["tea", "camellia sinensis", "চা"],
    "coffee": ["coffee", "coffea", "কফি"],
    "cassava": ["cassava", "manioc", "manihot", "কাসাভা"],
    "sweet potato": ["sweet potato", "ipomoea batatas", "মিষ্টি আলু"],
    "banana": ["banana", "bananas", "plantain", "musa", "কলা"],
    "mango": ["mango", "mangoes", "mangifera", "আম"],
    "papaya": ["papaya", "papayas", "carica papaya", "পেঁপে"],
    "citrus": ["citrus", "lemon", "mandarin", "citrus fruit", "লেবু", "কমলা", "মাল্টা"],
    "guava": ["guava", "psidium", "পেয়ারা"],
    "jackfruit": ["jackfruit", "artocarpus", "কাঁঠাল"],
    "coconut": ["coconut", "cocos nucifera", "নারকেল"],
    "apple": ["apple", "apples", "malus"],
    "grape": ["grape", "grapes", "grapevine", "vitis", "আঙুর"],
    "strawberry": ["strawberry", "strawberries", "fragaria", "স্ট্রবেরি"],
    "sorghum": ["sorghum", "জোয়ার"],
    "millet": ["millet", "millets", "কাউন"],
    "barley": ["barley", "hordeum", "যব"],
    "cocoa": ["cocoa", "cacao", "theobroma"],
    "herbs": ["basil", "mint", "coriander", "cilantro", "tulsi", "তুলসী", "পুদিনা", "ধনিয়া"],
    "aloe": ["aloe", "aloe vera", "অ্যালোভেরা"],
}

DISEASES: dict[str, list[str]] = {
    "blight": ["blight", "late blight", "early blight", "phytophthora infestans", "alternaria", "ধসা", "ব্লাইট"],
    "rust": ["rust", "rusts", "puccinia", "মরিচা রোগ"],
    "powdery mildew": ["powdery mildew", "erysiphe", "পাউডারি মিলডিউ"],
    "downy mildew": ["downy mildew", "peronospora", "ডাউনি মিলডিউ"],
    "wilt": ["wilt", "wilting", "fusarium wilt", "bacterial wilt", "ralstonia", "ঢলে পড়া", "উইল্ট"],
    "root rot": ["root rot", "pythium", "rhizoctonia", "শিকড় পচা"],
    "rot": ["rot", "rots", "fruit rot", "stem rot", "soft rot", "পচা"],
    "leaf spot": ["leaf spot", "leaf spots", "cercospora", "septoria", "পাতার দাগ"],
    "anthracnose": ["anthracnose", "colletotrichum", "অ্যানথ্রাকনোজ"],
    "damping off": ["damping off", "damping-off", "চারা ঢলে পড়া"],
    "mosaic virus": ["mosaic", "mosaic virus", "ringspot", "ringspot virus", "leaf curl", "মোজাইক", "পাতা কোঁকড়ানো"],
    "canker": ["canker", "cankers", "ক্যাঙ্কার"],
    "smut": ["smut", "smuts", "ustilago"],
    "rice blast": ["blast", "rice blast", "magnaporthe", "pyricularia", "ব্লাস্ট"],
    "bacterial disease": ["bacterial disease", "xanthomonas", "pseudomonas syringae", "bacterial leaf blight"],
    "aphid": ["aphid", "aphids", "জাব পোকা", "এফিড"],
    "whitefly": ["whitefly", "whiteflies", "bemisia", "সাদা মাছি"],
    "mite": ["mite", "mites", "spider mite", "মাকড়"],
    "mealybug": ["mealybug", "mealybugs", "ছাতরা পোকা"],
    "thrips": ["thrips", "থ্রিপস"],
    "caterpillar": ["caterpillar", "caterpillars", "armyworm", "bollworm", "borer", "stem borer", "fruit borer", "ডগা ও ফল ছিদ্রকারী", "লেদা পোকা", "মাজরা পোকা"],
    "nematode": ["nematode", "nematodes", "root-knot", "meloidogyne", "কৃমি"],
    "locust": ["locust", "locusts", "grasshopper"],
    "fruit fly": ["fruit fly", "fruit flies", "bactrocera", "মাছি পোকা"],
    "weed": ["weed", "weeds", "weed control", "আগাছা"],
    "nutrient deficiency": ["deficiency", "chlorosis", "chlorotic", "necrosis", "পুষ্টির অভাব", "হলুদ পাতা"],
}

SOILS: dict[str, list[str]] = {
    "clay": ["clay", "clay soil", "clayey", "এঁটেল মাটি"],
    "loam": ["loam", "loamy", "দোআঁশ"],
    "sandy": ["sand", "sandy", "sandy soil", "বেলে মাটি"],
    "silt": ["silt", "silty", "পলি"],
    "acidic soil": ["acid soil", "acidic soil", "soil acidity", "low ph", "অম্লীয় মাটি"],
    "alkaline soil": ["alkaline soil", "calcareous", "high ph", "ক্ষারীয় মাটি"],
    "saline soil": ["saline", "salinity", "salt-affected", "লবণাক্ত"],
    "organic matter": ["organic matter", "humus", "soil organic carbon", "জৈব পদার্থ"],
    "compost": ["compost", "composting", "vermicompost", "কম্পোস্ট", "কেঁচো সার"],
    "drainage": ["drainage", "waterlogging", "waterlogged", "নিষ্কাশন", "জলাবদ্ধতা"],
    "erosion": ["erosion", "soil erosion", "ক্ষয়"],
    "growing media": ["potting mix", "growing media", "growing medium", "substrate", "cocopeat", "coir", "peat", "container", "containers", "টব"],
    "soil ph": ["ph", "soil ph"],
}

SEASONS: dict[str, list[str]] = {
    "summer": ["summer", "hot season", "গ্রীষ্ম", "গরম"],
    "winter": ["winter", "cold season", "শীত"],
    "monsoon": ["monsoon", "rainy season", "wet season", "বর্ষা"],
    "dry season": ["dry season", "শুষ্ক মৌসুম"],
    "spring": ["spring", "বসন্ত"],
    "autumn": ["autumn", "fall season", "শরৎ", "হেমন্ত"],
    "kharif": ["kharif", "খরিফ"],
    "rabi": ["rabi", "রবি"],
    "aman": ["aman", "আমন"],
    "boro": ["boro", "বোরো"],
    "aus": ["aus rice", "আউশ"],
}

NUTRIENTS: dict[str, list[str]] = {
    "nitrogen": ["nitrogen", "urea", "ammonium", "nitrate", "নাইট্রোজেন", "ইউরিয়া"],
    "phosphorus": ["phosphorus", "phosphate", "triple superphosphate", "dap", "superphosphate", "ফসফরাস", "টিএসপি"],
    "potassium": ["potassium", "potash", "mop", "muriate of potash", "পটাশ", "পটাশিয়াম"],
    "npk": ["npk", "n-p-k", "compound fertilizer", "complete fertilizer"],
    "micronutrients": ["micronutrient", "micronutrients", "zinc", "boron", "iron", "manganese", "copper", "molybdenum", "জিংক", "বোরন"],
    "calcium": ["calcium", "lime", "liming", "gypsum", "চুন", "জিপসাম"],
    "magnesium": ["magnesium", "dolomite"],
    "sulfur": ["sulfur", "sulphur", "সালফার"],
    "organic fertilizer": ["manure", "farmyard manure", "organic fertilizer", "green manure", "biofertilizer", "গোবর", "জৈব সার", "খৈল"],
    "fertilizer": ["fertilizer", "fertiliser", "fertilizers", "fertilization", "সার"],
}

CATEGORIES: dict[str, dict[str, list[str]]] = {
    "crops": CROPS,
    "diseases": DISEASES,
    "soils": SOILS,
    "seasons": SEASONS,
    "nutrients": NUTRIENTS,
}
