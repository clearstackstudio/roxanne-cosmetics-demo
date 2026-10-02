import Link from 'next/link';
import { formatPrice, type Product } from '@/data/products';
import { ProductImage } from './ProductVisual';

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="group overflow-hidden rounded-2xl border border-stone-200 bg-white transition-shadow hover:shadow-lg dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="relative bg-gradient-to-br from-rose-50 to-stone-100 p-6 dark:from-stone-800 dark:to-stone-900">
        <ProductImage
          product={product}
          className="mx-auto h-44 w-auto transition-transform group-hover:scale-105"
        />
        {product.placeholder && (
          <span className="absolute left-3 top-3 rounded-full bg-stone-900/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white dark:bg-white/20">
            Demo
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{product.name}</p>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{product.size}</p>
        <p className="mt-2 font-serif text-lg text-rose-700 dark:text-rose-400">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}
