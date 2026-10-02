'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, formatPrice, type Product } from '@/data/products';
import { useCart } from '@/lib/cart';
import { ProductImage } from '@/components/ProductVisual';
import ProductCard from '@/components/ProductCard';
import QtyStepper from '@/components/QtyStepper';

export default function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const category = CATEGORIES.find((c) => c.id === product.category);

  const handleAdd = () => {
    add(product.id, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="py-10">
      <Link href="/shop" className="text-sm text-stone-500 hover:text-rose-600 dark:text-stone-400">
        ← Back to shop
      </Link>

      <div className="mt-4 grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 to-stone-100 p-10 dark:from-stone-800 dark:to-stone-900">
          <ProductImage product={product} className="mx-auto h-80 w-auto drop-shadow-xl" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-600 dark:text-rose-400">
            {category?.name}
          </p>
          <h1 className="mt-2 font-serif text-3xl text-stone-900 md:text-4xl dark:text-stone-50">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{product.size}</p>
          <p className="mt-4 font-serif text-2xl text-rose-700 dark:text-rose-400">
            {formatPrice(product.price)}
          </p>
          <p className="mt-4 leading-relaxed text-stone-600 dark:text-stone-300">
            {product.description}
          </p>

          {product.notes && product.notes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                Notes
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.notes.map((n) => (
                  <span
                    key={n}
                    className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700 dark:bg-stone-800 dark:text-rose-300"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.placeholder && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Demo product — name, description &amp; price are placeholders.
            </p>
          )}

          <div className="mt-6 flex items-center gap-4">
            <QtyStepper qty={qty} onChange={(q) => setQty(Math.max(1, q))} />
            <button
              onClick={handleAdd}
              className="flex-1 rounded-full bg-stone-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-700 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              {added ? 'Added ✓' : 'Add to bag'}
            </button>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-2xl text-stone-900 dark:text-stone-50">
            You may also like
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
