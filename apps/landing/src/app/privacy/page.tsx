export const metadata = {
  title: 'Privacy Policy — PGH Pass',
};

export default function PrivacyPage() {
  return (
    <section className="px-6 md:px-8 py-24 md:py-32">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-[36px] md:text-[48px] tracking-[-0.03em] text-ink mb-8">
          Privacy Policy
        </h1>
        <div className="prose prose-neutral max-w-none text-ink-3 leading-relaxed space-y-6">
          <p className="text-base">
            Last updated: April 2026
          </p>
          <p className="text-base">
            PGH Pass is committed to protecting your privacy. This policy explains what data
            we collect, how we use it, and your rights.
          </p>
          <h2 className="text-xl font-semibold text-ink mt-10 mb-3">What we collect</h2>
          <p className="text-base">
            When you join our waitlist, we collect your email address. When the app launches,
            we will collect the information necessary to provide our loyalty points service,
            including your name, email, and transaction history within the PGH Pass network.
          </p>
          <h2 className="text-xl font-semibold text-ink mt-10 mb-3">How we use your data</h2>
          <p className="text-base">
            Your data is used solely to operate the PGH Pass service — tracking your points,
            sending you relevant offers, and improving the experience. We do not sell your
            data to third parties.
          </p>
          <h2 className="text-xl font-semibold text-ink mt-10 mb-3">Contact</h2>
          <p className="text-base">
            Questions about your privacy? Reach us at{' '}
            <a href="mailto:privacy@pghpass.com" className="text-brand-gold hover:underline">
              privacy@pghpass.com
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
