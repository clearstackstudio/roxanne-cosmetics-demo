// ─────────────────────────────────────────────────────────────────────────────
// Roxanne Cosmetics — product catalog.
//
// ★ PLACEHOLDER DATA ★
// Every product below is a PLACEHOLDER: the names, descriptions, and prices were
// invented for the click-through demo because no real product list was provided.
// To go live, replace the entries in PRODUCTS (or import them from a real
// source) and set `placeholder: false` on each real product. No other file needs
// to change: the shop, product pages, cart, and checkout all read from here.
//
// Each product gets an elegant generated visual (see components/ProductVisual.tsx)
// built from `visual.hue` + `visual.shape` — no photo files needed. When real
// photos exist, add `photo: "/products/xyz.jpg"` to the product and drop the
// file in `public/products/`; the photo will be used automatically.
// ─────────────────────────────────────────────────────────────────────────────

export type CategoryId = 'perfume' | 'cologne' | 'skincare' | 'makeup';

export interface Category {
  id: CategoryId;
  name: string;
  tagline: string;
}

export const CATEGORIES: Category[] = [
  { id: 'perfume', name: 'Perfumes', tagline: 'Eau de parfum & eau de toilette for her' },
  { id: 'cologne', name: 'Colognes', tagline: 'Bold, fresh scents for him' },
  { id: 'skincare', name: 'Skincare', tagline: 'Cleanse, hydrate, glow' },
  { id: 'makeup', name: 'Makeup', tagline: 'Color that lasts all day' },
];

export type VisualShape = 'flacon' | 'tall' | 'jar' | 'tube';

export interface Product {
  id: string;
  name: string;
  category: CategoryId;
  /** Who the product is for — drives the For Her / For Him filters. */
  audience: 'women' | 'men' | 'unisex';
  /** Price in dollars. */
  price: number;
  size: string;
  description: string;
  notes?: string[];
  featured?: boolean;
  /** True while this product is demo placeholder data. */
  placeholder: boolean;
  /** Optional real photo path, e.g. "/products/velours-de-rose.jpg". */
  photo?: string;
  /** Drives the generated placeholder visual. */
  visual: { hue: number; shape: VisualShape };
}

export const PRODUCTS: Product[] = [
  // ── Perfumes ──────────────────────────────────────────────────────────────
  {
    id: 'velours-de-rose',
    name: 'Velours de Rose',
    category: 'perfume',
    audience: 'women',
    price: 88,
    size: '50 ml · Eau de Parfum',
    description:
      'A velvety Damask rose wrapped in soft jasmine and warm amber — romantic, timeless, unforgettable.',
    notes: ['Damask rose', 'Jasmine', 'Amber'],
    featured: true,
    placeholder: true,
    visual: { hue: 340, shape: 'flacon' },
  },
  {
    id: 'nuit-dor',
    name: "Nuit d'Or",
    category: 'perfume',
    audience: 'women',
    price: 96,
    size: '50 ml · Eau de Parfum',
    description:
      'Smoky oud and golden vanilla over a whisper of saffron. An evening scent with real presence.',
    notes: ['Oud', 'Vanilla', 'Saffron'],
    featured: true,
    placeholder: true,
    visual: { hue: 38, shape: 'flacon' },
  },
  {
    id: 'fleur-blanche',
    name: 'Fleur Blanche',
    category: 'perfume',
    audience: 'women',
    price: 72,
    size: '30 ml · Eau de Parfum',
    description:
      'Sunlit orange blossom and neroli on a bed of clean white musk. Fresh, feminine, effortless.',
    notes: ['Orange blossom', 'Neroli', 'White musk'],
    placeholder: true,
    visual: { hue: 45, shape: 'tall' },
  },
  {
    id: 'citrus-eclat',
    name: 'Citrus Éclat',
    category: 'perfume',
    audience: 'unisex',
    price: 58,
    size: '50 ml · Eau de Toilette',
    description:
      'Sparkling bergamot and Sicilian lemon lifted by white tea. The everyday brightener.',
    notes: ['Bergamot', 'Lemon', 'White tea'],
    placeholder: true,
    visual: { hue: 85, shape: 'tall' },
  },

  // ── Colognes ──────────────────────────────────────────────────────────────
  {
    id: 'bois-sauvage',
    name: 'Bois Sauvage',
    category: 'cologne',
    audience: 'men',
    price: 92,
    size: '50 ml · Eau de Parfum',
    description:
      'Cedarwood and vetiver grounded with crisp bergamot. Confident woods, never heavy.',
    notes: ['Cedar', 'Vetiver', 'Bergamot'],
    featured: true,
    placeholder: true,
    visual: { hue: 150, shape: 'flacon' },
  },
  {
    id: 'marine-bleu',
    name: 'Marine Bleu',
    category: 'cologne',
    audience: 'men',
    price: 64,
    size: '50 ml · Eau de Toilette',
    description:
      'Sea salt air, grapefruit, and clary sage. Clean and athletic — the coastal classic.',
    notes: ['Sea salt', 'Grapefruit', 'Sage'],
    placeholder: true,
    visual: { hue: 205, shape: 'tall' },
  },
  {
    id: 'cuir-noir',
    name: 'Cuir Noir',
    category: 'cologne',
    audience: 'men',
    price: 98,
    size: '50 ml · Eau de Parfum',
    description:
      'Dark leather, pipe tobacco, and amber. Bold after-hours character for those who own the room.',
    notes: ['Leather', 'Tobacco', 'Amber'],
    placeholder: true,
    visual: { hue: 20, shape: 'flacon' },
  },

  // ── Skincare ──────────────────────────────────────────────────────────────
  {
    id: 'eclat-vitamin-c',
    name: 'Éclat Vitamin C Serum',
    category: 'skincare',
    audience: 'unisex',
    price: 46,
    size: '30 ml',
    description:
      '15% stabilized vitamin C with hyaluronic acid for visible brightness in two weeks.',
    featured: true,
    placeholder: true,
    visual: { hue: 40, shape: 'tall' },
  },
  {
    id: 'hydra-rose',
    name: 'Hydra Rose Moisturizer',
    category: 'skincare',
    audience: 'unisex',
    price: 38,
    size: '50 ml',
    description:
      'Whipped rose-water cream with squalane. 72-hour hydration, zero grease.',
    placeholder: true,
    visual: { hue: 335, shape: 'jar' },
  },
  {
    id: 'gentle-foam',
    name: 'Gentle Foam Cleanser',
    category: 'skincare',
    audience: 'unisex',
    price: 24,
    size: '150 ml',
    description:
      'Amino-acid foam that melts away the day without stripping. For all skin types.',
    placeholder: true,
    visual: { hue: 190, shape: 'tube' },
  },
  {
    id: 'revive-eye',
    name: 'Revive Eye Cream',
    category: 'skincare',
    audience: 'unisex',
    price: 34,
    size: '15 ml',
    description:
      'Caffeine + peptides to de-puff and brighten tired eyes. A little goes a long way.',
    placeholder: true,
    visual: { hue: 270, shape: 'jar' },
  },

  // ── Makeup ────────────────────────────────────────────────────────────────
  {
    id: 'velvet-matte-rouge',
    name: 'Velvet Matte Lipstick — Rouge',
    category: 'makeup',
    audience: 'unisex',
    price: 22,
    size: '3.5 g',
    description:
      'A true-blue red in a weightless matte that stays through coffee and conversation.',
    featured: true,
    placeholder: true,
    visual: { hue: 350, shape: 'tube' },
  },
  {
    id: 'lumiere-foundation',
    name: 'Lumière Foundation',
    category: 'makeup',
    audience: 'unisex',
    price: 36,
    size: '30 ml · 12 shades',
    description:
      'Skin-like medium coverage with niacinamide. (Demo note: shade picker ships with the real catalog.)',
    placeholder: true,
    visual: { hue: 30, shape: 'tall' },
  },
  {
    id: 'blush-poudre-peche',
    name: 'Blush Poudre — Pêche',
    category: 'makeup',
    audience: 'unisex',
    price: 26,
    size: '8 g',
    description:
      'Silky peach powder blush with a lit-from-within finish. Buildable, never chalky.',
    placeholder: true,
    visual: { hue: 18, shape: 'jar' },
  },
  {
    id: 'mascara-volume-noir',
    name: 'Mascara Volume Noir',
    category: 'makeup',
    audience: 'unisex',
    price: 24,
    size: '8 ml',
    description:
      'Tubing mascara for dramatic volume that never smudges — and washes off with warm water.',
    placeholder: true,
    visual: { hue: 220, shape: 'tube' },
  },
  {
    id: 'discovery-set',
    name: 'Discovery Set — Six Icons',
    category: 'perfume',
    audience: 'unisex',
    price: 28,
    size: '6 × 2 ml',
    description:
      'Six bestselling scents in travel sprays. Find your signature — the $28 applies to a full bottle.',
    featured: true,
    placeholder: true,
    visual: { hue: 300, shape: 'flacon' },
  },
];

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function productsIn(category: CategoryId): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}

export function formatPrice(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}
