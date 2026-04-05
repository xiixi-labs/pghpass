'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Launch date bar — static, scrolls away with page */}
      <div className="bg-dark text-center py-2 relative z-[60]">
        <p className="text-xs font-semibold tracking-[0.06em] uppercase text-brand-gold">
          Launching August 23rd
        </p>
      </div>

      {/* Nav — fixed below the date bar */}
      <nav
        className={`sticky top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass bg-surface/72 border-b border-rule/50'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-6xl px-6 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-[26px] text-ink tracking-tight">
              PGH Pass
            </span>
          </Link>

          <Link
            href="#waitlist"
            className="bg-ink text-surface text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-ink-2 transition-colors duration-200"
          >
            Join the Waitlist
          </Link>
        </div>
      </nav>
    </>
  );
}
