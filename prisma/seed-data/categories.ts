import type { SeedCategory } from "./types";

export const categories: SeedCategory[] = [
  {
    slug: "single-origin",
    name: "Single-Origin Coffee",
    description:
      "Traceable lots from one farm or washing station, roasted light to medium to show off where they grew.",
    photo: "coffeeCherries",
    sortOrder: 1,
  },
  {
    slug: "blends-espresso",
    name: "Blends & Espresso",
    description:
      "Dependable everyday blends and espresso roasts built for balance, sweetness and milk.",
    photo: "espressoFlatlay",
    sortOrder: 2,
  },
  {
    slug: "brewers",
    name: "Brewers",
    description:
      "Pour-over drippers, French presses and cold-brew gear for brewing better coffee at home.",
    photo: "pourOverBar",
    sortOrder: 3,
  },
  {
    slug: "grinders-kettles",
    name: "Grinders & Kettles",
    description: "Burr grinders for an even grind and gooseneck kettles for a controlled pour.",
    photo: "boxGrinderBeans",
    sortOrder: 4,
  },
  {
    slug: "cups-accessories",
    name: "Cups & Accessories",
    description:
      "Mugs, glassware, filters, scales and storage: the small things that finish the ritual.",
    photo: "cupSaucerSage",
    sortOrder: 5,
  },
];
