export const metadata = { title: 'Terms of Service — Roxanne Cosmetics (Demo)' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl text-stone-900 dark:text-stone-50">Terms of Service</h1>
      <p className="mt-2 text-sm text-stone-500">
        Demo starter language — not reviewed by an attorney. The shop should have
        this reviewed before real use.
      </p>

      <div className="mt-8 space-y-6 text-stone-700 dark:text-stone-300">
        <section>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Demonstration website
          </h2>
          <p className="mt-2">
            This is a concept demonstration. Products, descriptions, prices, and
            availability shown here are illustrative placeholders.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Product information only
          </h2>
          <p className="mt-2">
            This site provides product information only — nothing is sold
            online here and no payment is taken. Purchases are made in the
            shop and are subject to the shop&apos;s actual availability,
            pricing, and return policies.
          </p>
        </section>
      </div>
    </div>
  );
}
