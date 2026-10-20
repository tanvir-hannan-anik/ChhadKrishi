import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthRequired } from "@/components/auth/auth-required";
import { isAiConfigured } from "@/lib/ai/config";
import { getPageSession } from "@/lib/auth/session";
import { listTasks } from "@/lib/care/store";
import { todayLocal } from "@/lib/dates";
import { getGarden } from "@/lib/garden/store";
import { CareRoutine } from "./care-routine";

export const metadata: Metadata = { title: "যত্নের রুটিন | ChhadKrishi" };

export default function CarePage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <CareGate />
    </Suspense>
  );
}

async function CareGate() {
  const { session, expired } = await getPageSession();
  if (!session) return <AuthRequired page="care" expired={expired} />;
  const today = todayLocal();
  const [tasks, garden] = await Promise.all([listTasks(session.user.id, today), getGarden(session.user.id)]);
  return <CareRoutine initialTasks={tasks} plants={garden.plants} aiConfigured={isAiConfigured()} />;
}
