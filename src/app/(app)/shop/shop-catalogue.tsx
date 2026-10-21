"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, ExternalLink, Info, Minus, Package, Plus, ShoppingCart, Shovel, Sprout as SproutIcon, Trash2, Wheat } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { toast } from "@/components/app/toaster";
import { FieldError, FieldLabel, Spinner, inputClass, primaryButton, secondaryButton } from "@/components/app/ui";
import { EASE_OUT, Reveal } from "@/components/motion/reveal";
import { apiFetch } from "@/lib/client-api";
import { formatNumber, type Lang, type ShopCategory } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";
import { CATALOGUE } from "@/lib/shop/catalogue";
import type { CartLine, Product } from "@/lib/shop/store";

const ICONS = { seed: SproutIcon, pot: Package, fertilizer: Wheat, tool: Shovel } as const;
const TINTS = { seed: "bg-sprout text-forest", pot: "bg-clay/15 text-clay", fertilizer: "bg-moss text-leaf", tool: "bg-cream text-clay" } as const;
const MAX_QUANTITY = 20;

const nameOf = (p: { nameBn: string; nameEn: string }, lang: Lang) => (lang === "bn" ? p.nameBn : p.nameEn);
const taka = (n: number, lang: Lang) => `৳${formatNumber(n, lang)}`;

export function ShopCatalogue({ userName, products, initialCart }: { userName: string; products: Product[]; initialCart: CartLine[] }) {
  const { t, lang } = useLanguage();
  const s = t.features.shop;
  const [filter, setFilter] = useState<ShopCategory>("all");
  const [cart, setCart] = useState(initialCart);
  const [pending, setPending] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const items = products.filter((p) => filter === "all" || p.category === filter);

  // Arriving from a chat recommendation (/shop#product-<id>): bring that item into view.
  useEffect(() => {
    const id = /^#product-([\w-]+)$/.exec(window.location.hash)?.[1];
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      setHighlight(id);
      document.getElementById(`product-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    const timer = window.setTimeout(() => setHighlight(null), 3000);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);
  const quantityOf = (id: string) => cart.find((line) => line.id === id)?.quantity ?? 0;
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  const setQuantity = async (product: Product, quantity: number) => {
    if (quantity < 0 || quantity > MAX_QUANTITY || pending) return;
    setPending(product.id);
    const result = await apiFetch<{ cart: CartLine[] }>("/api/shop/cart", { method: "PUT", json: { productId: product.id, quantity } });
    setPending(null);
    if (result.ok) {
      const added = quantity > quantityOf(product.id);
      setCart(result.data.cart);
      if (added && quantityOf(product.id) === 0) toast(t.cart.added);
    } else if (result.status !== 401) toast(t.common.errors[result.error === "NOT_FOUND" ? "NOT_FOUND" : result.error === "NETWORK" ? "NETWORK" : "GENERIC"], "error");
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.appNav.shop} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-4 py-5 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <Reveal>
            <p className="text-sm font-semibold text-leaf">{t.shopPage.greeting(userName)}</p>
            <h1 className="mt-2 font-display text-2xl text-ink sm:text-4xl">{t.shopPage.title}</h1>
            <p className="mt-2 max-w-xl text-ink-soft">{t.shopPage.subtitle}</p>
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-moss/70 px-4 py-3 text-sm text-forest">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              {t.cart.sampleNote}
            </p>
          </Reveal>

          <div role="radiogroup" aria-label={t.shopPage.title} className="mt-6 flex flex-wrap gap-2">
            {(Object.keys(s.filters) as ShopCategory[]).map((key) => {
              const selected = key === filter;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFilter(key)}
                  className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${selected ? "text-paper" : "text-ink-soft ring-1 ring-line hover:text-forest"}`}
                >
                  {selected && <motion.span layoutId="shop-page-filter" className="absolute inset-0 rounded-full bg-forest" />}
                  <span className="relative">{s.filters[key]}</span>
                </button>
              );
            })}
          </div>

          <motion.ul layout className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {items.map((product) => {
                const Icon = ICONS[product.category];
                const qty = quantityOf(product.id);
                const busy = pending === product.id;
                return (
                  <motion.li
                    key={product.id}
                    id={`product-${product.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                    className={`flex scroll-mt-24 flex-col rounded-3xl bg-white p-4 shadow-soft transition-shadow duration-500 ${highlight === product.id ? "ring-2 ring-leaf shadow-lift" : "ring-1 ring-line"}`}
                  >
                    <span className={`relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-2xl ${TINTS[product.category]}`}>
                      {product.image ? (
                        <Image src={product.image} alt={nameOf(product, lang)} fill sizes="(min-width: 768px) 14rem, 45vw" className="object-cover" />
                      ) : (
                        <Icon className="h-10 w-10" />
                      )}
                    </span>
                    <p className="mt-3 flex-1 font-medium text-ink">{nameOf(product, lang)}</p>
                    <p className="mt-0.5 font-semibold text-forest">{taka(product.priceBdt, lang)}</p>
                    {qty === 0 ? (
                      <button type="button" onClick={() => void setQuantity(product, 1)} disabled={busy} className={`${primaryButton} mt-3 px-3 py-2 text-sm`}>
                        {busy ? <Spinner /> : <Plus className="h-4 w-4" />} {t.cart.add}
                      </button>
                    ) : (
                      <QuantityStepper qty={qty} busy={busy} onChange={(n) => void setQuantity(product, n)} />
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>

          <PhotoCredits products={products} />
        </div>

        <CartPanel cart={cart} count={count} pending={pending} onQuantity={(line, n) => void setQuantity(line, n)} onOrdered={() => setCart([])} />
      </main>
    </div>
  );
}

/** Attribution for the freely licensed product photos, as their licences require. */
function PhotoCredits({ products }: { products: Product[] }) {
  const { t, lang } = useLanguage();
  const credited = CATALOGUE.filter((item) => products.some((p) => p.id === item.id && p.image));
  if (credited.length === 0) return null;
  return (
    <details className="mt-8 rounded-2xl px-1 text-xs text-ink-faint">
      <summary className="cursor-pointer font-medium hover:text-forest">{t.cart.photoCredits}</summary>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {credited.map((item) => (
          <li key={item.id}>
            <a href={item.credit.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-forest hover:underline">
              {nameOf(item, lang)} <ExternalLink className="h-3 w-3" aria-hidden />
            </a>{" "}
            — {item.credit.author},{" "}
            <a href={item.credit.licenseUrl} target="_blank" rel="noreferrer license" className="hover:text-forest hover:underline">
              {item.credit.license}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function QuantityStepper({ qty, busy, onChange }: { qty: number; busy: boolean; onChange: (n: number) => void }) {
  const { t, lang } = useLanguage();
  return (
    <div className="mt-3 flex items-center justify-between rounded-full bg-moss/70 p-1">
      <button type="button" onClick={() => onChange(qty - 1)} disabled={busy} aria-label={qty === 1 ? t.cart.remove : t.cart.decrease} className="rounded-full p-1.5 text-forest hover:bg-white disabled:opacity-50">
        {qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span className="text-sm font-semibold text-forest" aria-live="polite">
        {busy ? <Spinner /> : t.cart.inCart(formatNumber(qty, lang))}
      </span>
      <button type="button" onClick={() => onChange(qty + 1)} disabled={busy || qty >= MAX_QUANTITY} aria-label={t.cart.increase} className="rounded-full p-1.5 text-forest hover:bg-white disabled:opacity-50">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function CartPanel({
  cart,
  count,
  pending,
  onQuantity,
  onOrdered,
}: {
  cart: CartLine[];
  count: number;
  pending: string | null;
  onQuantity: (line: CartLine, n: number) => void;
  onOrdered: () => void;
}) {
  const { t, lang } = useLanguage();
  const [step, setStep] = useState<"cart" | "checkout" | "done">("cart");
  const total = cart.reduce((sum, line) => sum + line.priceBdt * line.quantity, 0);

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start" aria-label={t.cart.title}>
      <div className="rounded-3xl bg-white p-5 shadow-lift ring-1 ring-line">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <ShoppingCart className="h-5 w-5 text-leaf" /> {t.cart.title}
          {count > 0 && <span className="ml-auto rounded-full bg-forest px-2 py-0.5 text-xs text-paper">{formatNumber(count, lang)}</span>}
        </h2>

        <AnimatePresence mode="wait" initial={false}>
          {step === "done" ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center" role="status">
              <CheckCircle2 className="mx-auto h-12 w-12 text-leaf" />
              <p className="mt-3 font-display text-xl text-ink">{t.checkout.success}</p>
              <p className="mt-1 text-sm text-ink-soft">{t.checkout.requestNote}</p>
              <div className="mt-5 flex flex-col gap-2">
                <Link href="/shop/orders" className={primaryButton}>
                  {t.checkout.viewOrders}
                </Link>
                <button type="button" onClick={() => setStep("cart")} className={secondaryButton}>
                  {t.orders.goShop}
                </button>
              </div>
            </motion.div>
          ) : cart.length === 0 ? (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-2xl bg-cream/70 px-4 py-6 text-center text-sm text-ink-soft">
              {t.cart.empty}
            </motion.p>
          ) : (
            <motion.div key="lines" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ul className="mt-4 divide-y divide-line">
                {cart.map((line) => (
                  <li key={line.id} className="flex items-center gap-3 py-3">
                    {line.image && <Image src={line.image} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{nameOf(line, lang)}</p>
                      <p className="text-xs text-ink-faint">
                        {taka(line.priceBdt, lang)} × {formatNumber(line.quantity, lang)}
                      </p>
                    </div>
                    {step === "cart" ? (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => onQuantity(line, line.quantity - 1)} disabled={pending === line.id} aria-label={t.cart.decrease} className="rounded-full p-1 hover:bg-moss disabled:opacity-40">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm">{formatNumber(line.quantity, lang)}</span>
                        <button
                          type="button"
                          onClick={() => onQuantity(line, line.quantity + 1)}
                          disabled={pending === line.id || line.quantity >= MAX_QUANTITY}
                          aria-label={t.cart.increase}
                          className="rounded-full p-1 hover:bg-moss disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-ink">{taka(line.priceBdt * line.quantity, lang)}</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-3 font-semibold text-ink">
                <span>{t.cart.total}</span>
                <span>{taka(total, lang)}</span>
              </div>
              {step === "cart" ? (
                <button type="button" onClick={() => setStep("checkout")} disabled={pending !== null} className={`${primaryButton} mt-4 w-full`}>
                  {t.cart.checkout}
                </button>
              ) : (
                <CheckoutForm
                  onBack={() => setStep("cart")}
                  onDone={() => {
                    onOrdered();
                    setStep("done");
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

type CheckoutField = "customerName" | "phone" | "address";

function CheckoutForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { t } = useLanguage();
  const k = t.checkout;
  const [form, setForm] = useState({ customerName: "", phone: "", address: "", note: "" });
  const [errors, setErrors] = useState<CheckoutField[]>([]);
  const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    // Quick client checks for instant feedback; the server validates everything again.
    const local: CheckoutField[] = [];
    if (form.customerName.trim().length < 2) local.push("customerName");
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(form.phone.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6)).replace(/[\s-]/g, ""))) local.push("phone");
    if (form.address.trim().length < 8) local.push("address");
    setErrors(local);
    if (local.length) return;

    setBusy(true);
    const result = await apiFetch("/api/shop/orders", { method: "POST", json: form });
    setBusy(false);
    if (result.ok) {
      toast(k.success);
      onDone();
    } else if (result.status !== 401) {
      if (result.error === "CART_EMPTY") toast(k.cartEmpty, "error");
      else {
        setErrors((result.fields ?? []).filter((f): f is CheckoutField => ["customerName", "phone", "address"].includes(f)));
        toast(t.common.errors[result.error === "VALIDATION_FAILED" ? "VALIDATION_FAILED" : result.error === "NETWORK" ? "NETWORK" : "GENERIC"], "error");
      }
    }
  };

  const field = (key: CheckoutField) => ({
    "aria-invalid": errors.includes(key),
    "aria-describedby": errors.includes(key) ? `${key}-error` : undefined,
  });

  return (
    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} onSubmit={submit} noValidate className="mt-4 space-y-3 overflow-hidden">
      <p className="font-semibold text-ink">{k.title}</p>
      <div>
        <FieldLabel htmlFor="customerName">{k.name}</FieldLabel>
        <input id="customerName" autoComplete="name" value={form.customerName} onChange={update("customerName")} maxLength={80} className={inputClass} {...field("customerName")} />
        <FieldError id="customerName" message={errors.includes("customerName") ? k.fieldErrors.customerName : null} />
      </div>
      <div>
        <FieldLabel htmlFor="phone">{k.phone}</FieldLabel>
        <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={update("phone")} maxLength={16} placeholder={k.phonePlaceholder} className={inputClass} {...field("phone")} />
        <FieldError id="phone" message={errors.includes("phone") ? k.fieldErrors.phone : null} />
      </div>
      <div>
        <FieldLabel htmlFor="address">{k.address}</FieldLabel>
        <textarea id="address" autoComplete="street-address" rows={2} value={form.address} onChange={update("address")} maxLength={300} placeholder={k.addressPlaceholder} className={`${inputClass} resize-none`} {...field("address")} />
        <FieldError id="address" message={errors.includes("address") ? k.fieldErrors.address : null} />
      </div>
      <div>
        <FieldLabel htmlFor="note">{k.note}</FieldLabel>
        <input id="note" value={form.note} onChange={update("note")} maxLength={300} className={inputClass} />
      </div>
      <p className="flex items-start gap-2 text-xs text-ink-faint">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {k.requestNote}
      </p>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={`${primaryButton} flex-1`}>
          {busy && <Spinner />} {busy ? k.submitting : k.submit}
        </button>
        <button type="button" onClick={onBack} disabled={busy} className={secondaryButton}>
          {t.common.cancel}
        </button>
      </div>
    </motion.form>
  );
}
