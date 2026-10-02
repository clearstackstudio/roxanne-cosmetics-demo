'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { useState } from 'react';
import CartDrawer from './CartDrawer';

const NAV = [
  { href: '/shop', label: 'Shop' },
  { href: '/shop?cat=perfume', label: 'Perfumes' },
  { href: '/shop?cat=cologne', label: 'Colognes' },
  { href: '/shop?cat=skincare', label: 'Skincare' },
  { href: '/shop?cat=makeup', label: 'Makeup' },
];

export default function Header() {
  const { count } = useCart();
  const pathname = usePathname();
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-rose-100 bg-white/85 backdrop-blur dark:border-stone-800 dark:bg-stone-950/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl tracking-wide text-stone-900 dark:text-stone-50">
              Roxanne
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-600 dark:text-rose-400">
              Cosmetics
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className={`text-sm transition-colors hover:text-rose-600 dark:hover:text-rose-400 ${
                  pathname === n.href.split('?')[0] && n.href === '/shop'
                    ? 'font-semibold text-stone-900 dark:text-stone-50'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => setCartOpen(true)}
            className="relative rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 dark:bg-rose-600 dark:hover:bg-rose-500"
            aria-label={`Open cart, ${count} items`}
          >
            Bag {count > 0 && <span className="ml-1 font-bold">({count})</span>}
          </button>
        </div>
        <nav className="flex gap-5 overflow-x-auto border-t border-rose-50 px-4 py-2 md:hidden dark:border-stone-800">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="whitespace-nowrap text-sm text-stone-600 dark:text-stone-300"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
