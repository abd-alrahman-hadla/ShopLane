/**
 * Demo customers and reviews (dev/seed only). Each customer gets one PAID order
 * containing every product they review, so all reviews come from verified buyers.
 */

export type SeedCustomer = { key: string; email: string; name: string };

export type SeedReview = {
  customer: string;
  product: string;
  rating: number;
  body: string;
  /** How many days ago the review was written. */
  daysAgo: number;
};

export const seedCustomers: SeedCustomer[] = [
  { key: "jamie", email: "demo1@example.com", name: "Jamie Rivera" },
  { key: "priya", email: "demo2@example.com", name: "Priya Shah" },
  { key: "marcus", email: "demo3@example.com", name: "Marcus Chen" },
  { key: "elena", email: "demo4@example.com", name: "Elena Novak" },
  { key: "sam", email: "demo5@example.com", name: "Sam O'Connor" },
  { key: "aiko", email: "demo6@example.com", name: "Aiko Tanaka" },
];

/** All demo orders are placed this many days ago, before any review. */
export const DEMO_ORDER_DAYS_AGO = 120;

export const seedReviews: SeedReview[] = [
  // Ethiopia Yirgacheffe Kochere
  {
    customer: "jamie",
    product: "ethiopia-yirgacheffe-kochere",
    rating: 5,
    daysAgo: 90,
    body: "Smells like jasmine the second you open the bag. On a V60 it's all lemon and bergamot. My favourite coffee this year.",
  },
  {
    customer: "priya",
    product: "ethiopia-yirgacheffe-kochere",
    rating: 5,
    daysAgo: 64,
    body: "Delicate and tea-like, exactly what I want from a washed Ethiopian. Arrived three days after roasting.",
  },
  {
    customer: "marcus",
    product: "ethiopia-yirgacheffe-kochere",
    rating: 4,
    daysAgo: 41,
    body: "Lovely floral cup. A little too bright for me as espresso, but perfect as filter.",
  },
  {
    customer: "aiko",
    product: "ethiopia-yirgacheffe-kochere",
    rating: 5,
    daysAgo: 12,
    body: "Third bag now. Try it iced: the citrus really comes through.",
  },
  // Kenya Nyeri AA
  {
    customer: "elena",
    product: "kenya-nyeri-aa",
    rating: 5,
    daysAgo: 70,
    body: "Huge blackcurrant flavour and a juicy finish. Bold, bright and very Kenyan.",
  },
  {
    customer: "sam",
    product: "kenya-nyeri-aa",
    rating: 3,
    daysAgo: 33,
    body: "Good quality beans but too acidic for my taste. If you like bright coffee you'll love it.",
  },
  // Colombia Huila Pink Bourbon
  {
    customer: "jamie",
    product: "colombia-huila-pink-bourbon",
    rating: 5,
    daysAgo: 85,
    body: "Red apple and brown sugar, super sweet and clean. Easy to brew well.",
  },
  {
    customer: "marcus",
    product: "colombia-huila-pink-bourbon",
    rating: 4,
    daysAgo: 52,
    body: "Sweet and balanced. Works in the French press and the AeroPress alike.",
  },
  {
    customer: "priya",
    product: "colombia-huila-pink-bourbon",
    rating: 5,
    daysAgo: 19,
    body: "Silky body and a long floral finish. Worth the small premium.",
  },
  // Guatemala Huehuetenango
  {
    customer: "sam",
    product: "guatemala-huehuetenango",
    rating: 4,
    daysAgo: 60,
    body: "Chocolatey everyday coffee. Nothing fancy, just reliably good every morning.",
  },
  {
    customer: "elena",
    product: "guatemala-huehuetenango",
    rating: 4,
    daysAgo: 27,
    body: "Milk chocolate and almond, nice with a splash of milk. Great value in the 1 kg bag.",
  },
  // Sumatra Gayo
  {
    customer: "marcus",
    product: "sumatra-gayo",
    rating: 4,
    daysAgo: 75,
    body: "Earthy and heavy, cedar and dark chocolate. Excellent in the French press.",
  },
  {
    customer: "aiko",
    product: "sumatra-gayo",
    rating: 2,
    daysAgo: 30,
    body: "Too earthy for me. Well roasted, but I prefer brighter coffees.",
  },
  // Morning Lane House Blend
  {
    customer: "jamie",
    product: "morning-lane-house-blend",
    rating: 5,
    daysAgo: 95,
    body: "Our household's daily coffee. Caramel and nuts, never bitter.",
  },
  {
    customer: "priya",
    product: "morning-lane-house-blend",
    rating: 4,
    daysAgo: 58,
    body: "Smooth and comforting. I use it in a drip machine and it's great.",
  },
  {
    customer: "sam",
    product: "morning-lane-house-blend",
    rating: 5,
    daysAgo: 36,
    body: "Best house blend I've bought online. Works for drip, press and espresso.",
  },
  {
    customer: "elena",
    product: "morning-lane-house-blend",
    rating: 4,
    daysAgo: 8,
    body: "Solid and sweet. I'd like a slightly darker roast, but it's a great all-rounder.",
  },
  // Laneway Espresso
  {
    customer: "marcus",
    product: "laneway-espresso",
    rating: 5,
    daysAgo: 88,
    body: "Syrupy shots with dark chocolate and cherry. Cuts through milk beautifully in a flat white.",
  },
  {
    customer: "aiko",
    product: "laneway-espresso",
    rating: 5,
    daysAgo: 45,
    body: "Forgiving to dial in on my home machine. Thick crema and very sweet.",
  },
  {
    customer: "jamie",
    product: "laneway-espresso",
    rating: 4,
    daysAgo: 16,
    body: "Lovely in milk drinks. A touch too intense as a straight espresso for me.",
  },
  // Swiss Water Decaf Colombia
  {
    customer: "priya",
    product: "swiss-water-decaf-colombia",
    rating: 4,
    daysAgo: 66,
    body: "The first decaf that doesn't taste like decaf. Brown sugar and apple.",
  },
  {
    customer: "elena",
    product: "swiss-water-decaf-colombia",
    rating: 5,
    daysAgo: 22,
    body: "My evening coffee now. Sweet and round, and I sleep fine.",
  },
  // Night Shift Dark Roast
  {
    customer: "sam",
    product: "night-shift-dark-roast",
    rating: 5,
    daysAgo: 50,
    body: "Exactly what I want from a dark roast: smoky cocoa without tasting burnt.",
  },
  {
    customer: "marcus",
    product: "night-shift-dark-roast",
    rating: 3,
    daysAgo: 14,
    body: "Good dark roast but a bit one-dimensional. Better with milk.",
  },
  // Ceramic Pour-Over Dripper
  {
    customer: "jamie",
    product: "ceramic-pour-over-dripper",
    rating: 5,
    daysAgo: 80,
    body: "Holds heat really well and the spiral ribs give an even drawdown. Beautiful glaze too.",
  },
  {
    customer: "aiko",
    product: "ceramic-pour-over-dripper",
    rating: 4,
    daysAgo: 40,
    body: "Great brewer. Preheat it, because the ceramic soaks up a lot of heat.",
  },
  {
    customer: "priya",
    product: "ceramic-pour-over-dripper",
    rating: 5,
    daysAgo: 10,
    body: "Sits perfectly on my mugs and the server. Easy to clean.",
  },
  // Classic French Press
  {
    customer: "sam",
    product: "classic-french-press",
    rating: 4,
    daysAgo: 55,
    body: "Solid frame and the mesh keeps the sludge down. The glass feels sturdier than my old one.",
  },
  {
    customer: "elena",
    product: "classic-french-press",
    rating: 5,
    daysAgo: 18,
    body: "Clean cup for a press. The four-layer filter really works.",
  },
  // Hand Burr Grinder
  {
    customer: "marcus",
    product: "hand-burr-grinder",
    rating: 5,
    daysAgo: 78,
    body: "Very consistent grind. 20 g in under a minute, as advertised. Huge upgrade from my blade grinder.",
  },
  {
    customer: "jamie",
    product: "hand-burr-grinder",
    rating: 4,
    daysAgo: 47,
    body: "Great grind quality. The clicks are easy to count. Takes some arm work for espresso.",
  },
  {
    customer: "aiko",
    product: "hand-burr-grinder",
    rating: 5,
    daysAgo: 9,
    body: "Feels premium and the grind is so uniform. Lives in my travel bag.",
  },
  // Gooseneck Electric Kettle
  {
    customer: "priya",
    product: "gooseneck-electric-kettle",
    rating: 5,
    daysAgo: 72,
    body: "Temperature hold is spot on and the pour is very controllable.",
  },
  {
    customer: "sam",
    product: "gooseneck-electric-kettle",
    rating: 4,
    daysAgo: 38,
    body: "Excellent kettle. The base is a little big for my counter, but the pour is perfect.",
  },
  {
    customer: "elena",
    product: "gooseneck-electric-kettle",
    rating: 5,
    daysAgo: 5,
    body: "Copper finish is gorgeous and it heats quickly. Pour-overs are so much easier now.",
  },
  // Stovetop Gooseneck Kettle
  {
    customer: "marcus",
    product: "stovetop-gooseneck-kettle",
    rating: 4,
    daysAgo: 44,
    body: "Simple and works on my induction hob. The handle gets warm, so use a cloth.",
  },
  // Stoneware Mug
  {
    customer: "aiko",
    product: "stoneware-mug",
    rating: 5,
    daysAgo: 62,
    body: "Lovely weight in the hand and the satin glaze feels great. The 12 oz is a proper mug.",
  },
  {
    customer: "jamie",
    product: "stoneware-mug",
    rating: 5,
    daysAgo: 29,
    body: "Bought two more as gifts. Keeps coffee warm longer than my old mugs.",
  },
  {
    customer: "sam",
    product: "stoneware-mug",
    rating: 4,
    daysAgo: 6,
    body: "Beautiful mug. The handle is a little small for big hands.",
  },
  // Cone Paper Filters
  {
    customer: "priya",
    product: "cone-paper-filters",
    rating: 5,
    daysAgo: 54,
    body: "No papery taste after a rinse, and the flow is consistent. Good price for 200.",
  },
  {
    customer: "elena",
    product: "cone-paper-filters",
    rating: 4,
    daysAgo: 25,
    body: "Fit my dripper perfectly. They do what filters should.",
  },
  // Coffee Scale with Timer
  {
    customer: "marcus",
    product: "coffee-scale-with-timer",
    rating: 5,
    daysAgo: 66,
    body: "Fast and accurate, and the auto timer is handy for espresso. Fits on my drip tray.",
  },
  {
    customer: "aiko",
    product: "coffee-scale-with-timer",
    rating: 4,
    daysAgo: 21,
    body: "Great scale. The battery lasts weeks. Wish the buttons were a little firmer.",
  },
  // Double-Wall Glass Cup
  {
    customer: "priya",
    product: "double-wall-glass-cup",
    rating: 4,
    daysAgo: 31,
    body: "Looks stunning with a latte and stays cool to hold. Hand-wash only, carefully.",
  },
];
