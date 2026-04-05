export const metadata = {
  title: 'Terms of Service — PGH Pass',
};

export default function TermsPage() {
  return (
    <section className="px-6 md:px-8 py-24 md:py-32">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-[36px] md:text-[48px] tracking-[-0.03em] text-ink mb-8">
          Terms of Service
        </h1>
        <div className="prose prose-neutral max-w-none text-ink-3 leading-relaxed space-y-6">
          <p className="text-base">
            Last updated: April 2026
          </p>
          <p className="text-base">
            By using PGH Pass, you agree to these terms. Please read them carefully.
          </p>
          <h2 className="text-xl font-semibold text-ink mt-10 mb-3">Use of service</h2>
          <p className="text-base">
            PGH Pass provides a city-wide loyalty points platform connecting consumers with
            local businesses in Pittsburgh. You must be at least 13 years old to use the
            service.
          </p>
          <h2 className="text-xl font-semibold text-ink mt-10 mb-3">Points &amp; rewards</h2>
          <p className="text-base">
            Points earned through PGH Pass have no cash value and may only be redeemed at
            participating businesses within the network. Point values and redemption rates
            are subject to change.
          </p>
          <h2 className="text-xl font-semibold text-ink mt-10 mb-3">Contact</h2>
          <p className="text-base">
            Questions? Reach us at{' '}
            <a href="mailto:hello@pghpass.com" className="text-brand-gold hover:underline">
              hello@pghpass.com
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
