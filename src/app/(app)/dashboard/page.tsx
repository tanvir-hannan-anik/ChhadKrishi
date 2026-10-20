import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthRequired } from "@/components/auth/auth-required";
import { getPageSession } from "@/lib/auth/session";
import { listTasks } from "@/lib/care/store";
import { listConversations } from "@/lib/chat/store";
import { todayLocal } from "@/lib/dates";
import { getGarden } from "@/lib/garden/store";
import { getCart, listOrders } from "@/lib/shop/store";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "ড্যাশবোর্ড | ChhadKrishi" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <DashboardGate />
    </Suspense>
  );
}

async function DashboardGate() {
  const { session, expired } = await getPageSession();
  if (!session) return <AuthRequired page="dashboard" expired={expired} />;
  const userId = session.user.id;
  const [tasks, garden, conversations, orders, cart] = await Promise.all([
    listTasks(userId, todayLocal()),
    getGarden(userId),
    listConversations(userId, 4),
    listOrders(userId),
    getCart(userId),
  ]);
  return (
    <DashboardView
      name={session.user.name}
      todayTasks={tasks.filter((task) => task.dueToday)}
      hasRoutine={tasks.length > 0}
      garden={garden}
      conversations={conversations}
      orders={orders.slice(0, 2)}
      cartCount={cart.reduce((sum, line) => sum + line.quantity, 0)}
    />
  );
}
