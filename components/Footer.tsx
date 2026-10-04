import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-rose-100 bg-rose-50/60 dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="font-serif text-xl text-stone-900 dark:text-stone-50">Roxanne Cosmetics</p>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Fine fragrance, skincare &amp; makeup — curated with love.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Shop
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link className="text-stone-600 hover:text-rose-600 dark:text-stone-300" href="/shop?cat=perfume">Perfumes</Link></li>
            <li><Link className="text-stone-600 hover:text-rose-600 dark:text-stone-300" href="/shop?cat=cologne">Colognes</Link></li>
            <li><Link className="text-stone-600 hover:text-rose-600 dark:text-stone-300" href="/shop?cat=skincare">Skincare</Link></li>
            <li><Link className="text-stone-600 hover:text-rose-600 dark:text-stone-300" href="/shop?cat=makeup">Makeup</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Visit us
          </p>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Demo storefront — address &amp; hours go here.
          </p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            Demo site · placeholder products · Square sandbox checkout (no real charges)
          </p>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-stone-400 dark:text-stone-600">
        Built by{" "}
        <a href="https://www.weclearstack.com" className="underline hover:text-stone-600 dark:hover:text-stone-400">
          ClearStack Studio
        </a>
        {" "}·{" "}
        <Link href="/privacy" className="underline hover:text-stone-600 dark:hover:text-stone-400">
          Privacy
        </Link>
        {" "}·{" "}
        <Link href="/terms" className="underline hover:text-stone-600 dark:hover:text-stone-400">
          Terms
        </Link>
      </p>
    </footer>
  );
}
