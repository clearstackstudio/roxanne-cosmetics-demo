export const metadata = { title: 'Privacy Policy — Roxanne Cosmetics (Demo)' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl text-stone-900 dark:text-stone-50">Privacy Policy</h1>
      <p className="mt-2 text-sm text-stone-500">
        Demo starter language — not reviewed by an attorney. The shop should have
        this reviewed before real use.
      </p>

      <div className="mt-8 space-y-6 text-stone-700 dark:text-stone-300">
        <section>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            What this site collects
          </h2>
          <p className="mt-2">
            This website is product information only. There is no checkout, no
            account system, and no contact form — the site collects no personal
            information from visitors.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            The staff inventory tool
          </h2>
          <p className="mt-2">
            The shop&apos;s inventory tool stores its product list in the browser
            on the staff device only — nothing is uploaded to a server. When a
            barcode is scanned, just the barcode number is sent to Open Beauty
            Facts and Open Food Facts to look up the product name; no personal
            information is included in that lookup.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Sharing
          </h2>
          <p className="mt-2">
            Because the site collects nothing, there is nothing to sell, rent,
            or share.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Demo notice
          </h2>
          <p className="mt-2">
            This is a demonstration website. Products, prices, and availability
            are placeholders. Purchases are made in the shop — nothing is sold
            online here.
          </p>
        </section>
      </div>
    </div>
  );
}
