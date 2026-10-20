"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { lastChatId, subscribeChatContext } from "@/lib/chat-draft";
import { useLanguage } from "@/lib/i18n/language-context";

/**
 * Floating round button that opens the AI chat from every signed-in page except the chat
 * itself. It returns to the conversation the gardener was in (this tab), and on phones it gets
 * out of the way: it hides while typing (the keyboard is open) and while scrolling down, and a
 * spacer keeps the end of each page clear of it.
 */
export function ChatFab() {
  return (
    <Suspense fallback={null}>
      <ChatFabInner />
    </Suspense>
  );
}

function ChatFabInner() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const onChat = pathname === "/chat" || pathname.startsWith("/chat/");
  const [typing, setTyping] = useState(false);
  const [scrollingDown, setScrollingDown] = useState(false);
  const resumeId = useSyncExternalStore(subscribeChatContext, lastChatId, () => null);

  useEffect(() => {
    if (onChat) return;
    const small = window.matchMedia("(max-width: 1023px)");
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "file", "range"].includes(el.type)) || (el instanceof HTMLElement && el.isContentEditable);
    const onFocusIn = (event: FocusEvent) => setTyping(small.matches && isField(event.target));
    const onFocusOut = () => setTyping(false);

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 12) return;
      setScrollingDown(small.matches && y > lastY && y > 120);
      lastY = y;
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, [onChat]);

  if (onChat) return null;
  const label = resumeId ? t.chatFab.resume : t.chatFab.open;
  const visible = !typing && !scrollingDown;

  return (
    <>
      <div aria-hidden className="h-24 shrink-0 lg:h-20" />
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 16 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="fixed right-4 bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] z-30 sm:right-6 sm:bottom-6"
          >
            <Link
              href={resumeId ? `/chat/${resumeId}` : "/chat"}
              aria-label={label}
              className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-forest text-paper shadow-lift ring-4 ring-paper transition-colors hover:bg-canopy focus-visible:outline-offset-4"
            >
              <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-leaf/30 [animation-iteration-count:2]" />
              <MessageCircle className="relative h-6 w-6" />
              {/* Desktop hover label */}
              <span
                aria-hidden
                className="pointer-events-none absolute right-full mr-3 hidden rounded-full bg-ink px-3 py-1.5 text-sm font-medium whitespace-nowrap text-paper opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
              >
                {label}
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
