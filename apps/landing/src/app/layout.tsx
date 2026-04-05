import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PGH Pass — Earn Rewards at Every Local Spot You Love',
  description:
    'PGH Pass is Pittsburgh\'s city-wide loyalty points network. Earn points at local businesses, redeem anywhere. One app for every local spot.',
  keywords: ['Pittsburgh', 'loyalty', 'rewards', 'local business', 'PGH Pass', 'points'],
  openGraph: {
    title: 'PGH Pass — Earn Rewards at Every Local Spot You Love',
    description:
      'Pittsburgh\'s city-wide loyalty points network. Earn points at local businesses, redeem anywhere.',
    url: 'https://pghpass.com',
    siteName: 'PGH Pass',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://pghpass.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PGH Pass — Shop local. Get rewarded. Keep Pittsburgh thriving.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PGH Pass — Earn Rewards at Every Local Spot You Love',
    description:
      'Pittsburgh\'s city-wide loyalty points network. Earn points at local businesses, redeem anywhere.',
    images: ['https://pghpass.com/og-image.png'],
  },
  metadataBase: new URL('https://pghpass.com'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="font-sans">
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
