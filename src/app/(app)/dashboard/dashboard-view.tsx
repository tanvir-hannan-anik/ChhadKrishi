"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ArrowUp, CalendarCheck, Check, ImagePlus, MessageCircle, Package, ShoppingBasket, Sprout, Sun } from "lucide-react";
import { FeatureCards } from "@/components/ai/feature-cards";
import { AppHeader } from "@/components/app-header";
import { toast } from "@/components/app/toaster";
import { Card, secondaryButton } from "@/components/app/ui";
import { EASE_OUT } from "@/components/motion/reveal";
import { WeatherCard } from "@/components/weather/weather-card";
import type { CareTask } from "@/lib/care/store";
import type { ConversationSummary } from "@/lib/chat/store";
import { apiFetch } from "@/lib/client-api";
import type { Garden } from "@/lib/garden/store";
import { formatNumber } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";
import type { OrderSummary } from "@/lib/shop/store";

interface DashboardProps {
  name: string;
  todayTasks: CareTask[];
  hasRoutine: boolean;
  garden: Garden;
  conversations: ConversationSummary[];
  orders: OrderSummary[];
  cartCount: number;
}

export function DashboardView(props: DashboardProps) {
  const { t, lang } = useLanguage();
  const d = t.dashboard;
  const [tasks, setTasks] = useState(props.todayTasks);
  const done = tasks.filter((task) => task.doneToday).length;

  const toggle = async (task: CareTask) => {
    const next = !task.doneToday;
    setTasks((list) => list.map((x) => (x.id === task.id ? { ...x, doneToday: next } : x)));
    const result = await apiFetch(`/api/care/tasks/${task.id}/done`, { method: "PUT", json: { done: next } });
    if (!result.ok) {
      setTasks((list) => list.map((x) => (x.id === task.id ? { ...x, doneToday: !next } : x)));
      if (result.status !== 401) toast(t.common.errors.GENERIC, "error");
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={(t) => t.appNav.dashboard} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
          <h1 className="font-display text-2xl text-ink sm:text-4xl">{d.greeting(props.name)}</h1>
          <p className="mt-1 text-sm text-ink-soft sm:mt-2 sm:text-base">{d.subtitle}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.04 }} className="mt-5 sm:mt-6">
          <WeatherCard />
        </motion.div>

        {/* AI first: one tap into the chat, then the main AI features. */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.08 }}
          aria-label={t.aiFeatures.label}
          className="mt-5 sm:mt-6"
        >
          <Link
            href="/chat"
            className="group flex min-h-14 items-center gap-3 rounded-[26px] bg-white py-2 pr-2 pl-5 text-ink-faint shadow-soft ring-1 ring-line transition-shadow hover:shadow-lift"
          >
            <MessageCircle className="h-5 w-5 shrink-0 text-leaf" />
            <span className="min-w-0 flex-1 truncate">{t.chat.placeholder}</span>
            <ImagePlus className="hidden h-5 w-5 shrink-0 text-ink-soft sm:block" aria-hidden />
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-paper transition-transform group-hover:scale-105">
              <ArrowUp className="h-5 w-5" strokeWidth={2.4} />
            </span>
          </Link>
          <FeatureCards className="mt-3" />
        </motion.section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card
            title={d.todayTasks}
            action={
              <Link href="/care" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
                {d.viewAll} <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            {tasks.length === 0 ? (
              <div className="rounded-2xl bg-cream/70 p-5 text-center">
                <p className="text-ink-soft">{props.hasRoutine ? d.noTasksToday : d.noRoutine}</p>
                {!props.hasRoutine && (
                  <Link href="/care" className={`${secondaryButton} mt-3`}>
                    <CalendarCheck className="h-4 w-4" /> {d.setUpRoutine}
                  </Link>
                )}
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-ink-soft" aria-live="polite">
                  {done === tasks.length ? t.care.allDone : d.tasksDone(formatNumber(done, lang), formatNumber(tasks.length, lang))}
                </p>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-moss">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-leaf to-lime" animate={{ width: `${(done / tasks.length) * 100}%` }} transition={{ duration: 0.5, ease: EASE_OUT }} />
                </div>
                <ul className="space-y-2">
                  {tasks.slice(0, 6).map((task) => (
                    <li key={task.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-cream/70 px-3 py-2.5 hover:bg-moss/70">
                        <input type="checkbox" checked={task.doneToday} onChange={() => void toggle(task)} className="peer sr-only" />
                        <span
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-leaf ${
                            task.doneToday ? "border-leaf bg-leaf text-paper" : "border-ink-faint/40 bg-white"
                          }`}
                        >
                          {task.doneToday && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                        <span className={`flex-1 truncate text-sm ${task.doneToday ? "text-ink-faint line-through" : "text-ink"}`}>{task.title}</span>
                        <span className="text-xs text-ink-faint">{task.plantName ?? t.care.wholeGarden}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card
            title={d.garden}
            action={
              <Link href="/garden" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
                {d.viewAll} <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            {props.garden.plants.length === 0 ? (
              <div className="rounded-2xl bg-cream/70 p-5 text-center">
                <p className="text-ink-soft">{d.noPlants}</p>
                <Link href="/garden" className={`${secondaryButton} mt-3`}>
                  <Sprout className="h-4 w-4" /> {d.addPlants}
                </Link>
              </div>
            ) : (
              <>
                <p className="text-sm text-ink-soft">
                  {d.plantsCount(formatNumber(props.garden.plants.length, lang))}
                  {props.garden.sunHours !== null && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      · <Sun className="h-3.5 w-3.5 text-clay" /> {t.garden.sunHours(formatNumber(props.garden.sunHours, lang))}
                    </span>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {props.garden.plants.slice(0, 10).map((plant) => (
                    <span key={plant.id} className="rounded-full bg-sprout/60 px-3 py-1 text-sm text-forest">
                      {plant.name} · {formatNumber(plant.potCount, lang)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card
            title={d.recentChats}
            action={
              <Link href="/chat" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
                {d.startChat} <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            {props.conversations.length === 0 ? (
              <p className="rounded-2xl bg-cream/70 p-5 text-center text-ink-soft">{d.noChats}</p>
            ) : (
              <ul className="space-y-1">
                {props.conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <Link href={`/chat/${conversation.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-ink-soft hover:bg-moss/60 hover:text-forest">
                      <MessageCircle className="h-4 w-4 shrink-0 text-leaf" />
                      <span className="truncate">{conversation.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title={d.orders}
            action={
              <Link href="/shop/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
                {d.viewAll} <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            {props.cartCount > 0 && (
              <Link href="/shop" className="mb-3 flex items-center gap-2 rounded-xl bg-moss/70 px-3 py-2 text-sm text-forest">
                <ShoppingBasket className="h-4 w-4" /> {d.cartItems(formatNumber(props.cartCount, lang))}
              </Link>
            )}
            {props.orders.length === 0 ? (
              <p className="rounded-2xl bg-cream/70 p-5 text-center text-ink-soft">{d.noOrders}</p>
            ) : (
              <ul className="space-y-2">
                {props.orders.map((order) => (
                  <li key={order.id} className="flex items-center gap-3 rounded-xl bg-cream/70 px-3 py-2.5 text-sm">
                    <Package className="h-4 w-4 shrink-0 text-leaf" />
                    <span className="flex-1 text-ink">৳{formatNumber(order.totalBdt, lang)}</span>
                    <span className="text-xs text-ink-faint">{t.orders.status[order.status]}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
