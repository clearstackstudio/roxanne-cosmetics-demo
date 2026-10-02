import type { Product } from '@/data/products';

/**
 * Elegant generated product visual — a stylized SVG bottle/jar/tube tinted with
 * the product's hue. Used while products are placeholders. When a product has a
 * real `photo`, the photo is rendered instead (see ProductImage below).
 */
export function ProductVisual({ product, className = '' }: { product: Product; className?: string }) {
  const { hue, shape } = product.visual;
  const gid = `g-${product.id}`;
  const sat = shape === 'flacon' ? 55 : 45;

  return (
    <svg viewBox="0 0 200 240" className={className} role="img" aria-label={product.name}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} ${sat}% 72%)`} />
          <stop offset="55%" stopColor={`hsl(${hue} ${sat}% 52%)`} />
          <stop offset="100%" stopColor={`hsl(${(hue + 25) % 360} ${sat}% 34%)`} />
        </linearGradient>
        <linearGradient id={`${gid}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
      </defs>

      {/* soft backdrop */}
      <ellipse cx="100" cy="222" rx="62" ry="10" fill={`hsl(${hue} 40% 80%)`} opacity="0.35" className="dark:opacity-20" />

      {shape === 'flacon' && (
        <g>
          <rect x="88" y="34" width="24" height="26" rx="4" fill={`hsl(${hue} 30% 28%)`} />
          <rect x="82" y="58" width="36" height="10" rx="3" fill={`hsl(${hue} 25% 42%)`} />
          <path d="M70 78 Q70 68 82 68 L118 68 Q130 68 130 78 L142 150 Q145 190 118 200 L82 200 Q55 190 58 150 Z" fill={`url(#${gid})`} />
          <path d="M70 78 Q70 68 82 68 L118 68 Q130 68 130 78 L142 150 Q145 190 118 200 L82 200 Q55 190 58 150 Z" fill={`url(#${gid}-glass)`} />
          <rect x="78" y="118" width="44" height="34" rx="3" fill="#fffdf8" opacity="0.92" />
          <text x="100" y="132" textAnchor="middle" fontSize="10" fontFamily="Georgia, serif" fill={`hsl(${hue} 40% 30%)`}>Roxanne</text>
          <text x="100" y="145" textAnchor="middle" fontSize="7.5" fontFamily="Georgia, serif" fill={`hsl(${hue} 30% 45%)`}>PARIS</text>
        </g>
      )}

      {shape === 'tall' && (
        <g>
          <rect x="90" y="30" width="20" height="30" rx="4" fill={`hsl(${hue} 30% 28%)`} />
          <rect x="84" y="58" width="32" height="8" rx="3" fill={`hsl(${hue} 25% 42%)`} />
          <rect x="76" y="70" width="48" height="130" rx="10" fill={`url(#${gid})`} />
          <rect x="76" y="70" width="48" height="130" rx="10" fill={`url(#${gid}-glass)`} />
          <rect x="84" y="118" width="32" height="30" rx="2" fill="#fffdf8" opacity="0.92" />
          <text x="100" y="131" textAnchor="middle" fontSize="8.5" fontFamily="Georgia, serif" fill={`hsl(${hue} 40% 30%)`}>Roxanne</text>
          <text x="100" y="142" textAnchor="middle" fontSize="6.5" fontFamily="Georgia, serif" fill={`hsl(${hue} 30% 45%)`}>PARIS</text>
        </g>
      )}

      {shape === 'jar' && (
        <g>
          <rect x="58" y="120" width="84" height="66" rx="14" fill={`url(#${gid})`} />
          <rect x="58" y="120" width="84" height="66" rx="14" fill={`url(#${gid}-glass)`} />
          <rect x="52" y="102" width="96" height="26" rx="12" fill={`hsl(${hue} 25% 88%)`} className="dark:fill-stone-700" />
          <rect x="52" y="102" width="96" height="26" rx="12" fill="none" stroke={`hsl(${hue} 30% 60%)`} strokeWidth="1.5" />
          <text x="100" y="152" textAnchor="middle" fontSize="11" fontFamily="Georgia, serif" fill="#fffdf8">Roxanne</text>
          <text x="100" y="168" textAnchor="middle" fontSize="7.5" fontFamily="Georgia, serif" fill="#fffdf8" opacity="0.85">PARIS</text>
        </g>
      )}

      {shape === 'tube' && (
        <g>
          <rect x="86" y="42" width="28" height="22" rx="4" fill={`hsl(${hue} 30% 24%)`} />
          <rect x="80" y="62" width="40" height="12" rx="3" fill={`hsl(${hue} 25% 40%)`} />
          <path d="M80 74 L120 74 L112 200 Q100 208 88 200 Z" fill={`url(#${gid})`} />
          <path d="M80 74 L120 74 L112 200 Q100 208 88 200 Z" fill={`url(#${gid}-glass)`} />
          <text x="100" y="140" textAnchor="middle" fontSize="10" fontFamily="Georgia, serif" fill="#fffdf8" transform="rotate(0 100 140)">Roxanne</text>
        </g>
      )}
    </svg>
  );
}

/** Renders the real photo when present, otherwise the generated visual. */
export function ProductImage({
  product,
  className = '',
}: {
  product: Product;
  className?: string;
}) {
  if (product.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.photo} alt={product.name} className={className} />;
  }
  return <ProductVisual product={product} className={className} />;
}
