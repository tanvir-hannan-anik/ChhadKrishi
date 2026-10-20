import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthRequired } from "@/components/auth/auth-required";
import { isAiConfigured } from "@/lib/ai/config";
import { getPageSession } from "@/lib/auth/session";
import { PlantAnalyzer } from "./plant-analyzer";

export const metadata: Metadata = {
  title: "গাছের ছবি বিশ্লেষণ | ChhadKrishi",
};

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <AnalyzeGate />
    </Suspense>
  );
}

async function AnalyzeGate() {
  const { session, expired } = await getPageSession();
  if (!session) return <AuthRequired page="analyze" expired={expired} />;
  return <PlantAnalyzer aiConfigured={isAiConfigured()} />;
}
