'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { findProduct, formatPrice } from '@/data/products';
import { useCart } from '@/lib/cart';
import { ProductImage } from '@/components/ProductVisual';
import QtyStepper from '@/components/QtyStepper';

interface SquareTokenizeResult {
  status: string;
  token?: string;
  errors?: { message?: string }[];
}

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<SquareTokenizeResult>;
  destroy?: () => void;
}

interface SquarePayments {
  card: () => Promise<SquareCard>;
}

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => SquarePayments;
    };
  }
}

type Status = 'idle' | 'ready' | 'paying' | 'success' | 'error';

interface Confirmation {
  paymentId: string;
  orderRef: string;
  total: number;
}

export default function CheckoutPage() {
  const { lines, subtotal, count, clear, updateQty } = useCart();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const cardRef = useRef<SquareCard | null>(null);

  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? '';
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? '';
  const environment = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT ?? 'sandbox';
  const isMisconfigured = !appId || !locationId;

  // Initialize the Square card form once per credentials/cart change.
  useEffect(() => {
    if (isMisconfigured || lines.length === 0) return;
    let cancelled = false;

    const scriptUrl =
      environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

    const load = () =>
      new Promise<void>((resolve, reject) => {
        if (window.Square) return resolve();
        const s = document.createElement('script');
        s.src = scriptUrl;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Square Web Payments SDK'));
        document.head.appendChild(s);
      });

    const timeout = setTimeout(() => {
      if (!cancelled && cardRef.current === null) {
        setErrorMsg(
          'The secure card form timed out. If you are the shop owner: set ' +
            'NEXT_PUBLIC_SQUARE_APPLICATION_ID and NEXT_PUBLIC_SQUARE_LOCATION_ID ' +
            '(sandbox) and redeploy.',
        );
        setStatus('error');
      }
    }, 20000);

    (async () => {
      setStatus('idle');
      try {
        await load();
        if (cancelled || !window.Square) return;
        const payments = window.Square.payments(appId, locationId);
        const card = await payments.card();
        await card.attach('#card-container');
        if (cancelled) return;
        clearTimeout(timeout);
        cardRef.current = card;
        setErrorMsg('');
        setStatus('ready');
      } catch (e) {
        clearTimeout(timeout);
        console.error('Square card form failed to initialize:', e);
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : 'Could not initialize the card form.');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cardRef.current?.destroy?.();
      cardRef.current = null;
    };
  }, [isMisconfigured, lines.length, appId, locationId, environment]);

  const pay = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      setStatus('error');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      setErrorMsg('Phone number must be 10 digits (or leave it blank).');
      setStatus('error');
      return;
    }
    if (!cardRef.current) {
      setErrorMsg('Card form is not ready yet — please wait a moment and try again.');
      setStatus('error');
      return;
    }

    setStatus('paying');
    setErrorMsg('');

    const tokenResult = await cardRef.current.tokenize();
    if (tokenResult.status !== 'OK' || !tokenResult.token) {
      setErrorMsg(
        tokenResult.errors?.map((e) => e.message).join(' ') || 'Card could not be processed.',
      );
      setStatus('error');
      return;
    }

    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: tokenResult.token,
          idempotencyKey,
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim() || undefined,
          items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        paymentId?: string;
        orderRef?: string;
        totalCents?: number;
      };
      if (!data.ok) throw new Error(data.error || 'Payment failed.');
      setConfirmation({
        paymentId: data.paymentId ?? '',
        orderRef: data.orderRef ?? '',
        total: (data.totalCents ?? 0) / 100,
      });
      setStatus('success');
      clear();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Payment failed.');
      setStatus('error');
    }
  };

  if (status === 'success' && confirmation) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700 dark:bg-green-950 dark:text-green-300">
          ✓
        </div>
        <h1 className="mt-4 font-serif text-3xl text-stone-900 dark:text-stone-50">
          Merci! Order confirmed.
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-300">
          Order <span className="font-mono font-semibold">{confirmation.orderRef}</span> ·{' '}
          {formatPrice(confirmation.total)}
        </p>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          {environment === 'sandbox'
            ? 'Sandbox payment — no real money moved. A test receipt was emailed.'
            : 'A receipt was sent to your email.'}{' '}
          We&apos;ll have your items ready for pickup.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-700 dark:bg-rose-600 dark:hover:bg-rose-500"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="py-10">
      <h1 className="font-serif text-3xl text-stone-900 dark:text-stone-50">Checkout</h1>

      {lines.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-stone-500 dark:text-stone-400">Your bag is empty.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white dark:bg-rose-600"
          >
            Shop the collection
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-10 md:grid-cols-[1fr_360px]">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Contact
            </h2>
            <div className="mt-3 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                autoComplete="name"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm dark:border-stone-700 dark:bg-stone-900"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm dark:border-stone-700 dark:bg-stone-900"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Phone (10 digits, optional)"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm dark:border-stone-700 dark:bg-stone-900"
              />
            </div>

            <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Payment
            </h2>
            {isMisconfigured ? (
              <div className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 dark:border-stone-700 dark:bg-stone-900">
                <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                  Demo mode — Square sandbox keys not configured yet.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  The checkout UI is complete. To accept test payments, the shop owner adds the
                  sandbox credentials as Vercel environment variables:
                  <span className="font-mono">
                    {' '}
                    SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT=sandbox,
                    NEXT_PUBLIC_SQUARE_APPLICATION_ID, NEXT_PUBLIC_SQUARE_LOCATION_ID,
                    NEXT_PUBLIC_SQUARE_ENVIRONMENT=sandbox
                  </span>
                  . Then the secure Square card form appears here. Sandbox test card:{' '}
                  <span className="font-mono">4111 1111 1111 1111</span>, any future expiry, any CVV.
                </p>
              </div>
            ) : (
              <>
                <div
                  id="card-container"
                  className="mt-3 min-h-[120px] rounded-2xl border border-stone-300 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
                />
                <p className="mt-2 text-xs text-stone-400">
                  {environment === 'sandbox'
                    ? 'Sandbox mode — no real charges. Test card 4111 1111 1111 1111.'
                    : 'Secured by Square.'}
                </p>
              </>
            )}

            {errorMsg && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {errorMsg}
              </p>
            )}

            <button
              onClick={pay}
              disabled={status === 'paying' || isMisconfigured}
              className="mt-6 w-full rounded-full bg-stone-900 py-4 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              {status === 'paying' ? 'Processing…' : `Pay ${formatPrice(subtotal)}`}
            </button>
          </div>

          <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-serif text-xl text-stone-900 dark:text-stone-50">
              Your order ({count})
            </h2>
            <ul className="mt-3 space-y-3">
              {lines.map((l) => {
                const p = findProduct(l.productId);
                if (!p) return null;
                return (
                  <li key={l.productId} className="flex items-center gap-3">
                    <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-rose-50 dark:bg-stone-800">
                      <ProductImage product={p} className="h-full w-full" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-stone-900 dark:text-stone-100">{p.name}</p>
                      <QtyStepper small qty={l.qty} onChange={(q) => updateQty(l.productId, q)} />
                    </div>
                    <p className="text-xs font-semibold">{formatPrice(p.price * l.qty)}</p>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-between border-t border-stone-200 pt-3 text-sm dark:border-stone-800">
              <span className="text-stone-600 dark:text-stone-300">Total</span>
              <span className="font-serif text-lg font-semibold">{formatPrice(subtotal)}</span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
