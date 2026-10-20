"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "./client";
import { setChatDraft } from "@/lib/chat-draft";
import type { AuthReasonKey } from "@/lib/i18n/dictionary";

/**
 * What the visitor was trying to do when authentication was required.
 * Kept in memory only: it may hold a File and callbacks, and must never outlive the tab.
 */
export type PendingAction =
  | { kind: "chat"; text: string; image: File | null }
  | { kind: "upload"; open: () => void }
  | { kind: "navigate"; href: string; reason: Extract<AuthReasonKey, "shop" | "analyze" | "protected"> }
  | { kind: "retry"; run: () => void }
  /** A protected page rendered its sign-in state in place; re-render it once signed in. */
  | { kind: "refresh"; reason: Extract<AuthReasonKey, "shop" | "analyze" | "protected"> }
  | { kind: "none" };

export type AuthMode = "signin" | "signup";

export interface AuthModalState {
  open: boolean;
  mode: AuthMode;
  pending: PendingAction;
  expired: boolean;
}

const CLOSED: AuthModalState = { open: false, mode: "signin", pending: { kind: "none" }, expired: false };
let state: AuthModalState = CLOSED;
const listeners = new Set<() => void>();

function emit(next: AuthModalState) {
  state = next;
  listeners.forEach((notify) => notify());
}

export function openAuthModal(options: { pending?: PendingAction; mode?: AuthMode; expired?: boolean } = {}) {
  emit({ open: true, mode: options.mode ?? "signin", pending: options.pending ?? { kind: "none" }, expired: options.expired ?? false });
}

export function closeAuthModal() {
  emit(CLOSED);
}

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

export function useAuthModalState() {
  return useSyncExternalStore(subscribe, () => state, () => CLOSED);
}

export function reasonFor(pending: PendingAction): AuthReasonKey | null {
  switch (pending.kind) {
    case "chat":
      return "chat";
    case "upload":
      return "upload";
    case "navigate":
    case "refresh":
      return pending.reason;
    case "retry":
      return "retry";
    default:
      return null;
  }
}

type Router = ReturnType<typeof useRouter>;

/** Carries out an action once the visitor is known to be signed in. */
export function runAction(action: PendingAction, router: Router) {
  switch (action.kind) {
    case "chat":
      setChatDraft({ text: action.text, image: action.image });
      router.push(action.text ? `/chat?q=${encodeURIComponent(action.text)}` : "/chat");
      return;
    case "navigate":
      router.push(action.href);
      return;
    case "upload":
      action.open();
      return;
    case "retry":
      action.run();
      return;
    case "refresh":
      router.refresh();
      return;
    case "none":
      // A plain sign-in keeps the visitor where they are; the page re-renders with their
      // session (on the home page that is the clean, chat-first workspace).
      router.refresh();
  }
}

/**
 * Returns a function that runs `action` immediately for signed-in visitors and otherwise
 * opens the sign-in modal, which resumes the action after a successful login. This is a UX
 * layer only — the server re-checks the session on every protected page and API.
 */
export function useAuthGate() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  return useCallback(
    async (action: PendingAction) => {
      let signedIn = Boolean(session);
      if (!signedIn && isPending) {
        // Session still loading on first paint: ask the server rather than guessing.
        const { data } = await authClient.getSession();
        signedIn = Boolean(data);
      }
      if (signedIn) runAction(action, router);
      else openAuthModal({ pending: action });
    },
    [session, isPending, router],
  );
}
