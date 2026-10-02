import { randomUUID } from 'crypto';
import { SquareClient, SquareEnvironment } from 'square';
import { priceOrder } from '@/lib/pricing';

interface CheckoutBody {
  sourceId?: string;
  idempotencyKey?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: unknown;
}

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export async function POST(request: Request) {
  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { sourceId, customerName, customerEmail, customerPhone } = body;
  const idempotencyKey =
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.length > 0
      ? body.idempotencyKey.slice(0, 128)
      : randomUUID();

  if (!sourceId || typeof sourceId !== 'string') {
    return Response.json({ ok: false, error: 'Missing card token (sourceId).' }, { status: 400 });
  }
  if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
    return Response.json({ ok: false, error: 'Please enter your name.' }, { status: 400 });
  }
  if (!customerEmail || typeof customerEmail !== 'string' || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
    return Response.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }

  // Recompute the total from trusted catalog data — the browser's amount is ignored.
  let priced;
  try {
    priced = priceOrder(body.items);
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : 'Invalid cart.' },
      { status: 400 },
    );
  }
  const { lines, totalCents } = priced;

  let accessToken: string;
  let locationId: string;
  try {
    accessToken = getEnv('SQUARE_ACCESS_TOKEN');
    locationId = getEnv('SQUARE_LOCATION_ID');
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : 'Server misconfigured.' },
      { status: 500 },
    );
  }

  const environment =
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;

  const client = new SquareClient({ token: accessToken, environment });
  const orderRef = `ROXANNE-${Date.now().toString(36).toUpperCase()}`;

  // 1) Create a real Square order with line items so the shop sees it in
  //    Square Dashboard. Pickup fulfillment (ASAP) — the demo shop fulfills
  //    in store; switch to SHIPMENT with an address when shipping goes live.
  let orderId: string;
  let orderVersion: number | undefined;
  try {
    const orderRes = await client.orders.create(
      {
        order: {
          locationId,
          referenceId: orderRef,
          lineItems: lines.map((l, i) => ({
            uid: `line-${i}`,
            name: l.name,
            quantity: String(l.qty),
            basePriceMoney: { amount: BigInt(l.unitCents), currency: 'USD' },
            note: l.summary.slice(0, 500) || undefined,
          })),
          fulfillments: [
            {
              uid: 'pickup-1',
              type: 'PICKUP',
              state: 'PROPOSED',
              pickupDetails: {
                recipient: { displayName: customerName.trim(), emailAddress: customerEmail.trim() },
                note: `Roxanne Cosmetics order ${orderRef}`.slice(0, 500),
                scheduleType: 'ASAP',
              },
            },
          ],
        },
        idempotencyKey: `${idempotencyKey}-order`,
      },
    );
    const order = orderRes.order;
    if (!order?.id) throw new Error('Square did not return an order.');
    orderId = order.id;
    orderVersion = order.version ? Number(order.version) : undefined;
  } catch (err) {
    return Response.json({ ok: false, error: extractSquareError(err) }, { status: 400 });
  }

  // 2) Charge the card against that order.
  try {
    const payRes = await client.payments.create({
      sourceId,
      orderId,
      amountMoney: { amount: BigInt(totalCents), currency: 'USD' },
      locationId,
      idempotencyKey: `${idempotencyKey}-payment`,
      referenceId: orderRef,
      note: `Roxanne Cosmetics order ${orderRef}`.slice(0, 500),
      buyerEmailAddress: customerEmail.trim(),
      ...(customerPhone && /^\d{10}$/.test(customerPhone)
        ? { buyerPhoneNumber: `+1${customerPhone}` }
        : {}),
    });
    const payment = payRes.payment;
    if (!payment?.id) throw new Error('Square did not return a payment.');
    return Response.json({
      ok: true,
      paymentId: payment.id,
      orderId,
      orderRef,
      totalCents,
      status: payment.status,
    });
  } catch (err) {
    // Payment failed: cancel the unpaid order so it doesn't linger in the dashboard.
    try {
      if (orderVersion !== undefined) {
        await client.orders.update({
          orderId,
          idempotencyKey: `${idempotencyKey}-cancel`,
          order: { locationId, version: orderVersion, state: 'CANCELED' },
        });
      }
    } catch {
      /* best effort — staff can cancel the unpaid order in Square Dashboard */
    }
    return Response.json({ ok: false, error: extractSquareError(err) }, { status: 400 });
  }
}

function extractSquareError(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const withErrors = err as { errors?: Array<{ detail?: string; code?: string }> };
    if (Array.isArray(withErrors.errors) && withErrors.errors.length > 0) {
      return withErrors.errors
        .map((e) => e.detail || e.code || 'Unknown Square error')
        .join('; ');
    }
    if (err instanceof Error) return err.message;
  }
  return 'Payment failed.';
}
