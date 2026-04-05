import Link from 'next/link';

const links = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Contact', href: '/contact' },
];

export function Footer() {
  return (
    <footer className="px-6 md:px-8 py-16 bg-dark text-dark-text-secondary">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="font-serif text-xl text-dark-text tracking-tight">
            PGH Pass
          </span>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} PGH Pass. All rights reserved.
          </p>
        </div>

        <nav className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-dark-text-secondary hover:text-dark-text transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
