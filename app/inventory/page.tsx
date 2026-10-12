import InventoryScanner from '@/components/InventoryScanner';

export const metadata = {
  title: 'Inventory Scanner — Roxanne Cosmetics',
  description: 'Staff tool: build the shop inventory by scanning product barcodes.',
  robots: { index: false, follow: false },
};

export default function InventoryPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-600 dark:text-rose-400">
        Staff tool
      </p>
      <h1 className="mt-2 font-serif text-3xl text-stone-900 dark:text-stone-50">
        Inventory scanner
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        Scan each product&apos;s barcode to build the inventory list. The name and
        brand fill in automatically when the barcode is recognized — just add the
        price and how many you have. The list is saved on this phone as you go;
        when you&apos;re done, export it and send the file to Bryant.
      </p>
      <InventoryScanner />
    </div>
  );
}
