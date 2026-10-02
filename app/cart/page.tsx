'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { findProduct, formatPrice } from '@/data/products';
import { ProductImage } from '@/components/ProductVisual';
import QtyStepper from '@/components/QtyStepper';

export default function CartPage() {
  const { lines, subtotal, count, updateQty, removeLine, clear } = useCart();

  return (
    <div className="py-10">
      <h1 className="font-serif text-3xl text-stone-900 dark:text-stone-50">
        Your bag {count > 0 && <span className="text-stone-400">({count})</span>}
      </h1>

      {lines.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-stone-500 dark:text-stone-400">Your bag is empty.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-700 dark:bg-rose-600 dark:hover:bg-rose-500"
          >
            Shop the collection
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-10 md:grid-cols-[1fr_320px]">
          <ul className="space-y-4">
            {lines.map((l) => {
              const p = findProduct(l.productId);
              if (!p) return null;
              return (
                <li
                  key={l.productId}
                  className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
                >
                  <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-rose-50 dark:bg-stone-800">
                    <ProductImage product={p} className="h-full w-full" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/product/${p.id}`}
                          className="font-medium text-stone-900 hover:text-rose-600 dark:text-stone-100"
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{p.size}</p>
                      </div>
                      <p className="font-semibold">{formatPrice(p.price * l.qty)}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <QtyStepper small qty={l.qty} onChange={(q) => updateQty(l.productId, q)} />
                      <button
                        onClick={() => removeLine(l.productId)}
                        className="text-xs text-stone-400 underline hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-serif text-xl text-stone-900 dark:text-stone-50">Order summary</h2>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-stone-600 dark:text-stone-300">Subtotal</span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-stone-400">Taxes &amp; shipping calculated at checkout.</p>
            <Link
              href="/checkout"
              className="mt-4 block rounded-full bg-stone-900 py-3 text-center text-sm font-semibold text-white hover:bg-stone-700 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              Checkout
            </Link>
            <button
              onClick={clear}
              className="mt-2 w-full text-center text-xs text-stone-400 underline"
            >
              Clear bag
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
