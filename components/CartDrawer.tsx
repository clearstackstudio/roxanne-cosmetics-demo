'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { findProduct, formatPrice } from '@/data/products';
import { ProductImage } from './ProductVisual';
import QtyStepper from './QtyStepper';

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lines, subtotal, count, updateQty, removeLine } = useCart();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <h2 className="font-serif text-xl text-stone-900 dark:text-stone-50">
            Your bag ({count})
          </h2>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <p className="mt-8 text-center text-stone-500 dark:text-stone-400">
              Your bag is empty. <br />
              <Link href="/shop" onClick={onClose} className="text-rose-600 underline dark:text-rose-400">
                Start shopping
              </Link>
            </p>
          ) : (
            <ul className="space-y-4">
              {lines.map((l) => {
                const p = findProduct(l.productId);
                if (!p) return null;
                return (
                  <li key={l.productId} className="flex gap-3">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-rose-50 dark:bg-stone-800">
                      <ProductImage product={p} className="h-full w-full" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{p.name}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">{p.size}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <QtyStepper small qty={l.qty} onChange={(q) => updateQty(l.productId, q)} />
                        <p className="text-sm font-semibold">{formatPrice(p.price * l.qty)}</p>
                      </div>
                      <button
                        onClick={() => removeLine(l.productId)}
                        className="mt-1 text-xs text-stone-400 underline hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {lines.length > 0 && (
          <div className="border-t border-stone-200 px-5 py-4 dark:border-stone-800">
            <div className="flex justify-between text-sm">
              <span className="text-stone-600 dark:text-stone-300">Subtotal</span>
              <span className="font-semibold text-stone-900 dark:text-stone-50">
                {formatPrice(subtotal)}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={onClose}
              className="mt-3 block rounded-full bg-stone-900 py-3 text-center text-sm font-semibold text-white hover:bg-stone-700 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              Checkout
            </Link>
            <Link
              href="/cart"
              onClick={onClose}
              className="mt-2 block text-center text-sm text-stone-500 underline dark:text-stone-400"
            >
              View full bag
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
