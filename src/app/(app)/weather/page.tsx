import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthRequired } from "@/components/auth/auth-required";
import { getPageSession } from "@/lib/auth/session";
import { WeatherView } from "./weather-view";

export const metadata: Metadata = { title: "আবহাওয়া | ChhadKrishi" };

export default function WeatherPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <WeatherGate />
    </Suspense>
  );
}

async function WeatherGate() {
  const { session, expired } = await getPageSession();
  if (!session) return <AuthRequired page="weather" expired={expired} />;
  return <WeatherView />;
}
