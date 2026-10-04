import Link from 'next/link';
import { CATEGORIES, PRODUCTS, type CategoryId } from '@/data/products';
import ProductCard from '@/components/ProductCard';

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; aud?: string }>;
}) {
  const { cat, aud } = await searchParams;
  const active: CategoryId | null = CATEGORIES.some((c) => c.id === cat)
    ? (cat as CategoryId)
    : null;
  const audience: 'women' | 'men' | null = aud === 'women' || aud === 'men' ? aud : null;
  const isFragrance = active === 'perfume' || active === 'cologne';
  let items = active ? PRODUCTS.filter((p) => p.category === active) : PRODUCTS;
  if (isFragrance && audience) {
    items = items.filter((p) => p.audience === audience || p.audience === 'unisex');
  }
  const activeName = active ? CATEGORIES.find((c) => c.id === active)?.name : 'The collection';

  return (
    <div className="py-10">
      <h1 className="font-serif text-3xl text-stone-900 dark:text-stone-50">{activeName}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {items.length} products · demo catalog
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/shop"
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !active
              ? 'bg-stone-900 text-white dark:bg-rose-600'
              : 'border border-stone-300 text-stone-600 hover:border-rose-400 dark:border-stone-700 dark:text-stone-300'
          }`}
        >
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/shop?cat=${c.id}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active === c.id
                ? 'bg-stone-900 text-white dark:bg-rose-600'
                : 'border border-stone-300 text-stone-600 hover:border-rose-400 dark:border-stone-700 dark:text-stone-300'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {isFragrance && (
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-6 dark:border-stone-800">
          <span className="mr-1 text-sm font-medium text-stone-500 dark:text-stone-400">
            Shop by:
          </span>
          {(
            [
              { id: null, label: 'All' },
              { id: 'women', label: 'For Her' },
              { id: 'men', label: 'For Him' },
            ] as const
          ).map((f) => {
            const href = f.id ? `/shop?cat=${active}&aud=${f.id}` : `/shop?cat=${active}`;
            const isActive = audience === f.id;
            return (
              <Link
                key={f.label}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-rose-600 text-white'
                    : 'border border-stone-300 text-stone-600 hover:border-rose-400 dark:border-stone-700 dark:text-stone-300'
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
