import { categories } from "./categories";
import { blendProducts, singleOriginProducts } from "./products/coffee";
import { brewerProducts, cupAccessoryProducts, grinderKettleProducts } from "./products/gear";
import type { SeedCoupon } from "./coupons";
import { coupons } from "./coupons";
import type { SeedCategory, SeedProduct } from "./types";

export const seedCategories: SeedCategory[] = categories;

export const seedProducts: SeedProduct[] = [
  ...singleOriginProducts,
  ...blendProducts,
  ...brewerProducts,
  ...grinderKettleProducts,
  ...cupAccessoryProducts,
];

export const seedCoupons: SeedCoupon[] = coupons;

export { photoUrl, photos } from "./photos";
export { arCategories, arProducts } from "./ar";
export type { SeedTranslation } from "./ar";
export type { SeedCategory, SeedProduct, SeedVariant, SeedImage } from "./types";
export type { SeedCoupon } from "./coupons";
