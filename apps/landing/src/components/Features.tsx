const features = [
  {
    title: 'One app, every local spot',
    description:
      'No more juggling punch cards and separate apps. PGH Pass works across the entire network.',
  },
  {
    title: 'Points that work everywhere',
    description:
      'Earn at your morning coffee shop, redeem at your favorite dinner spot. Your loyalty travels with you.',
  },
  {
    title: 'Flash deals & bonus multipliers',
    description:
      'Get surprise point boosts and limited-time offers from businesses near you.',
  },
  {
    title: 'Support local businesses',
    description:
      'Every point you earn puts money back into Pittsburgh\u2019s local economy.',
  },
  {
    title: 'Privacy-first',
    description:
      'Your data stays yours. No selling to advertisers, no creepy tracking across the web.',
  },
  {
    title: 'Built for Pittsburgh',
    description:
      'Not a generic platform slapped with a city name. Designed from day one for how Pittsburgh works.',
  },
];

import Image from 'next/image';

export function Features() {
  return (
    <section
      id="features"
      className="relative px-6 md:px-8 py-16 md:py-32 lg:py-40 text-dark-text overflow-hidden"
    >
      <Image
        src="/features-bg.jpg"
        alt=""
        fill
        className="object-cover object-center z-0"
      />
      <div className="absolute inset-0 bg-dark/80 z-[1]" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-brand-gold mb-4 text-center">
          Why PGH Pass
        </p>
        <h2 className="font-serif text-[28px] md:text-[38px] tracking-[-0.03em] text-center mb-10 md:mb-20">
          Everything you need. Nothing you don&rsquo;t.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6 md:gap-12">
          {features.map((feature) => (
            <div key={feature.title}>
              <h3 className="text-base md:text-lg font-semibold tracking-[-0.02em] mb-2 md:mb-3">
                {feature.title}
              </h3>
              <p className="text-sm md:text-base text-dark-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
