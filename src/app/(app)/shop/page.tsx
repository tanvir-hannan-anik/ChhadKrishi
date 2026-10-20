import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthRequired } from "@/components/auth/auth-required";
import { getPageSession } from "@/lib/auth/session";
import { getCart, listProducts } from "@/lib/shop/store";
import { ShopCatalogue } from "./shop-catalogue";

export const metadata: Metadata = {
  title: "কৃষি শপ | ChhadKrishi",
};

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <ShopGate />
    </Suspense>
  );
}

async function ShopGate() {
  const { session, expired } = await getPageSession();
  if (!session) return <AuthRequired page="shop" expired={expired} />;
  const [products, cart] = await Promise.all([listProducts(), getCart(session.user.id)]);
  return <ShopCatalogue userName={session.user.name} products={products} initialCart={cart} />;
}
