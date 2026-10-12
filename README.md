# Roxanne Cosmetics — demo boutique

A click-through demo site for **Roxanne Cosmetics** (cosmetics + perfume/cologne shop),
built with Next.js 16 + Tailwind CSS 4. **Product information only** — by the owner's
decision there is no cart and no checkout; purchases happen in the shop.

## What's placeholder vs real

| Area | Status |
|---|---|
| Shop name, branding | Real: "Roxanne Cosmetics" |
| Products (16), descriptions, prices | **PLACEHOLDER** — invented for the demo. See `data/products.ts`. |
| Product visuals | Generated SVG (elegant bottle/jar/tube per product). Replace with real photos by adding `photo: "/products/xyz.jpg"` + dropping the file in `public/products/`. |
| Online ordering | **None** — no cart, no checkout (owner's decision, 2026-10-12). |
| Store address / hours | Placeholder text in the footer. |

## Collecting the real catalog: the inventory scanner

The owner builds the real product list with the barcode scanner at **`/inventory`**
(staff tool, not linked from the public site, `noindex`):

1. Open `/inventory` on a phone, tap **Start scanning**, point the camera at each
   product's barcode. Name/brand/size fill in from Open Beauty Facts (fallback:
   Open Food Facts) when the barcode is known; anything unrecognized is typed in.
2. Add the price and quantity per product. Scanning a barcode that's already in
   the list adds one more unit. The list persists in the phone's browser
   (localStorage) between sessions.
3. **Export CSV or JSON** and send the file to the developer — the JSON maps
   directly onto the catalog fields below (including `barcode`).

## Swapping in the real catalog

Everything product-related lives in **`data/products.ts`** — one file. Replace the `PRODUCTS`
array entries (or import from the inventory JSON), keep the same shape:

```ts
{
  id: 'unique-slug', name: '...', category: 'fragrance' | 'skincare' | 'makeup',
  price: 88, size: '50 ml · Eau de Parfum', description: '...',
  notes: ['Rose', 'Jasmine'],   // optional — shown as chips on fragrance pages
  featured: true,               // optional — shows on the homepage
  placeholder: false,           // set false for real products (hides the "Demo" badges)
  barcode: '012345678905',      // optional — from the inventory scanner
  photo: '/products/xyz.jpg',   // optional — real photo overrides the generated visual
  visual: { hue: 340, shape: 'flacon' },  // fallback visual while photo is missing
}
```

Categories are editable in `CATEGORIES` in the same file. No other file needs to change.

## Local development

```bash
npm install
npm run dev                  # http://localhost:3000
```

No environment variables are needed — the site has no server-side integrations,
and the barcode lookup runs from the browser against the public Open Facts APIs.

## Deploy

Import this repo at https://vercel.com/new — framework preset is auto-detected (Next.js).
Pushes to `main` deploy automatically.

## Dark mode

Automatic from day one: follows the OS `prefers-color-scheme` via Tailwind `dark:` variants
(stone-950 page / stone-900 surfaces in dark mode).
