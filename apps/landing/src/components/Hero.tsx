import Image from 'next/image';
import { WaitlistForm } from './WaitlistForm';

export function Hero() {
  return (
    <section
      id="waitlist"
      className="relative min-h-[100vh] flex flex-col items-center justify-start px-6 md:px-8 overflow-hidden"
      style={{ marginTop: 'calc(-2rem - 4rem)' }}
    >
      <Image
        src="/hero-bg.png"
        alt=""
        fill
        className="object-cover object-center z-0"
        priority
      />
      <div className="absolute inset-0 bg-screen/60 z-[1]" />

      {/* Spacer to push content below the nav bar */}
      <div className="shrink-0" style={{ height: 'calc(2rem + 4rem + 4rem)' }} />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Eyebrow */}
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-brand-gold mb-6">
          Coming soon to Pittsburgh
        </p>

        {/* Headline */}
        <h1 className="font-serif text-[48px] md:text-[64px] lg:text-[80px] leading-[1.05] tracking-[-0.03em] text-ink mb-6">
          Shop local.<br />
          <em>Get rewarded.</em><br />
          Keep Pittsburgh thriving.
        </h1>

        {/* Subhead */}
        <p className="text-lg md:text-xl text-ink-3 max-w-2xl mx-auto mb-10 leading-relaxed">
          PGH Pass connects you to Pittsburgh&rsquo;s best local businesses with a
          city-wide loyalty points network. One app. Every neighborhood.
        </p>

        {/* Email capture */}
        <div className="flex justify-center mb-6">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
