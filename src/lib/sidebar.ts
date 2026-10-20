"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Desktop sidebar state. Regular pages show it expanded; focus pages (the AI chat) minimise it
 * to icons. A manual toggle overrides that until the gardener opens or starts a chat again.
 *
 * Before hydration the sidebar renders `data-sidebar="auto"` and CSS decides from the presence
 * of `[data-focus-mode]` (so the first paint is right). After hydration it switches to an
 * explicit "expanded"/"collapsed" from this store — the DOM check alone is not reliable then,
 * because the router keeps visited pages mounted but hidden, and their effects (which drive the
 * focus count here) are cleaned up while hidden.
 */
type Override = "expanded" | "collapsed" | null;

let override: Override = null;
let focusPages = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((notify) => notify());

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

const isCollapsed = () => override === "collapsed" || (override === null && focusPages > 0);

/** `null` until hydrated (CSS decides), then whether the sidebar shows icons only. */
export function useSidebarCollapsed(): boolean | null {
  return useSyncExternalStore(subscribe, isCollapsed, () => null);
}

export function toggleSidebar() {
  override = isCollapsed() ? "expanded" : "collapsed";
  emit();
}

/** Gives the chat the full width again — used when a conversation starts. */
export function minimizeSidebarForFocus() {
  if (override === null) return;
  override = null;
  emit();
}

/** Marks the current page as a focus page while it is mounted and visible. */
export function useFocusMode() {
  useEffect(() => {
    focusPages += 1;
    override = null;
    emit();
    return () => {
      focusPages -= 1;
      override = null;
      emit();
    };
  }, []);
}
