import {
  Armchair,
  Backpack,
  Bean,
  Bike,
  Bone,
  Camera,
  Cat,
  Coffee,
  Compass,
  CookingPot,
  Dog,
  Dumbbell,
  Fish,
  Flame,
  Footprints,
  Headphones,
  Keyboard,
  LampDesk,
  Laptop,
  Leaf,
  Milk,
  Monitor,
  Mountain,
  MountainSnow,
  Mouse,
  PawPrint,
  Shirt,
  Snowflake,
  Sprout,
  Tent,
  TreePine,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { hash } from "@/lib/site-brand";

/** Ordered keyword → icon rules; first match wins. */
const RULES: [RegExp, LucideIcon, string][] = [
  [/\b(boot|shoe|sneaker|footwear|trail runner)/i, Footprints, "Footwear"],
  [/\b(tent|shelter|camp(ing)?)\b/i, Tent, "Shelter"],
  [/\b(backpack|pack|daypack|bag)\b/i, Backpack, "Packs"],
  [/\b(layer|jacket|clothes|clothing|fleece|shirt|apparel)/i, Shirt, "Clothing"],
  [/\b(winter|snow|cold)\b/i, Snowflake, "Cold weather"],
  [/\b(stove|cook)/i, CookingPot, "Camp kitchen"],
  [/\b(fire|heat)/i, Flame, "Camp kitchen"],
  [/\b(navigation|compass|map)\b/i, Compass, "Navigation"],
  [/\b(espresso|coffee|latte|brew|pour.?over|aeropress|french press)/i, Coffee, "Brewing"],
  [/\b(grinder|bean|roast)/i, Bean, "Grinders & beans"],
  [/\b(milk|frother)/i, Milk, "Milk & frothers"],
  [/\b(kettle|tea)\b/i, Leaf, "Kettles & tea"],
  [/\b(monitor|display|screen)/i, Monitor, "Displays"],
  [/\b(keyboard)/i, Keyboard, "Keyboards"],
  [/\b(mouse|trackpad)/i, Mouse, "Mice"],
  [/\b(chair|ergonomic|seat)/i, Armchair, "Seating"],
  [/\b(desk|lamp|lighting|office)/i, LampDesk, "Desk setup"],
  [/\b(laptop|notebook|computer)/i, Laptop, "Computers"],
  [/\b(headphone|headset|earbud|audio|microphone)/i, Headphones, "Audio"],
  [/\b(webcam|camera)/i, Camera, "Video"],
  [/\b(dog|puppy|leash|harness)/i, Dog, "Dogs"],
  [/\b(cat|kitten|litter)/i, Cat, "Cats"],
  [/\b(chew|treat|toy)/i, Bone, "Toys & treats"],
  [/\b(aquarium|fish)/i, Fish, "Aquarium"],
  [/\b(pet)/i, PawPrint, "Pets"],
  [/\b(bike|cycling)/i, Bike, "Cycling"],
  [/\b(gym|fitness|workout)/i, Dumbbell, "Fitness"],
  [/\b(kayak|paddle|swim|beach)/i, Waves, "Water"],
  [/\b(garden|plant)/i, Sprout, "Garden"],
  [/\b(alpine|mountaineering)/i, MountainSnow, "Alpine"],
  [/\b(hik|trek|trail|outdoor|backpacking)/i, Mountain, "Hiking"],
  [/\b(forest|wood)/i, TreePine, "Outdoors"],
];

const FALLBACKS: LucideIcon[] = [Compass, Leaf, Mountain, Sprout];

function match(texts: (string | null | undefined)[]): [LucideIcon, string] | null {
  for (const t of texts) {
    if (!t) continue;
    for (const [re, icon, label] of RULES) if (re.test(t)) return [icon, label];
  }
  return null;
}

export function nicheIcon(...texts: (string | null | undefined)[]): LucideIcon {
  const m = match(texts);
  if (m) return m[0];
  const key = texts.filter(Boolean).join(" ");
  return FALLBACKS[hash(key) % FALLBACKS.length];
}

/** Short editorial category for chips, e.g. "Footwear" or "Brewing". */
export function categoryFor(...texts: (string | null | undefined)[]): string {
  const m = match(texts);
  if (m) return m[1];
  const kw = texts.find(Boolean);
  if (!kw) return "Guide";
  if (/^(how|what|why|when)\b/i.test(kw)) return "How-to";
  if (/\b(best|top|vs|review)\b/i.test(kw)) return "Buying guide";
  return "Guide";
}
