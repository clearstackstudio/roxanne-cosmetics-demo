export const dynamic = 'force-dynamic';

/**
 * GET /api/lookup/<barcode> → product identity + online price hints.
 *
 * Bryant's direction (2026-10-13): scanning should look up pricing,
 * not just the product name. Sources, all free and keyless:
 * - Open Beauty Facts → Open Food Facts for identity (name/brand/size).
 * - UPCitemdb trial endpoint for retailer offers — those become price
 *   SUGGESTIONS in the scanner form; the price that gets saved is
 *   always the shop's own, confirmed by the person scanning.
 * Trial quota is 100 lookups/day; results are cached in memory and a
 * barcode is only ever looked up once — afterwards it lives in the
 * inventory database.
 */

type Category = 'fragrance' | 'skincare' | 'makeup' | '';

interface PriceHint {
  merchant: string;
  price: number;
}

interface LookupResult {
  found: boolean;
  name: string;
  brand: string;
  size: string;
  category: Category;
  priceHints: PriceHint[];
}

const EMPTY: LookupResult = {
  found: false,
  name: '',
  brand: '',
  size: '',
  category: '',
  priceHints: [],
};

const cache = new Map<string, LookupResult>();

function guessCategory(p: Record<string, unknown>): Category {
  const tags = [
    ...(Array.isArray(p.categories_tags) ? p.categories_tags : []),
    typeof p.categories === 'string' ? p.categories : '',
  ]
    .join(' ')
    .toLowerCase();
  if (/perfume|fragrance|cologne|eau-de|parfum/.test(tags)) return 'fragrance';
  if (/makeup|make-up|lipstick|mascara|foundation|cosmetic/.test(tags)) return 'makeup';
  if (/skin|cream|lotion|serum|face|body|hair|shampoo|soap/.test(tags)) return 'skincare';
  return '';
}

async function openFacts(code: string) {
  const urls = [
    `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const j = await res.json();
      if (j?.status === 1 && j.product) {
        const p = j.product as Record<string, unknown>;
        return {
          name: typeof p.product_name === 'string' ? p.product_name : '',
          brand: typeof p.brands === 'string' ? p.brands.split(',')[0].trim() : '',
          size: typeof p.quantity === 'string' ? p.quantity : '',
          category: guessCategory(p),
        };
      }
    } catch {
      // try the next source
    }
  }
  return null;
}

async function upcItemDb(code: string) {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const j = await res.json();
    const item = Array.isArray(j?.items) ? j.items[0] : null;
    if (!item) return null;
    const hints: PriceHint[] = [];
    const seen = new Set<string>();
    const offers = Array.isArray(item.offers) ? item.offers : [];
    for (const o of offers as Record<string, unknown>[]) {
      const price = typeof o.price === 'number' ? o.price : Number(o.price);
      const merchant = typeof o.merchant === 'string' ? o.merchant : '';
      if (!merchant || !Number.isFinite(price) || price <= 0 || seen.has(merchant)) {
        continue;
      }
      seen.add(merchant);
      hints.push({ merchant, price: Math.round(price * 100) / 100 });
    }
    hints.sort((a, b) => a.price - b.price);
    return {
      name: typeof item.title === 'string' ? item.title : '',
      brand: typeof item.brand === 'string' ? item.brand : '',
      size: typeof item.size === 'string' ? item.size : '',
      priceHints: hints.slice(0, 6),
    };
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const clean = code.replace(/[^0-9Xx]/g, '').slice(0, 32);
  if (!clean) return Response.json(EMPTY);
  const hit = cache.get(clean);
  if (hit) return Response.json(hit);

  const [identity, priced] = await Promise.all([openFacts(clean), upcItemDb(clean)]);
  const result: LookupResult = {
    found: Boolean(identity || priced?.priceHints.length || priced?.name),
    name: identity?.name || priced?.name || '',
    brand: identity?.brand || priced?.brand || '',
    size: identity?.size || priced?.size || '',
    category: identity?.category ?? '',
    priceHints: priced?.priceHints ?? [],
  };
  // Cache real hits for the life of the instance; misses stay retryable.
  if (result.found) cache.set(clean, result);
  return Response.json(result);
}
