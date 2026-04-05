'use client';

import { WaitlistForm } from './WaitlistForm';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function FinalCTA() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="px-6 md:px-8 py-24 md:py-32 bg-dark text-dark-text">
      <div ref={ref} className="reveal max-w-2xl mx-auto text-center">
        <h2 className="font-serif text-[28px] md:text-[38px] tracking-[-0.03em] mb-4">
          Ready to join?
        </h2>
        <p className="text-base text-dark-text-secondary leading-relaxed mb-10">
          Be the first to know when PGH Pass launches in your neighborhood.
        </p>
        <div className="flex justify-center">
          <WaitlistForm variant="dark" />
        </div>
      </div>
    </section>
  );
}
