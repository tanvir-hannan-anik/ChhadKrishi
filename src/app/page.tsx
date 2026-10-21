import { Suspense } from "react";
import { Benefits } from "@/components/landing/benefits";
import { CallToAction, SiteFooter } from "@/components/landing/closing";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SiteHeader } from "@/components/landing/site-header";
import { UserGuide } from "@/components/landing/user-guide";
import { WeatherIntro } from "@/components/landing/weather-intro";
import { getServerSession } from "@/lib/auth/session";

/**
 * Chat-first home. The composer is part of the static shell, so it is usable at once; the
 * marketing sections stream in below it for visitors only — signed-in gardeners get a clean,
 * distraction-free chat start page.
 */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero />
        <Suspense fallback={null}>
          <VisitorOnly>
            <Benefits />
            <Features />
            <WeatherIntro />
            <HowItWorks />
            <UserGuide />
            <CallToAction />
          </VisitorOnly>
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <VisitorOnly>
          <SiteFooter />
        </VisitorOnly>
      </Suspense>
    </>
  );
}

async function VisitorOnly({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  return session ? null : <>{children}</>;
}
