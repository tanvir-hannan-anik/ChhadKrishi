import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthRequired } from "@/components/auth/auth-required";
import { getPageSession } from "@/lib/auth/session";
import { getGarden } from "@/lib/garden/store";
import { GardenManager } from "./garden-manager";

export const metadata: Metadata = { title: "আমার বাগান | ChhadKrishi" };

export default function GardenPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <GardenGate />
    </Suspense>
  );
}

async function GardenGate() {
  const { session, expired } = await getPageSession();
  if (!session) return <AuthRequired page="garden" expired={expired} />;
  return <GardenManager initial={await getGarden(session.user.id)} />;
}
