/**
 * Hands the composer's question (and optional photo) from the landing page to /chat.
 * Client-side navigation keeps the same document, so a module-level value survives
 * the route change without serialising the image into the URL or storage.
 */
export interface ChatDraft {
  text: string;
  image: File | null;
}

let draft: ChatDraft | null = null;

export function setChatDraft(next: ChatDraft) {
  draft = next;
}

export function peekChatDraft(): ChatDraft | null {
  return draft;
}

export function clearChatDraft() {
  draft = null;
}

export const LANDING_EVENTS = {
  focusComposer: "chhadkrishi:focus-composer",
} as const;

/*
 * Conversation context kept for this browser tab, so moving between features never loses it:
 * the conversation to return to, and any unsent text per conversation. sessionStorage can be
 * unavailable (private mode, blocked storage), in which case these quietly do nothing.
 */
const LAST_CHAT_KEY = "chhadkrishi:last-chat";
const draftKey = (conversation: string) => `chhadkrishi:chat-draft:${conversation}`;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

const contextListeners = new Set<() => void>();

/** Notifies when the conversation to return to changes (for useSyncExternalStore). */
export function subscribeChatContext(notify: () => void) {
  contextListeners.add(notify);
  return () => {
    contextListeners.delete(notify);
  };
}

export function rememberChat(id: string) {
  try {
    if (storage()?.getItem(LAST_CHAT_KEY) === id) return;
    storage()?.setItem(LAST_CHAT_KEY, id);
  } catch {}
  contextListeners.forEach((notify) => notify());
}

export function forgetChat(id: string) {
  try {
    if (storage()?.getItem(LAST_CHAT_KEY) === id) storage()?.removeItem(LAST_CHAT_KEY);
    storage()?.removeItem(draftKey(id));
  } catch {}
  contextListeners.forEach((notify) => notify());
}

export function lastChatId(): string | null {
  try {
    return storage()?.getItem(LAST_CHAT_KEY) ?? null;
  } catch {
    return null;
  }
}

/** `conversation` is the conversation id, or "new" for a chat that has not started yet. */
export function saveDraftText(conversation: string, text: string) {
  try {
    if (text.trim()) storage()?.setItem(draftKey(conversation), text);
    else storage()?.removeItem(draftKey(conversation));
  } catch {}
}

export function loadDraftText(conversation: string): string {
  try {
    return storage()?.getItem(draftKey(conversation)) ?? "";
  } catch {
    return "";
  }
}
