# Roxanne Cosmetics — demo boutique

A click-through demo e-commerce site for **Roxanne Cosmetics** (cosmetics + perfume/cologne shop),
built with Next.js 16 + Tailwind CSS 4. Follows the Tea Brick demo playbook:
homepage → catalog → product detail → bag → Square **sandbox** checkout (no real money).

## What's placeholder vs real

| Area | Status |
|---|---|
| Shop name, branding | Real: "Roxanne Cosmetics" |
| Products (16), descriptions, prices | **PLACEHOLDER** — invented for the demo. See `data/products.ts`. |
| Product visuals | Generated SVG (elegant bottle/jar/tube per product). Replace with real photos by adding `photo: "/products/xyz.jpg"` + dropping the file in `public/products/`. |
| Checkout flow (cart → Square card form → order + payment) | Real code, wired to **Square sandbox**. |
| Square credentials | **Not configured** — the checkout page shows "demo mode" until sandbox keys are added. |
| Store address / hours | Placeholder text in the footer. |

## Swapping in the real catalog

Everything product-related lives in **`data/products.ts`** — one file. Replace the `PRODUCTS`
array entries (or import from a real source), keep the same shape:

```ts
{
  id: 'unique-slug', name: '...', category: 'perfume' | 'cologne' | 'skincare' | 'makeup',
  price: 88, size: '50 ml · Eau de Parfum', description: '...',
  notes: ['Rose', 'Jasmine'],   // optional — shown as chips on fragrance pages
  featured: true,               // optional — shows on the homepage
  placeholder: false,           // set false for real products (hides the "Demo" badges)
  photo: '/products/xyz.jpg',   // optional — real photo overrides the generated visual
  visual: { hue: 340, shape: 'flacon' },  // fallback visual while photo is missing
}
```

Categories are editable in `CATEGORIES` in the same file. No other file needs to change.

## Square sandbox setup (shop owner)

1. Create a free app at https://developer.squareup.com/apps (sandbox test account is automatic).
2. Copy: sandbox **access token**, **Application ID**, and a sandbox **Location ID**.
3. Add as Vercel environment variables (or `.env.local` for local dev — see `.env.example`):

   - `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT=sandbox`
   - `NEXT_PUBLIC_SQUARE_APPLICATION_ID`, `NEXT_PUBLIC_SQUARE_LOCATION_ID`, `NEXT_PUBLIC_SQUARE_ENVIRONMENT=sandbox`

4. Redeploy. The checkout page will render the secure Square card form.
5. Test card: `4111 1111 1111 1111`, any future expiry, any CVV — no real charge.

How it works: the browser tokenizes the card with the Square Web Payments SDK; the
server (`app/api/checkout/route.ts`) **recomputes the total from `data/products.ts`** (never
trusts the browser amount), creates a Square order with line items + pickup fulfillment,
then charges the card. Failed payments auto-cancel the unpaid order. Idempotency keys
guard against double charges.

For production later: flip both `SQUARE_ENVIRONMENT` vars to `production` and use
production credentials — plus a real tax/shipping decision (currently untaxed, pickup only).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in sandbox keys to test checkout
npm run dev                  # http://localhost:3000
```

## Deploy

Import this repo at https://vercel.com/new — framework preset is auto-detected (Next.js).
Add the Square env vars in the Vercel project settings (all environments) before the first
deploy that needs checkout, or deploy without them and add later (checkout shows demo mode).

## Dark mode

Automatic from day one: follows the OS `prefers-color-scheme` via Tailwind `dark:` variants
(stone-950 page / stone-900 surfaces in dark mode).
