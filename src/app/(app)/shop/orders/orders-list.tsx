"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Info, MapPin, Package, Phone, ShoppingBasket } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { toast } from "@/components/app/toaster";
import { Card, EmptyState, PageIntro, Spinner, primaryButton } from "@/components/app/ui";
import { EASE_OUT } from "@/components/motion/reveal";
import { apiFetch } from "@/lib/client-api";
import { formatNumber, type Lang } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";
import type { OrderSummary } from "@/lib/shop/store";

const formatDate = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(iso));

export function OrdersList({ initial }: { initial: OrderSummary[] }) {
  const { t, lang } = useLanguage();
  const o = t.orders;
  const [orders, setOrders] = useState(initial);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const cancel = async (order: OrderSummary) => {
    if (confirming !== order.id) return setConfirming(order.id);
    setBusy(order.id);
    const result = await apiFetch(`/api/shop/orders/${order.id}`, { method: "PATCH", json: { status: "cancelled" } });
    setBusy(null);
    setConfirming(null);
    if (result.ok) {
      setOrders((list) => list.map((x) => (x.id === order.id ? { ...x, status: "cancelled" } : x)));
      toast(o.cancelled);
    } else if (result.status !== 401) toast(result.error === "NOT_CANCELLABLE" ? o.notCancellable : t.common.errors.GENERIC, "error");
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.appNav.orders} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-5 sm:px-6 sm:py-10">
        <PageIntro
          title={o.title}
          subtitle={o.subtitle}
          action={
            <Link href="/shop" className={primaryButton}>
              <ShoppingBasket className="h-4 w-4" /> {o.goShop}
            </Link>
          }
        />
        <p className="flex items-start gap-2 rounded-2xl bg-moss/70 px-4 py-3 text-sm text-forest">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> {o.paymentNote}
        </p>

        {orders.length === 0 ? (
          <EmptyState icon={<Package className="h-6 w-6" />} text={o.empty} />
        ) : (
          <ul className="space-y-4">
            {orders.map((order, i) => (
              <motion.li key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.35, ease: EASE_OUT }}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-ink-faint">{o.placedOn(formatDate(order.createdAt, lang))}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.status === "requested" ? "bg-[#f4e3b5] text-[#7a5a12]" : "bg-cream text-ink-faint"}`}>
                      {o.status[order.status]}
                    </span>
                  </div>
                  <ul className="mt-3 divide-y divide-line text-sm">
                    {order.items.map((item) => (
                      <li key={item.productId} className="flex justify-between py-2">
                        <span className="text-ink">
                          {lang === "bn" ? item.nameBn : item.nameEn} × {formatNumber(item.quantity, lang)}
                        </span>
                        <span className="text-ink-soft">৳{formatNumber(item.unitPriceBdt * item.quantity, lang)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold text-ink">
                    <span>{o.total}</span>
                    <span>৳{formatNumber(order.totalBdt, lang)}</span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-ink-soft">
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-leaf" /> {order.customerName}, {order.address}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-leaf" /> {order.phone}
                    </p>
                  </div>
                  {order.status === "requested" && (
                    <button
                      type="button"
                      onClick={() => void cancel(order)}
                      onBlur={() => setConfirming(null)}
                      disabled={busy === order.id}
                      className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        confirming === order.id ? "bg-clay text-paper" : "text-clay ring-1 ring-clay/30 hover:bg-clay/10"
                      }`}
                    >
                      {busy === order.id && <Spinner />} {confirming === order.id ? o.cancelConfirm : o.cancel}
                    </button>
                  )}
                </Card>
              </motion.li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
