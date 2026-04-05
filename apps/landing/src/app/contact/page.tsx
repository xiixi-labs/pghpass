export const metadata = {
  title: 'Contact — PGH Pass',
};

export default function ContactPage() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6 md:px-8 py-24">
      <div className="max-w-lg w-full text-center">
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-brand-gold mb-4">
          Get in touch
        </p>
        <h1 className="font-serif text-[36px] md:text-[48px] tracking-[-0.03em] text-ink mb-4 leading-[1.1]">
          Contact us
        </h1>
        <p className="text-base text-ink-3 leading-relaxed mb-10">
          Have questions about PGH Pass? Want to bring your business into the network?
          We&rsquo;d love to hear from you.
        </p>
        <div className="space-y-4 text-base text-ink-2">
          <p>
            <span className="font-semibold text-ink">General inquiries</span>
            <br />
            <a href="mailto:hello@pghpass.com" className="text-brand-gold hover:underline">
              hello@pghpass.com
            </a>
          </p>
          <p>
            <span className="font-semibold text-ink">Business partnerships</span>
            <br />
            <a href="mailto:vendors@pghpass.com" className="text-brand-gold hover:underline">
              vendors@pghpass.com
            </a>
          </p>
          <p>
            <span className="font-semibold text-ink">Press</span>
            <br />
            <a href="mailto:press@pghpass.com" className="text-brand-gold hover:underline">
              press@pghpass.com
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
