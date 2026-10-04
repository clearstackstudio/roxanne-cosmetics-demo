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
            When you check out, we collect the contact and shipping details you provide
            so we can fulfill your order. Payment details you enter go directly to
            Square — we never see or store your card number.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            How your information is used
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your details are used only to process and deliver your order.</li>
            <li>We do not sell, rent, or share your information with anyone else.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Third parties
          </h2>
          <p className="mt-2">
            Payments are processed by Square. Square&apos;s own privacy policy applies to
            the payment information you provide at checkout.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Demo notice
          </h2>
          <p className="mt-2">
            This is a demonstration website. Products, prices, and availability are
            placeholders, and checkout runs in a sandbox — no real payment is processed.
          </p>
        </section>
      </div>
    </div>
  );
}
