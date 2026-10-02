'use client';

export default function QtyStepper({
  qty,
  onChange,
  small = false,
}: {
  qty: number;
  onChange: (qty: number) => void;
  small?: boolean;
}) {
  const btn = small ? 'h-7 w-7 text-sm' : 'h-9 w-9 text-base';
  return (
    <div className="inline-flex items-center rounded-full border border-stone-300 dark:border-stone-700">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(qty - 1)}
        className={`${btn} rounded-l-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800`}
      >
        −
      </button>
      <span className={`${small ? 'w-8' : 'w-10'} text-center text-sm font-medium tabular-nums`}>
        {qty}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(qty + 1)}
        className={`${btn} rounded-r-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800`}
      >
        +
      </button>
    </div>
  );
}
