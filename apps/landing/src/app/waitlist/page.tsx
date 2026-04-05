import { WaitlistForm } from '@/components/WaitlistForm';

export const metadata = {
  title: 'Join the Waitlist — PGH Pass',
  description: 'Sign up for early access to Pittsburgh\u2019s city-wide loyalty network.',
};

export default function WaitlistPage() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6 md:px-8 py-24">
      <div className="max-w-md w-full text-center">
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-brand-gold mb-4">
          Get early access
        </p>
        <h1 className="font-serif text-[36px] md:text-[48px] tracking-[-0.03em] text-ink mb-4 leading-[1.1]">
          Join the waitlist
        </h1>
        <p className="text-base text-ink-3 leading-relaxed mb-10">
          Be the first to know when PGH Pass launches in your neighborhood.
        </p>
        <WaitlistForm />
      </div>
    </section>
  );
}
