import type { SeedProduct } from "../types";

export const brewerProducts: SeedProduct[] = [
  {
    slug: "ceramic-pour-over-dripper",
    name: "Ceramic Pour-Over Dripper",
    description:
      "A heat-holding porcelain cone with spiral ribs for an even extraction. Fits standard cone filters and sits on most mugs and servers.",
    categorySlug: "brewers",
    featured: true,
    variants: [
      {
        sku: "BR-CPD-01-WHT",
        title: "1–2 cup / White",
        size: "1–2 cup",
        color: "White",
        priceCents: 2800,
        stock: 34,
      },
      {
        sku: "BR-CPD-01-BLK",
        title: "1–2 cup / Black",
        size: "1–2 cup",
        color: "Black",
        priceCents: 2800,
        stock: 12,
      },
      {
        sku: "BR-CPD-02-WHT",
        title: "2–4 cup / White",
        size: "2–4 cup",
        color: "White",
        priceCents: 3200,
        stock: 18,
      },
      {
        sku: "BR-CPD-02-BLK",
        title: "2–4 cup / Black",
        size: "2–4 cup",
        color: "Black",
        priceCents: 3200,
        stock: 0,
      },
    ],
    images: [{ photo: "pourOverCeramic" }, { photo: "filterBloom" }],
  },
  {
    slug: "hourglass-glass-brewer",
    name: "Hourglass Glass Brewer",
    description:
      "A one-piece borosilicate brewer and carafe with a wooden collar. Thick bonded filters give a clean, bright cup.",
    categorySlug: "brewers",
    variants: [
      {
        sku: "BR-HGB-600",
        title: "600 ml",
        size: "600 ml",
        color: "Clear",
        priceCents: 4500,
        stock: 15,
      },
      { sku: "BR-HGB-1000", title: "1 L", size: "1 L", color: "Clear", priceCents: 5200, stock: 8 },
    ],
    images: [
      { photo: "pourOverHourglass" },
      { photo: "pourOverPouring" },
      { photo: "pourOverBar" },
    ],
  },
  {
    slug: "classic-french-press",
    name: "Classic French Press",
    description:
      "A borosilicate glass beaker in a steel frame with a fine four-layer mesh filter. Full-bodied coffee in four minutes.",
    categorySlug: "brewers",
    variants: [
      {
        sku: "BR-CFP-350-BLK",
        title: "350 ml / Black",
        size: "350 ml",
        color: "Black",
        priceCents: 3400,
        stock: 20,
      },
      {
        sku: "BR-CFP-1000-BLK",
        title: "1 L / Black",
        size: "1 L",
        color: "Black",
        priceCents: 4200,
        stock: 14,
      },
      {
        sku: "BR-CFP-1000-CPR",
        title: "1 L / Copper",
        size: "1 L",
        color: "Copper",
        priceCents: 4600,
        stock: 6,
      },
    ],
    images: [
      { photo: "frenchPressWindow" },
      { photo: "frenchPressMono" },
      { photo: "frenchPressStove", variantSku: "BR-CFP-1000-CPR" },
    ],
  },
  {
    slug: "double-wall-steel-french-press",
    name: "Double-Wall Steel French Press",
    description:
      "Vacuum-insulated stainless steel keeps coffee hot for an hour. Unbreakable, so it goes camping too.",
    categorySlug: "brewers",
    variants: [
      {
        sku: "BR-SFP-STL",
        title: "Steel",
        color: "Steel",
        priceCents: 5900,
        compareAtPriceCents: 6900,
        stock: 11,
      },
      {
        sku: "BR-SFP-BLK",
        title: "Black",
        color: "Black",
        priceCents: 5900,
        compareAtPriceCents: 6900,
        stock: 7,
      },
    ],
    images: [{ photo: "frenchPressParts" }, { photo: "frenchPressStove" }],
  },
  {
    slug: "cold-brew-jar",
    name: "Cold Brew Jar",
    description:
      "A glass jar with a removable fine-mesh filter. Add coarse coffee and water, steep overnight in the fridge, and pour.",
    categorySlug: "brewers",
    variants: [
      {
        sku: "BR-CBJ-1000",
        title: "1 L",
        size: "1 L",
        color: "Clear",
        priceCents: 3600,
        stock: 19,
      },
      { sku: "BR-CBJ-2000", title: "2 L", size: "2 L", color: "Clear", priceCents: 4400, stock: 9 },
    ],
    images: [{ photo: "icedLatte" }, { photo: "icedCoffee" }],
  },
  {
    slug: "glass-coffee-server",
    name: "Glass Coffee Server",
    description:
      "A heatproof glass server with a drip-free spout and volume markings. Pairs with any pour-over dripper.",
    categorySlug: "brewers",
    variants: [
      {
        sku: "BR-GCS-600",
        title: "600 ml",
        size: "600 ml",
        color: "Clear",
        priceCents: 2400,
        stock: 27,
      },
    ],
    images: [{ photo: "pourOverScale" }, { photo: "pourOverDark" }],
  },
  {
    slug: "steep-and-release-brewer",
    name: "Steep & Release Brewer",
    description:
      "An immersion dripper with a shut-off valve: steep like a press, then set it on a cup to drain through a paper filter.",
    categorySlug: "brewers",
    status: "DRAFT",
    variants: [{ sku: "BR-SRB-CLR", title: "Clear", color: "Clear", priceCents: 3200, stock: 0 }],
    images: [{ photo: "pourOverDark" }],
  },
  {
    slug: "stovetop-espresso-maker",
    name: "Stovetop Espresso Maker",
    description:
      "A brushed stainless steel moka pot for strong, espresso-style coffee on gas, electric or induction hobs.",
    categorySlug: "brewers",
    variants: [
      {
        sku: "BR-SEM-3",
        title: "3 cup",
        size: "3 cup",
        color: "Steel",
        priceCents: 3800,
        stock: 16,
      },
      {
        sku: "BR-SEM-6",
        title: "6 cup",
        size: "6 cup",
        color: "Steel",
        priceCents: 4600,
        stock: 10,
      },
    ],
    images: [{ photo: "stovetopPour" }],
  },
];

export const grinderKettleProducts: SeedProduct[] = [
  {
    slug: "hand-burr-grinder",
    name: "Hand Burr Grinder",
    description:
      "Hardened steel conical burrs with 40 click settings, from Turkish to French press. Grinds 20 g in under a minute.",
    categorySlug: "grinders-kettles",
    featured: true,
    variants: [
      { sku: "GK-HBG-STL", title: "Steel", color: "Steel", priceCents: 8900, stock: 21 },
      { sku: "GK-HBG-BLK", title: "Black", color: "Black", priceCents: 8900, stock: 13 },
    ],
    images: [{ photo: "handGrinderBeans" }],
  },
  {
    slug: "walnut-box-grinder",
    name: "Walnut Box Grinder",
    description:
      "A traditional box mill with a cast-iron burr and a walnut drawer that catches the grounds. As good on the shelf as it is on the counter.",
    categorySlug: "grinders-kettles",
    variants: [{ sku: "GK-WBG-WAL", title: "Walnut", color: "Walnut", priceCents: 5900, stock: 9 }],
    images: [{ photo: "boxGrinderBeans" }, { photo: "boxGrinderTeal" }],
  },
  {
    slug: "flat-burr-electric-grinder",
    name: "Flat Burr Electric Grinder",
    description:
      "64 mm flat burrs, stepless adjustment and single-dose loading with almost no retention. For espresso and filter.",
    categorySlug: "grinders-kettles",
    variants: [
      {
        sku: "GK-FBE-BLK",
        title: "Black",
        color: "Black",
        priceCents: 24900,
        compareAtPriceCents: 27900,
        stock: 5,
      },
      {
        sku: "GK-FBE-WHT",
        title: "White",
        color: "White",
        priceCents: 24900,
        compareAtPriceCents: 27900,
        stock: 3,
      },
    ],
    images: [{ photo: "electricGrinder" }, { photo: "cafeGrinders" }],
  },
  {
    slug: "conical-burr-electric-grinder",
    name: "Conical Burr Electric Grinder",
    description:
      "A quiet everyday grinder with 40 mm conical burrs, 30 settings and a timed dose button. A big step up from a blade grinder.",
    categorySlug: "grinders-kettles",
    variants: [{ sku: "GK-CBE-BLK", title: "Black", color: "Black", priceCents: 15900, stock: 12 }],
    images: [{ photo: "cafeGrinders" }, { photo: "portafilterDose" }],
  },
  {
    slug: "gooseneck-electric-kettle",
    name: "Gooseneck Electric Kettle",
    description:
      "Set the temperature to the degree, hold it for an hour, and pour with a slim counterbalanced spout. 900 ml.",
    categorySlug: "grinders-kettles",
    featured: true,
    variants: [
      { sku: "GK-GEK-BLK", title: "Black", color: "Black", priceCents: 11900, stock: 17 },
      { sku: "GK-GEK-WHT", title: "White", color: "White", priceCents: 11900, stock: 0 },
      { sku: "GK-GEK-CPR", title: "Copper", color: "Copper", priceCents: 12900, stock: 4 },
    ],
    images: [{ photo: "kettleBlack", variantSku: "GK-GEK-BLK" }, { photo: "pourOverBar" }],
  },
  {
    slug: "stovetop-gooseneck-kettle",
    name: "Stovetop Gooseneck Kettle",
    description:
      "A brushed steel kettle with a precise gooseneck spout. Works on gas, electric and induction. 1 L.",
    categorySlug: "grinders-kettles",
    variants: [
      { sku: "GK-SGK-STL", title: "Steel", color: "Steel", priceCents: 4900, stock: 23 },
      { sku: "GK-SGK-BLK", title: "Black", color: "Black", priceCents: 5400, stock: 11 },
    ],
    images: [{ photo: "kettleSteel" }, { photo: "pourOverPouring" }],
  },
  {
    slug: "precision-pour-kettle",
    name: "Precision Pour Kettle",
    description:
      "A compact 600 ml steel pouring kettle with a built-in thermometer in the lid. Made for single cups.",
    categorySlug: "grinders-kettles",
    variants: [{ sku: "GK-PPK-STL", title: "Steel", color: "Steel", priceCents: 3900, stock: 14 }],
    images: [{ photo: "pourOverCeramic" }, { photo: "pourOverScale" }],
  },
  {
    slug: "travel-hand-grinder",
    name: "Travel Hand Grinder",
    description:
      "A slim aluminum grinder with a folding handle that fits inside an AeroPress-style brewer. Restocking soon.",
    categorySlug: "grinders-kettles",
    variants: [{ sku: "GK-THG-BLK", title: "Black", color: "Black", priceCents: 6900, stock: 0 }],
    images: [{ photo: "handGrinderBeans" }],
  },
];

export const cupAccessoryProducts: SeedProduct[] = [
  {
    slug: "stoneware-mug",
    name: "Stoneware Mug",
    description:
      "Wheel-thrown stoneware with a satin glaze and a comfortable handle. Dishwasher and microwave safe.",
    categorySlug: "cups-accessories",
    featured: true,
    variants: [
      {
        sku: "CA-STM-08-WHT",
        title: "8 oz / White",
        size: "8 oz",
        color: "White",
        priceCents: 2200,
        stock: 30,
      },
      {
        sku: "CA-STM-08-CLY",
        title: "8 oz / Clay",
        size: "8 oz",
        color: "Clay",
        priceCents: 2200,
        stock: 12,
      },
      {
        sku: "CA-STM-12-WHT",
        title: "12 oz / White",
        size: "12 oz",
        color: "White",
        priceCents: 2400,
        stock: 26,
      },
      {
        sku: "CA-STM-12-SGE",
        title: "12 oz / Sage",
        size: "12 oz",
        color: "Sage",
        priceCents: 2400,
        stock: 0,
      },
    ],
    images: [
      { photo: "mugWhite", variantSku: "CA-STM-12-WHT" },
      { photo: "mugWithCookies" },
      { photo: "blackCoffeeMug" },
    ],
  },
  {
    slug: "striped-diner-mug",
    name: "Striped Diner Mug",
    description: "A heavy-bottomed 12 oz diner mug with hand-painted stripes. Built for refills.",
    categorySlug: "cups-accessories",
    variants: [
      {
        sku: "CA-SDM-12-BLK",
        title: "12 oz / Black",
        size: "12 oz",
        color: "Black",
        priceCents: 1800,
        stock: 40,
      },
    ],
    images: [{ photo: "mugStriped" }],
  },
  {
    slug: "double-wall-glass-cup",
    name: "Double-Wall Glass Cup",
    description:
      "Insulated borosilicate glass that keeps drinks hot and hands cool, and shows off every layer of a latte.",
    categorySlug: "cups-accessories",
    variants: [
      {
        sku: "CA-DWG-08",
        title: "8 oz",
        size: "8 oz",
        color: "Clear",
        priceCents: 2600,
        compareAtPriceCents: 3000,
        stock: 22,
      },
      {
        sku: "CA-DWG-12",
        title: "12 oz",
        size: "12 oz",
        color: "Clear",
        priceCents: 2900,
        compareAtPriceCents: 3400,
        stock: 15,
      },
    ],
    images: [{ photo: "doubleWallGlass" }, { photo: "glassCup" }],
  },
  {
    slug: "cappuccino-cup-and-saucer",
    name: "Cappuccino Cup & Saucer",
    description:
      "A 6 oz porcelain cup with a wide tulip shape for latte art, and a matching saucer.",
    categorySlug: "cups-accessories",
    variants: [
      {
        sku: "CA-CCS-06-WHT",
        title: "6 oz / White",
        size: "6 oz",
        color: "White",
        priceCents: 2400,
        stock: 18,
      },
      {
        sku: "CA-CCS-06-SGE",
        title: "6 oz / Sage",
        size: "6 oz",
        color: "Sage",
        priceCents: 2400,
        stock: 10,
      },
    ],
    images: [
      { photo: "cappuccinoTop", variantSku: "CA-CCS-06-WHT" },
      { photo: "cupSaucerSage", variantSku: "CA-CCS-06-SGE" },
      { photo: "cupsOnTable" },
    ],
  },
  {
    slug: "espresso-cup-set",
    name: "Espresso Cup Set",
    description:
      "Two 3 oz thick-walled glass espresso cups with steel saucers. Keeps shots hot and shows the crema.",
    categorySlug: "cups-accessories",
    variants: [
      {
        sku: "CA-ECS-03",
        title: "Set of 2 / 3 oz",
        size: "3 oz",
        color: "Clear",
        priceCents: 2800,
        stock: 16,
      },
    ],
    images: [{ photo: "espressoShot" }, { photo: "espressoCup" }],
  },
  {
    slug: "cone-paper-filters",
    name: "Cone Paper Filters",
    description:
      "Oxygen-bleached cone filters sized for 1–4 cup drippers. No papery taste, even flow.",
    categorySlug: "cups-accessories",
    variants: [
      {
        sku: "CA-CPF-100",
        title: "100 pack",
        size: "100 pack",
        color: "White",
        priceCents: 800,
        stock: 120,
      },
      {
        sku: "CA-CPF-200",
        title: "200 pack",
        size: "200 pack",
        color: "White",
        priceCents: 1400,
        stock: 75,
      },
    ],
    images: [{ photo: "filterBloom" }, { photo: "pourOverHourglass" }],
  },
  {
    slug: "coffee-scale-with-timer",
    name: "Coffee Scale with Timer",
    description:
      "Weighs to 0.1 g with a built-in shot and pour-over timer. Rechargeable, water-resistant and slim enough for a drip tray.",
    categorySlug: "cups-accessories",
    variants: [{ sku: "CA-CST-BLK", title: "Black", color: "Black", priceCents: 4500, stock: 19 }],
    images: [{ photo: "pourOverScale" }],
  },
  {
    slug: "vacuum-bean-canister",
    name: "Vacuum Bean Canister",
    description:
      "An airtight steel canister with a one-way valve and date dial. Holds a 500 g bag and keeps beans fresh for longer.",
    categorySlug: "cups-accessories",
    variants: [
      {
        sku: "CA-VBC-STL",
        title: "500 g / Steel",
        size: "500 g",
        color: "Steel",
        priceCents: 3200,
        compareAtPriceCents: 3600,
        stock: 14,
      },
      {
        sku: "CA-VBC-BLK",
        title: "500 g / Black",
        size: "500 g",
        color: "Black",
        priceCents: 3200,
        compareAtPriceCents: 3600,
        stock: 9,
      },
    ],
    images: [{ photo: "beansInBowl" }, { photo: "beansCloseup" }],
  },
];
