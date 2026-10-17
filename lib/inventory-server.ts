import { createHmac, timingSafeEqual } from 'crypto';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Server-side inventory store (Neon Postgres) + staff-passcode auth.
 *
 * Bryant's direction (2026-10-13): the scanner exists to build the
 * shop's real product inventory — scans must save to a database, not
 * just the phone's browser storage.
 *
 * Configuration (Vercel env vars, set by Bryant in the dashboard):
 * - DATABASE_URL — added automatically when the Neon database is
 *   created/connected to this project from the Storage tab.
 * - INVENTORY_PASSCODE — the staff code for /inventory (Bryant picks
 *   it; it is never stored in the repo).
 *
 * Until both exist, the API answers 503 and the scanner page falls
 * back to its original phone-only mode, so field work never blocks
 * on setup.
 */

export interface InventoryRow {
  id: number;
  barcode: string;
  name: string;
  brand: string;
  size: string;
  price: string | null; // NUMERIC comes back as a string from pg
  cost: string | null; // what the shop paid per unit (NUMERIC → string)
  vendor: string; // who the shop buys it from
  qty: number;
  category: string;
  audience: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  barcode: string;
  name: string;
  brand: string;
  size: string;
  price: number | null; // selling price
  cost: number | null;
  vendor: string;
  qty: number;
  category: string;
  audience: string;
}

export function rowToItem(r: InventoryRow): InventoryItem {
  return {
    id: Number(r.id),
    barcode: r.barcode,
    name: r.name,
    brand: r.brand,
    size: r.size,
    price: r.price === null ? null : Number(r.price),
    cost: r.cost === null || r.cost === undefined ? null : Number(r.cost),
    vendor: r.vendor ?? '',
    qty: r.qty,
    category: r.category,
    audience: r.audience,
  };
}

type Sql = NeonQueryFunction<false, false>;

let sqlCache: Sql | null = null;

export function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!sqlCache) sqlCache = neon(url);
  return sqlCache;
}

let tableReady: Promise<void> | null = null;

/** Create the inventory table on first use — no migration step to run. */
export function ensureTable(sql: Sql): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS inventory (
          id BIGSERIAL PRIMARY KEY,
          barcode TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL DEFAULT '',
          brand TEXT NOT NULL DEFAULT '',
          size TEXT NOT NULL DEFAULT '',
          price NUMERIC(10, 2),
          qty INTEGER NOT NULL DEFAULT 1,
          category TEXT NOT NULL DEFAULT '',
          audience TEXT NOT NULL DEFAULT 'unisex',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS inventory_barcode_uniq
        ON inventory (barcode) WHERE barcode <> ''
      `;
      // 2026-10-16: the shop tracks just cost, selling price, qty and
      // vendor per item — add the two fields the original table lacked.
      await sql`
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 2)
      `;
      await sql`
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS vendor TEXT NOT NULL DEFAULT ''
      `;
    })();
    // If creation failed (e.g. transient), allow a retry next request.
    tableReady.catch(() => {
      tableReady = null;
    });
  }
  return tableReady;
}

// --- Staff passcode -------------------------------------------------

export const AUTH_COOKIE = 'roxanne_inventory';

export function passcodeConfigured(): boolean {
  return Boolean(process.env.INVENTORY_PASSCODE);
}

/** The cookie stores an HMAC of a fixed label, never the passcode. */
export function expectedToken(): string | null {
  const p = process.env.INVENTORY_PASSCODE;
  if (!p) return null;
  return createHmac('sha256', p).update('roxanne-inventory-v1').digest('hex');
}

export function passcodeMatches(candidate: string): boolean {
  const p = process.env.INVENTORY_PASSCODE;
  if (!p || typeof candidate !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(p);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requestAuthed(req: Request): boolean {
  const token = expectedToken();
  if (!token) return false;
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === AUTH_COOKIE) {
      const v = rest.join('=');
      const a = Buffer.from(v);
      const b = Buffer.from(token);
      return a.length === b.length && timingSafeEqual(a, b);
    }
  }
  return false;
}

/**
 * Gate for the inventory API. Returns a Response to send when the
 * request must not proceed, or null when it may.
 * Order matters for the client: 503 (not set up yet → phone-only
 * fallback) is checked before 401 (locked → passcode form).
 */
export function gate(req: Request): Response | null {
  if (!passcodeConfigured()) {
    return Response.json({ error: 'passcode_not_configured' }, { status: 503 });
  }
  if (!requestAuthed(req)) {
    return Response.json({ error: 'locked' }, { status: 401 });
  }
  if (!getSql()) {
    return Response.json({ error: 'database_not_configured' }, { status: 503 });
  }
  return null;
}

// --- Input hygiene ----------------------------------------------------

export function cleanItem(input: unknown): Omit<InventoryItem, 'id'> & { id?: number } {
  const o = (input ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) =>
    typeof v === 'string' ? v.trim().slice(0, max) : '';
  const money = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0
      ? Math.round(v * 100) / 100
      : null;
  const price = money(o.price);
  const cost = money(o.cost);
  const qtyRaw = typeof o.qty === 'number' ? Math.floor(o.qty) : 1;
  return {
    ...(typeof o.id === 'number' ? { id: o.id } : {}),
    barcode: str(o.barcode, 32),
    name: str(o.name, 200),
    brand: str(o.brand, 120),
    size: str(o.size, 80),
    price,
    cost,
    vendor: str(o.vendor, 120),
    qty: Math.max(1, Math.min(100000, qtyRaw || 1)),
    category: str(o.category, 32),
    audience: str(o.audience, 16) || 'unisex',
  };
}
