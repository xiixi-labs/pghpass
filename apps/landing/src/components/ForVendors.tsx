import { WaitlistForm } from './WaitlistForm';

const vendorBenefits = [
  {
    title: 'Real-time analytics',
    description: 'See who visits, how often, and what drives them back.',
  },
  {
    title: 'Hardware included',
    description: 'We provide a tablet and stand for your counter — fully set up and ready to go.',
  },
  {
    title: 'City-wide customer network',
    description:
      'Tap into a shared pool of loyal locals already using PGH Pass at other businesses.',
  },
  {
    title: 'Promotional tools',
    description:
      'Run flash deals, bonus multipliers, and targeted offers to drive foot traffic.',
  },
];

export function ForVendors() {
  return (
    <section className="px-6 md:px-8 py-24 md:py-32 lg:py-40">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-brand-gold mb-4">
          For businesses
        </p>
        <h2 className="font-serif text-[28px] md:text-[38px] tracking-[-0.03em] text-ink mb-6">
          Grow your business with PGH&nbsp;Pass
        </h2>
        <p className="text-base text-ink-3 leading-relaxed mb-12 max-w-lg">
          Join a city-wide loyalty network that sends customers your way — and keeps them
          coming back.
        </p>

        {/* 2x2 benefits */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 mb-12">
          {vendorBenefits.map((benefit) => (
            <div key={benefit.title}>
              <h3 className="text-base font-semibold text-ink tracking-[-0.02em] mb-2">
                {benefit.title}
              </h3>
              <p className="text-sm text-ink-3 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* Waitlist */}
        <WaitlistForm />
      </div>
    </section>
  );
}
