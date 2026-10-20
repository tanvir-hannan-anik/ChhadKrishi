import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthRequired } from "@/components/auth/auth-required";
import { isAiConfigured, isImageConfigured } from "@/lib/ai/config";
import { getPageSession } from "@/lib/auth/session";
import { GardenDesigner } from "./garden-designer";

export const metadata: Metadata = {
  title: "এআই গার্ডেন ডিজাইনার | ChhadKrishi",
};

export default function DesignerPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <DesignerGate />
    </Suspense>
  );
}

async function DesignerGate() {
  const { session, expired } = await getPageSession();
  if (!session) return <AuthRequired page="designer" expired={expired} />;
  return <GardenDesigner aiConfigured={isAiConfigured()} imageConfigured={isImageConfigured()} />;
}
