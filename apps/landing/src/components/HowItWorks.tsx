const steps = [
  {
    number: '01',
    title: 'Check in',
    description:
      'Walk into any PGH Pass business. Show your QR code or tap to check in.',
  },
  {
    number: '02',
    title: 'Earn points',
    description:
      'Every dollar you spend earns points. Watch them stack up across the city.',
  },
  {
    number: '03',
    title: 'Redeem anywhere',
    description:
      'Use your points at any business in the network. Your loyalty isn\u2019t locked in.',
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 md:px-8 py-24 md:py-32 lg:py-40">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-brand-gold mb-4 text-center">
          How it works
        </p>
        <h2 className="font-serif text-[28px] md:text-[38px] tracking-[-0.03em] text-ink text-center mb-16 md:mb-20">
          Three steps. Zero friction.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {steps.map((step) => (
            <div key={step.number} className="text-center md:text-left">
              <span className="font-serif text-[56px] leading-none text-brand-gold/20 block mb-4">
                {step.number}
              </span>
              <h3 className="text-lg font-semibold text-ink tracking-[-0.02em] mb-3">
                {step.title}
              </h3>
              <p className="text-base text-ink-3 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
