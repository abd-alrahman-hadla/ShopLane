import type { SeedProduct, SeedVariant } from "../types";

type BagOptions = {
  /** Stock for 250 g, 500 g and 1 kg bags. */
  stock: readonly [number, number, number];
  /** Optional "was" price for the 250 g bag; larger bags scale the same way. */
  compareAt250Cents?: number;
};

const BAG_SIZES = [
  { size: "250 g", code: "250", multiplier: 1 },
  { size: "500 g", code: "500", multiplier: 1.8 },
  { size: "1 kg", code: "1000", multiplier: 3.2 },
] as const;

function roundToDollar(cents: number): number {
  return Math.round(cents / 100) * 100;
}

/** Standard 250 g / 500 g / 1 kg bag variants priced off the 250 g bag. */
export function bagVariants(
  skuPrefix: string,
  price250Cents: number,
  options: BagOptions,
): SeedVariant[] {
  return BAG_SIZES.map((bag, index) => {
    const priceCents =
      bag.multiplier === 1 ? price250Cents : roundToDollar(price250Cents * bag.multiplier);
    const compareAt = options.compareAt250Cents;
    return {
      sku: `${skuPrefix}-${bag.code}`,
      title: bag.size,
      size: bag.size,
      priceCents,
      compareAtPriceCents:
        compareAt === undefined
          ? undefined
          : bag.multiplier === 1
            ? compareAt
            : roundToDollar(compareAt * bag.multiplier),
      stock: options.stock[index] ?? 0,
    };
  });
}

export const singleOriginProducts: SeedProduct[] = [
  {
    slug: "ethiopia-yirgacheffe-kochere",
    name: "Ethiopia Yirgacheffe Kochere",
    description:
      "A washed heirloom lot from smallholders around Kochere. Jasmine on the nose, then lemon zest, bergamot and a honeyed finish. Roasted light for pour-over.",
    categorySlug: "single-origin",
    featured: true,
    variants: bagVariants("SO-ETH-YIR", 2100, { stock: [42, 18, 6] }),
    images: [{ photo: "coffeeCherries" }, { photo: "beansCloseup" }],
  },
  {
    slug: "kenya-nyeri-aa",
    name: "Kenya Nyeri AA",
    description:
      "SL28 and SL34 from the slopes of Mount Kenya. Juicy blackcurrant, pink grapefruit and a bright, winey acidity. Brilliant as filter or iced.",
    categorySlug: "single-origin",
    variants: bagVariants("SO-KEN-NYE", 2300, { stock: [25, 10, 4] }),
    images: [{ photo: "beansBurlap" }, { photo: "cupWithBeans" }],
  },
  {
    slug: "colombia-huila-pink-bourbon",
    name: "Colombia Huila Pink Bourbon",
    description:
      "A rare Pink Bourbon variety grown at 1,800 m in Huila. Red apple, panela sugar and a silky body with a lingering floral note.",
    categorySlug: "single-origin",
    featured: true,
    variants: bagVariants("SO-COL-HUI", 2200, { stock: [30, 14, 8] }),
    images: [{ photo: "beansInHand" }, { photo: "beansScattered" }],
  },
  {
    slug: "guatemala-huehuetenango",
    name: "Guatemala Huehuetenango",
    description:
      "High-grown Caturra and Bourbon from the Cuchumatanes highlands. Milk chocolate, toasted almond and a soft orange finish. An easy all-rounder.",
    categorySlug: "single-origin",
    variants: bagVariants("SO-GUA-HUE", 1900, { stock: [50, 22, 12] }),
    images: [{ photo: "beansInBowl" }, { photo: "steamingCupBeans" }],
  },
  {
    slug: "costa-rica-tarrazu-honey",
    name: "Costa Rica Tarrazú Honey",
    description:
      "Honey-processed at a family micromill in Tarrazú, leaving some fruit on the bean as it dries. Notes of honey, dried apricot and brown butter.",
    categorySlug: "single-origin",
    variants: bagVariants("SO-CRI-TAR", 1800, { stock: [20, 9, 3], compareAt250Cents: 2000 }),
    images: [{ photo: "beansScattered" }, { photo: "blackCoffeeTop" }],
  },
  {
    slug: "sumatra-gayo",
    name: "Sumatra Gayo",
    description:
      "Wet-hulled coffee from the Gayo highlands of Aceh. Heavy body with cedar, dark chocolate and a hint of spice. Great in a French press.",
    categorySlug: "single-origin",
    variants: bagVariants("SO-SUM-GAY", 1800, { stock: [16, 5, 0] }),
    images: [{ photo: "beansInCup" }, { photo: "beansCloseup" }],
  },
  {
    slug: "rwanda-nyamasheke",
    name: "Rwanda Nyamasheke",
    description:
      "A washed Red Bourbon from the shores of Lake Kivu. Red grape, hibiscus and black tea. This harvest has sold through; the next lot lands soon.",
    categorySlug: "single-origin",
    variants: bagVariants("SO-RWA-NYA", 2200, { stock: [0, 0, 0] }),
    images: [{ photo: "beansBurlap" }, { photo: "coffeeCherries" }],
  },
  {
    slug: "panama-boquete-geisha",
    name: "Panama Boquete Geisha",
    description:
      "A competition-grade Geisha from Boquete. Bergamot, peach and jasmine with a tea-like body. Coming soon in a limited release.",
    categorySlug: "single-origin",
    status: "DRAFT",
    variants: [
      { sku: "SO-PAN-GEI-125", title: "125 g", size: "125 g", priceCents: 4800, stock: 0 },
    ],
    images: [{ photo: "pourOverBar" }],
  },
];

export const blendProducts: SeedProduct[] = [
  {
    slug: "morning-lane-house-blend",
    name: "Morning Lane House Blend",
    description:
      "Our everyday blend of Brazil and Guatemala. Caramel, roasted nuts and cocoa with a smooth, round body. Works in any brewer.",
    categorySlug: "blends-espresso",
    featured: true,
    variants: bagVariants("BL-MOR-LAN", 1600, { stock: [80, 40, 25] }),
    images: [{ photo: "cupWithBeans" }, { photo: "steamingCupBeans" }],
  },
  {
    slug: "laneway-espresso",
    name: "Laneway Espresso",
    description:
      "Built for espresso and milk drinks. Dark chocolate, cherry and a syrupy body that cuts through a flat white without disappearing.",
    categorySlug: "blends-espresso",
    featured: true,
    variants: bagVariants("BL-LAN-ESP", 1700, { stock: [64, 30, 20] }),
    images: [{ photo: "espressoFlatlay" }, { photo: "espressoShot" }, { photo: "portafilterDose" }],
  },
  {
    slug: "swiss-water-decaf-colombia",
    name: "Swiss Water Decaf Colombia",
    description:
      "Decaffeinated with water only, no solvents. Brown sugar, milk chocolate and red apple, so you can have a third cup after dinner.",
    categorySlug: "blends-espresso",
    variants: bagVariants("BL-DEC-COL", 1800, { stock: [28, 12, 0] }),
    images: [{ photo: "steamingCupBeans" }, { photo: "blackCoffeeMug" }],
  },
  {
    slug: "night-shift-dark-roast",
    name: "Night Shift Dark Roast",
    description:
      "A bold dark roast of Sumatra and Brazil. Smoky cocoa, molasses and a long bittersweet finish for those who like it strong.",
    categorySlug: "blends-espresso",
    variants: bagVariants("BL-NIG-SHI", 1600, { stock: [35, 15, 9] }),
    images: [{ photo: "beansInCup" }, { photo: "blackCoffeeTop" }],
  },
  {
    slug: "winter-hearth-seasonal-blend",
    name: "Winter Hearth Seasonal Blend",
    description:
      "Our cold-weather blend of Ethiopia and Colombia. Baking spice, dark cherry and toffee. Available while the season lasts.",
    categorySlug: "blends-espresso",
    variants: bagVariants("BL-WIN-HEA", 1700, { stock: [22, 10, 4], compareAt250Cents: 1900 }),
    images: [{ photo: "latteOnBeans" }, { photo: "latteRosetta" }],
  },
  {
    slug: "slow-drip-cold-brew-blend",
    name: "Slow Drip Cold Brew Blend",
    description:
      "Roasted and ground coarse for cold brew. Steep overnight for a sweet, low-acid concentrate with notes of chocolate milk and hazelnut.",
    categorySlug: "blends-espresso",
    variants: bagVariants("BL-SLO-DRI", 1700, { stock: [40, 20, 10] }),
    images: [{ photo: "icedCoffee" }, { photo: "icedLatte" }],
  },
  {
    slug: "crema-espresso-blend",
    name: "Crema Espresso Blend",
    description:
      "A classic Italian-style espresso with a touch of washed robusta for thick crema. Hazelnut, cocoa and a clean, toasty finish.",
    categorySlug: "blends-espresso",
    variants: bagVariants("BL-CRE-ESP", 1800, { stock: [26, 0, 6] }),
    images: [{ photo: "espressoTools" }, { photo: "espressoCup" }],
  },
  {
    slug: "half-caf-blend",
    name: "Half Caf Blend",
    description:
      "Half Swiss Water decaf, half Morning Lane. All the flavor of your morning cup with half the caffeine. Smooth, nutty and sweet.",
    categorySlug: "blends-espresso",
    variants: bagVariants("BL-HAL-CAF", 1700, { stock: [12, 0, 0] }),
    images: [{ photo: "beansInBowl" }, { photo: "latteHeart" }],
  },
];
