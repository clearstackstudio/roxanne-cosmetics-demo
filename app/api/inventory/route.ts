import {
  cleanItem,
  ensureTable,
  gate,
  getSql,
  rowToItem,
  type InventoryRow,
} from '@/lib/inventory-server';

export const dynamic = 'force-dynamic';

/**
 * Inventory CRUD for the /inventory scanner (Neon Postgres).
 * GET    → list all items
 * POST   { item }            → create, or update when id/barcode matches
 * PATCH  { id, patch }       → partial update (qty, price, category, …)
 * DELETE { id } | { all }    → remove one item, or clear the table
 * All methods sit behind the staff-passcode gate (see inventory-server).
 */

export async function GET(req: Request) {
  const blocked = gate(req);
  if (blocked) return blocked;
  const sql = getSql()!;
  await ensureTable(sql);
  const rows = (await sql`
    SELECT * FROM inventory ORDER BY created_at DESC, id DESC
  `) as InventoryRow[];
  return Response.json({ items: rows.map(rowToItem) });
}

export async function POST(req: Request) {
  const blocked = gate(req);
  if (blocked) return blocked;
  const sql = getSql()!;
  await ensureTable(sql);
  const body = (await req.json().catch(() => null)) as { item?: unknown } | null;
  const item = cleanItem(body?.item);
  if (!item.name) {
    return Response.json({ error: 'name_required' }, { status: 400 });
  }
  let rows: InventoryRow[];
  if (item.id) {
    rows = (await sql`
      UPDATE inventory
      SET barcode = ${item.barcode}, name = ${item.name}, brand = ${item.brand},
          size = ${item.size}, price = ${item.price}, cost = ${item.cost},
          vendor = ${item.vendor}, qty = ${item.qty},
          category = ${item.category}, audience = ${item.audience},
          updated_at = now()
      WHERE id = ${item.id}
      RETURNING *
    `) as InventoryRow[];
  } else if (item.barcode) {
    rows = (await sql`
      INSERT INTO inventory (barcode, name, brand, size, price, cost, vendor, qty, category, audience)
      VALUES (${item.barcode}, ${item.name}, ${item.brand}, ${item.size},
              ${item.price}, ${item.cost}, ${item.vendor}, ${item.qty},
              ${item.category}, ${item.audience})
      ON CONFLICT (barcode) WHERE barcode <> ''
      DO UPDATE SET name = EXCLUDED.name, brand = EXCLUDED.brand,
                    size = EXCLUDED.size, price = EXCLUDED.price,
                    cost = EXCLUDED.cost, vendor = EXCLUDED.vendor,
                    qty = EXCLUDED.qty, category = EXCLUDED.category,
                    audience = EXCLUDED.audience, updated_at = now()
      RETURNING *
    `) as InventoryRow[];
  } else {
    rows = (await sql`
      INSERT INTO inventory (barcode, name, brand, size, price, cost, vendor, qty, category, audience)
      VALUES ('', ${item.name}, ${item.brand}, ${item.size},
              ${item.price}, ${item.cost}, ${item.vendor}, ${item.qty},
              ${item.category}, ${item.audience})
      RETURNING *
    `) as InventoryRow[];
  }
  if (!rows[0]) return Response.json({ error: 'not_found' }, { status: 404 });
  return Response.json({ item: rowToItem(rows[0]) });
}

export async function PATCH(req: Request) {
  const blocked = gate(req);
  if (blocked) return blocked;
  const sql = getSql()!;
  await ensureTable(sql);
  const body = (await req.json().catch(() => null)) as {
    id?: unknown;
    patch?: Record<string, unknown>;
  } | null;
  const id = typeof body?.id === 'number' ? body.id : null;
  if (!id || !body?.patch) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const existing = (await sql`
    SELECT * FROM inventory WHERE id = ${id}
  `) as InventoryRow[];
  if (!existing[0]) return Response.json({ error: 'not_found' }, { status: 404 });
  const merged = cleanItem({ ...rowToItem(existing[0]), ...body.patch, id });
  const rows = (await sql`
    UPDATE inventory
    SET barcode = ${merged.barcode}, name = ${merged.name}, brand = ${merged.brand},
        size = ${merged.size}, price = ${merged.price}, cost = ${merged.cost},
        vendor = ${merged.vendor}, qty = ${merged.qty},
        category = ${merged.category}, audience = ${merged.audience},
        updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `) as InventoryRow[];
  return Response.json({ item: rowToItem(rows[0]) });
}

export async function DELETE(req: Request) {
  const blocked = gate(req);
  if (blocked) return blocked;
  const sql = getSql()!;
  await ensureTable(sql);
  const body = (await req.json().catch(() => null)) as {
    id?: unknown;
    all?: unknown;
  } | null;
  if (body?.all === true) {
    await sql`DELETE FROM inventory`;
    return Response.json({ ok: true });
  }
  const id = typeof body?.id === 'number' ? body.id : null;
  if (!id) return Response.json({ error: 'bad_request' }, { status: 400 });
  await sql`DELETE FROM inventory WHERE id = ${id}`;
  return Response.json({ ok: true });
}
