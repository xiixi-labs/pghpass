'use client';

import { useMemo } from 'react';

const allPlaces = [
  'Lawrenceville', 'Strip District', 'Squirrel Hill', 'Shadyside', 'South Side',
  'East Liberty', 'Oakland', 'Mt. Washington', 'Bloomfield', 'Polish Hill',
  'North Side', 'Regent Square', 'Morningside', 'Highland Park', 'Garfield',
  'Point Breeze', 'Brookline', 'Dormont', 'Beechview', 'Greenfield', 'Hazelwood',
  'Cranberry Township', 'Mars', 'Wexford', 'Ross Township', 'McCandless',
  'Pine Township', 'Gibsonia', 'Allison Park', 'Etna', 'Millvale', 'Sharpsburg',
  'Washington', 'Canonsburg', 'McMurray', 'Peters Township', 'Bethel Park',
  'Mt. Lebanon', 'Upper St. Clair', 'South Park', 'Castle Shannon', 'Brentwood',
  'Whitehall', 'Baldwin', 'Pleasant Hills', 'Bridgeville', 'Carnegie',
  'Greensburg', 'Irwin', 'North Huntingdon', 'Murrysville', 'Monroeville',
  'Penn Hills', 'Wilkinsburg', 'Swissvale', 'Edgewood', 'Forest Hills',
  'Turtle Creek', 'Braddock', 'Homestead', 'West Mifflin', 'McKeesport', 'Plum',
  'Robinson Township', 'Moon Township', 'Coraopolis', 'Sewickley',
  'McKees Rocks', 'Crafton', 'Ingram',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Place({ name }: { name: string }) {
  return (
    <>
      <span className="font-serif text-lg text-ink-2 tracking-[-0.01em] whitespace-nowrap shrink-0">
        {name}
      </span>
      <span className="text-brand-gold mx-3 select-none shrink-0" aria-hidden>·</span>
    </>
  );
}

export function PittsburghPride() {
  const [topRow, bottomRow] = useMemo(() => {
    const shuffled = shuffle(allPlaces);
    const mid = Math.ceil(shuffled.length / 2);
    return [shuffled.slice(0, mid), shuffled.slice(mid)];
  }, []);

  return (
    <section className="py-24 md:py-32 lg:py-40 bg-surface overflow-hidden">
      <div className="max-w-4xl mx-auto text-center px-6 md:px-8">
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-brand-gold mb-4">
          Made here
        </p>
        <h2 className="font-serif text-[28px] md:text-[38px] tracking-[-0.03em] text-ink mb-8">
          Built in Pittsburgh. For Pittsburgh.
        </h2>
        <p className="text-base md:text-lg text-ink-3 leading-relaxed max-w-2xl mx-auto mb-12">
          PGH Pass isn&rsquo;t a Silicon Valley import. It&rsquo;s built by people who live
          here, shop here, and believe the best way to support local is to make loyalty
          effortless.
        </p>
      </div>

      <div className="space-y-6 relative">
        {/* Edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 md:w-40 bg-gradient-to-r from-surface to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 md:w-40 bg-gradient-to-l from-surface to-transparent z-10" />

        {/* Top row — scrolls left */}
        <div className="relative">
          <div className="flex items-center animate-scroll-left">
            {topRow.map((name) => <Place key={`a-${name}`} name={name} />)}
            {topRow.map((name) => <Place key={`b-${name}`} name={name} />)}
          </div>
        </div>

        {/* Bottom row — scrolls right */}
        <div className="relative">
          <div className="flex items-center animate-scroll-right">
            {bottomRow.map((name) => <Place key={`a-${name}`} name={name} />)}
            {bottomRow.map((name) => <Place key={`b-${name}`} name={name} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
