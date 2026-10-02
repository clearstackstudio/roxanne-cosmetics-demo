import Link from 'next/link';
import { CATEGORIES, PRODUCTS } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { ProductVisual } from '@/components/ProductVisual';

const heroProduct = PRODUCTS.find((p) => p.id === 'velours-de-rose') ?? PRODUCTS[0];
const featured = PRODUCTS.filter((p) => p.featured);

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="grid items-center gap-8 py-12 md:grid-cols-2 md:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-600 dark:text-rose-400">
            The demo boutique
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-stone-900 md:text-5xl dark:text-stone-50">
            Find your signature scent
          </h1>
          <p className="mt-4 max-w-md text-stone-600 dark:text-stone-300">
            Curated perfumes, colognes, skincare and makeup — handpicked by Roxanne.
            Browse the collection, fill your bag, and check out securely.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-700 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              Shop the collection
            </Link>
            <Link
              href="/shop?cat=perfume"
              className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-700 hover:border-rose-400 hover:text-rose-600 dark:border-stone-700 dark:text-stone-200 dark:hover:text-rose-400"
            >
              Bestselling perfumes
            </Link>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-100 via-rose-50 to-stone-100 p-10 dark:from-stone-800 dark:via-stone-900 dark:to-stone-900">
          <ProductVisual product={heroProduct} className="mx-auto h-72 w-auto drop-shadow-xl" />
          <p className="mt-4 text-center font-serif text-lg text-stone-800 dark:text-stone-200">
            {heroProduct.name}
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8">
        <h2 className="font-serif text-2xl text-stone-900 dark:text-stone-50">Shop by category</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/shop?cat=${c.id}`}
              className="rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="font-serif text-lg text-stone-900 dark:text-stone-100">{c.name}</p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{c.tagline}</p>
              <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">Browse →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="py-8">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-2xl text-stone-900 dark:text-stone-50">Customer favorites</h2>
          <Link href="/shop" className="text-sm font-medium text-rose-600 dark:text-rose-400">
            View all →
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Story strip */}
      <section className="my-12 rounded-3xl bg-stone-900 p-8 text-center md:p-12 dark:bg-stone-900">
        <h2 className="font-serif text-2xl text-white md:text-3xl">Beauty, curated — not mass-produced</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-stone-300">
          Every piece in the Roxanne collection is chosen for quality and character.
          Demo copy — the real brand story goes here.
        </p>
      </section>
    </div>
  );
}
