'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';

export function LaunchDate() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="bg-dark py-16 md:py-20">
      <div ref={ref} className="reveal text-center">
        <p className="font-serif italic text-[28px] md:text-[38px] lg:text-[44px] tracking-[-0.03em] text-brand-gold">
          Launching August 23rd, 2026
        </p>
      </div>
    </section>
  );
}
