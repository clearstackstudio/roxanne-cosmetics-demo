// Server-side order pricing — the single source of truth for what an order costs.
// The checkout API recomputes every total from the catalog data here; the
// browser-sent amount is never trusted.

import { findProduct } from '@/data/products';

export interface RawOrderLine {
  productId: unknown;
  qty: unknown;
}

export interface PricedLine {
  productId: string;
  name: string;
  qty: number;
  unitCents: number;
  lineCents: number;
  summary: string;
}

export interface PricedOrder {
  lines: PricedLine[];
  totalCents: number;
}

export function priceOrder(rawLines: unknown): PricedOrder {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new Error('Your cart is empty.');
  }
  if (rawLines.length > 50) throw new Error('Too many line items.');

  const lines: PricedLine[] = rawLines.map((raw) => {
    const r = raw as RawOrderLine;
    if (typeof r.productId !== 'string') throw new Error('Invalid cart item.');
    const product = findProduct(r.productId);
    if (!product) throw new Error('Unknown product in cart.');
    const qty = Number(r.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw new Error('Invalid quantity.');

    const unitCents = Math.round(product.price * 100);
    return {
      productId: product.id,
      name: product.name,
      qty,
      unitCents,
      lineCents: unitCents * qty,
      summary: product.size,
    };
  });

  const totalCents = lines.reduce((s, l) => s + l.lineCents, 0);
  if (totalCents <= 0) throw new Error('Invalid order total.');
  return { lines, totalCents };
}
