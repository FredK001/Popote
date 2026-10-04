import type { SoftTone } from "@/components/ui/IngredientTile";

export const FAMILIES = ["legume", "fruit", "laitage", "viande", "poisson", "epice", "feculent", "autre"] as const;
export type Family = (typeof FAMILIES)[number];

/** Shopping-list aisles (phase 5 groups the list by aisle). */
export const AISLES = [
  "fruits-legumes", "cremerie", "boucherie", "poissonnerie", "epicerie-salee",
  "epicerie-sucree", "boulangerie", "surgeles", "autre",
] as const;
export type Aisle = (typeof AISLES)[number];

type Entry = {
  label: string;
  family: Family;
  aisle: Aisle;
  /** Words matched in a typed ingredient name (lowercase, accents kept). */
  words: string[];
  tint?: SoftTone;
};

const FAMILY_TINT: Record<Family, SoftTone> = {
  legume: "sauge", fruit: "tomate", laitage: "ciel", viande: "tomate",
  poisson: "ciel", epice: "laiton", feculent: "abricot", autre: "abricot",
};

/**
 * Closed list of ingredient keys. Each key has a flat picto `g-{key}` in the sprite.
 * The AI picks `ingredient_key` from these keys only. Family keys are generic fallbacks.
 * Order matters for name matching: specific entries before generic words.
 */
export const INGREDIENTS = {
  // Specific ingredients
  "pomme-de-terre": { label: "pomme de terre", family: "feculent", aisle: "fruits-legumes", words: ["pomme de terre", "pommes de terre", "patate"], tint: "abricot" },
  pate: { label: "pâte à tarte", family: "feculent", aisle: "cremerie", words: ["pâte feuilletée", "pâte brisée", "pâte sablée", "pâte à pizza", "pâte à tarte"], tint: "laiton" },
  pates: { label: "pâtes", family: "feculent", aisle: "epicerie-salee", words: ["pâtes", "spaghetti", "tagliatelle", "penne", "macaroni", "farfalle", "lasagne", "nouilles"] },
  pomme: { label: "pomme", family: "fruit", aisle: "fruits-legumes", words: ["pomme"] },
  citron: { label: "citron", family: "fruit", aisle: "fruits-legumes", words: ["citron"], tint: "laiton" },
  banane: { label: "banane", family: "fruit", aisle: "fruits-legumes", words: ["banane"], tint: "laiton" },
  fraise: { label: "fraise", family: "fruit", aisle: "fruits-legumes", words: ["fraise"] },
  tomate: { label: "tomate", family: "legume", aisle: "fruits-legumes", words: ["tomate"], tint: "tomate" },
  oignon: { label: "oignon", family: "legume", aisle: "fruits-legumes", words: ["oignon", "échalote", "echalote"], tint: "abricot" },
  ail: { label: "ail", family: "legume", aisle: "fruits-legumes", words: ["ail"], tint: "laiton" },
  carotte: { label: "carotte", family: "legume", aisle: "fruits-legumes", words: ["carotte"], tint: "abricot" },
  courgette: { label: "courgette", family: "legume", aisle: "fruits-legumes", words: ["courgette", "concombre"] },
  champignon: { label: "champignon", family: "legume", aisle: "fruits-legumes", words: ["champignon", "cèpe", "girolle"], tint: "laiton" },
  salade: { label: "salade", family: "legume", aisle: "fruits-legumes", words: ["salade", "laitue", "épinard", "epinard", "roquette", "mâche"] },
  herbes: { label: "herbes", family: "epice", aisle: "fruits-legumes", words: ["persil", "basilic", "coriandre", "ciboulette", "thym", "romarin", "menthe", "estragon", "aneth", "laurier", "herbes"], tint: "sauge" },
  oeuf: { label: "œuf", family: "laitage", aisle: "cremerie", words: ["œuf", "oeuf", "jaune d", "blanc d"], tint: "abricot" },
  lait: { label: "lait", family: "laitage", aisle: "cremerie", words: ["lait"] },
  creme: { label: "crème", family: "laitage", aisle: "cremerie", words: ["crème", "creme", "mascarpone"] },
  beurre: { label: "beurre", family: "laitage", aisle: "cremerie", words: ["beurre"], tint: "abricot" },
  fromage: { label: "fromage", family: "laitage", aisle: "cremerie", words: ["fromage", "gruyère", "emmental", "comté", "parmesan", "mozzarella", "chèvre", "feta", "ricotta", "reblochon"], tint: "laiton" },
  yaourt: { label: "yaourt", family: "laitage", aisle: "cremerie", words: ["yaourt", "yogourt", "fromage blanc", "skyr"], tint: "prune" },
  poulet: { label: "poulet", family: "viande", aisle: "boucherie", words: ["poulet", "volaille", "dinde", "canard"], tint: "abricot" },
  boeuf: { label: "bœuf", family: "viande", aisle: "boucherie", words: ["bœuf", "boeuf", "steak", "veau", "agneau", "viande hachée"] },
  lardons: { label: "lardons", family: "viande", aisle: "boucherie", words: ["lardon", "bacon", "jambon", "chorizo", "saucisse", "porc", "pancetta"] },
  saumon: { label: "saumon", family: "poisson", aisle: "poissonnerie", words: ["saumon", "truite"], tint: "abricot" },
  crevette: { label: "crevette", family: "poisson", aisle: "poissonnerie", words: ["crevette", "gambas", "moule", "saint-jacques", "calamar"], tint: "tomate" },
  farine: { label: "farine", family: "feculent", aisle: "epicerie-sucree", words: ["farine", "maïzena", "fécule", "levure"], tint: "laiton" },
  sucre: { label: "sucre", family: "autre", aisle: "epicerie-sucree", words: ["sucre", "cassonade", "vergeoise"], tint: "prune" },
  sel: { label: "sel", family: "epice", aisle: "epicerie-salee", words: ["sel"], tint: "ciel" },
  poivre: { label: "poivre", family: "epice", aisle: "epicerie-salee", words: ["poivre"] },
  huile: { label: "huile", family: "autre", aisle: "epicerie-salee", words: ["huile"], tint: "laiton" },
  chocolat: { label: "chocolat", family: "autre", aisle: "epicerie-sucree", words: ["chocolat", "cacao"], tint: "abricot" },
  miel: { label: "miel", family: "autre", aisle: "epicerie-sucree", words: ["miel", "sirop d'érable"], tint: "laiton" },
  cannelle: { label: "cannelle", family: "epice", aisle: "epicerie-sucree", words: ["cannelle"], tint: "sauge" },
  riz: { label: "riz", family: "feculent", aisle: "epicerie-salee", words: ["riz", "risotto", "quinoa", "boulgour", "semoule"], tint: "ciel" },
  pain: { label: "pain", family: "feculent", aisle: "boulangerie", words: ["pain", "baguette", "brioche", "chapelure"] },
  // Family generics
  legume: { label: "légume", family: "legume", aisle: "fruits-legumes", words: ["poireau", "brocoli", "chou", "aubergine", "poivron", "haricot", "petits pois", "céleri", "radis", "betterave", "navet", "potiron", "courge", "butternut", "asperge", "artichaut", "fenouil", "légume"] },
  fruit: { label: "fruit", family: "fruit", aisle: "fruits-legumes", words: ["orange", "poire", "pêche", "abricot", "cerise", "framboise", "myrtille", "mangue", "ananas", "raisin", "prune", "kiwi", "rhubarbe", "fruit"] },
  laitage: { label: "produit laitier", family: "laitage", aisle: "cremerie", words: [] },
  viande: { label: "viande", family: "viande", aisle: "boucherie", words: ["viande", "lapin", "merguez", "côte"] },
  poisson: { label: "poisson", family: "poisson", aisle: "poissonnerie", words: ["poisson", "cabillaud", "thon", "sardine", "colin", "lieu", "dorade", "bar ", "maquereau", "anchois"] },
  epice: { label: "épice", family: "epice", aisle: "epicerie-salee", words: ["paprika", "cumin", "curry", "curcuma", "muscade", "piment", "gingembre", "vanille", "épice", "moutarde"] },
  feculent: { label: "féculent", family: "feculent", aisle: "epicerie-salee", words: ["lentille", "pois chiche", "polenta", "flocons d'avoine", "avoine"] },
  autre: { label: "autre", family: "autre", aisle: "autre", words: [] },
} satisfies Record<string, Entry>;

export type IngredientKey = keyof typeof INGREDIENTS;
export const INGREDIENT_KEYS = Object.keys(INGREDIENTS) as [IngredientKey, ...IngredientKey[]];

export function isIngredientKey(key: unknown): key is IngredientKey {
  return typeof key === "string" && key in INGREDIENTS;
}

export function tintFor(key: IngredientKey): SoftTone {
  const entry: Entry = INGREDIENTS[key];
  return entry.tint ?? FAMILY_TINT[entry.family];
}

export function aisleFor(key: IngredientKey): Aisle {
  return INGREDIENTS[key].aisle;
}
