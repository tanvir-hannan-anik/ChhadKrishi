"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BookOpen, ExternalLink, Package, Play, Search, ShoppingBasket, Sprout, Wheat } from "lucide-react";
import { EASE_OUT } from "@/components/motion/reveal";
import type { ChatResources, ProductResource, VideoResource } from "@/lib/chat/resources";
import { formatNumber } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";

const PRODUCT_ICONS = { seed: Sprout, pot: Package, fertilizer: Wheat } as const;
const PRODUCT_TINTS = { seed: "bg-sprout text-forest", pot: "bg-clay/15 text-clay", fertilizer: "bg-moss text-leaf" } as const;

const rowClass = "-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin]";

/**
 * Videos and shop items shown below an answer — never above it. Each group is one compact,
 * horizontally scrolling row; nothing renders when there is nothing relevant.
 */
export function ResourceCards({ resources, streaming }: { resources: ChatResources; streaming: boolean }) {
  const { t } = useLanguage();
  const r = t.resources;

  if (resources.status === "loading") {
    if (!streaming) return null;
    return (
      <p role="status" className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leaf" /> {r.finding}
      </p>
    );
  }
  const sources = resources.sources ?? [];
  if (resources.videos.length === 0 && resources.products.length === 0 && sources.length === 0) return null;

  return (
    <motion.section
      aria-label={r.label}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="mt-4 space-y-3 border-t border-line pt-3"
    >
      {sources.length > 0 && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <BookOpen className="h-3.5 w-3.5 text-leaf" /> {r.sources}
          </h3>
          <ol className="space-y-1">
            {sources.map((source, index) => (
              <li key={`${source.url}-${index}`}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 rounded-xl px-2 py-1.5 text-xs text-ink-soft hover:bg-moss/60 hover:text-forest"
                >
                  <span className="mt-px inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded bg-moss px-1 text-[10px] font-bold text-forest">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="line-clamp-1 font-medium text-ink group-hover:text-forest">{source.title}</span>
                    <span className="line-clamp-1">
                      {source.section} · {source.publisher}
                      {source.year ? `, ${source.year}` : ""}
                    </span>
                  </span>
                  <ExternalLink className="mt-0.5 ml-auto h-3 w-3 shrink-0" aria-hidden />
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
      {resources.videos.length > 0 && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <Play className="h-3.5 w-3.5 fill-current text-clay" /> {r.videos}
          </h3>
          <ul className={rowClass}>
            {resources.videos.map((video) => (
              <li key={video.url} className="w-56 shrink-0 snap-start sm:w-60">
                <VideoCard video={video} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {resources.products.length > 0 && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <ShoppingBasket className="h-3.5 w-3.5 text-leaf" /> {r.products}
          </h3>
          <ul className={rowClass}>
            {resources.products.map((product) => (
              <li key={product.id} className="w-40 shrink-0 snap-start">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}

function VideoCard({ video }: { video: VideoResource }) {
  const { t } = useLanguage();
  const r = t.resources;
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-line transition-shadow hover:shadow-lift"
    >
      <span className="relative block aspect-video overflow-hidden bg-moss">
        {video.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail, sized by the card
          <img src={video.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-moss to-sprout text-forest">
            <Search className="h-8 w-8" />
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#ff0033] text-white shadow-soft transition-transform group-hover:scale-110">
            <Play className="h-4 w-4 translate-x-px fill-current" />
          </span>
        </span>
      </span>
      <span className="block p-2.5">
        <span className="line-clamp-2 text-sm leading-snug font-medium text-ink">{video.videoId ? video.title : `${r.searchYouTube}: ${video.title}`}</span>
        <span className="mt-1 flex items-center gap-1 text-[11px] text-ink-faint">
          <span className="truncate">{video.channel}</span>
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          <span className="sr-only">({r.opensYouTube})</span>
        </span>
      </span>
    </a>
  );
}

function ProductCard({ product }: { product: ProductResource }) {
  const { t, lang } = useLanguage();
  const Icon = PRODUCT_ICONS[product.category];
  return (
    <Link
      href={`/shop#product-${product.id}`}
      className="group flex h-full flex-col rounded-2xl bg-white p-2.5 shadow-soft ring-1 ring-line transition-shadow hover:shadow-lift"
    >
      <span className={`flex aspect-[4/3] items-center justify-center rounded-xl ${PRODUCT_TINTS[product.category]}`}>
        <Icon className="h-8 w-8 transition-transform group-hover:scale-110" />
      </span>
      <span className="mt-2 line-clamp-2 flex-1 text-sm leading-snug font-medium text-ink">{lang === "bn" ? product.nameBn : product.nameEn}</span>
      <span className="mt-1 flex items-center justify-between gap-1">
        <span className="text-sm font-semibold text-forest">৳{formatNumber(product.priceBdt, lang)}</span>
        <span className="text-[11px] font-semibold text-leaf group-hover:underline">{t.resources.viewInShop}</span>
      </span>
    </Link>
  );
}
