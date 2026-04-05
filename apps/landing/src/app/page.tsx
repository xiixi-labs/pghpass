import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { ForVendors } from '@/components/ForVendors';
import { PittsburghPride } from '@/components/PittsburghPride';
import { FinalCTA } from '@/components/FinalCTA';
import { LaunchDate } from '@/components/LaunchDate';

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <ForVendors />
      <PittsburghPride />
      <LaunchDate />
      <FinalCTA />
    </>
  );
}
