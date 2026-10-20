import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthRequired } from "@/components/auth/auth-required";
import { getPageSession } from "@/lib/auth/session";
import { listOrders } from "@/lib/shop/store";
import { OrdersList } from "./orders-list";

export const metadata: Metadata = { title: "আমার অর্ডার | ChhadKrishi" };

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <OrdersGate />
    </Suspense>
  );
}

async function OrdersGate() {
  const { session, expired } = await getPageSession();
  if (!session) return <AuthRequired page="orders" expired={expired} />;
  return <OrdersList initial={await listOrders(session.user.id)} />;
}
