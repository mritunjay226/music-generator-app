import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingLibrary } from "@/components/landing/LandingLibrary";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingCTA } from "@/components/landing/LandingCTA";
export default function LandingPage() {
  return (
    <div className="min-h-screen landing-bg flex flex-col">
      <LandingNav />
      <main className="flex-1 flex flex-col items-center">
        <LandingHero />
        <LandingFeatures />
        <LandingLibrary />
        <LandingHowItWorks />
        <LandingPricing />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
