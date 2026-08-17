import { create } from 'zustand';

export interface ForwardRequest { open: boolean; messageId: string; content: string; mediaUrl: string | null }

interface ChatUIState {
  activeChatId: string | null;
  openChat: (id: string) => void;
  closeChat: () => void;

  infoOpen: boolean;
  toggleInfo: () => void;

  newChatOpen: boolean;
  setNewChatOpen: (v: boolean) => void;

  niyamOpen: boolean;
  setNiyamOpen: (v: boolean) => void;

  forward: ForwardRequest;
  askForward: (messageId: string, content: string, mediaUrl: string | null) => void;
  closeForward: () => void;

  /** chat id asking for the mantra PIN right now (or null) */
  lockPromptFor: string | null;
  askLockPin: (chatId: string | null) => void;

  /** profile viewer card */
  viewProfileId: string | null;
  viewProfile: (id: string | null) => void;

  pinned: string[];
  locked: string[];
  unlocked: string[];
  initGuards: (uid: string) => void;
  togglePin: (chatId: string) => void;
  lockChat: (chatId: string) => void;
  unlockChat: (chatId: string) => void;

  dark: boolean;
  toggleDark: () => void;

  toast: string | null;
  showToast: (msg: string) => void;

  typing: Record<string, { name: string; until: number }>;
  setTyping: (chatId: string, name: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let guardUid = '';

function lsGet(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function lsSet(key: string, v: string[]) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* noop */ }
}

export const pinKeyFor = (uid: string) => `vaani.pins.${uid}`;
export const lockKeyFor = (uid: string) => `vaani.locks.${uid}`;
export const ironKeyFor = (uid: string) => `vaani.iron.${uid}`; // session unlocks (sessionStorage)
export const pinSecretFor = (uid: string) => `vaani.mantra.${uid}`; // the PIN itself

export function getMantra(uid: string): string | null {
  try { return localStorage.getItem(pinSecretFor(uid)); } catch { return null; }
}
export function setMantra(uid: string, v: string) {
  try { localStorage.setItem(pinSecretFor(uid), v); } catch { /* noop */ }
}

function sessionIron(uid: string): string[] {
  try { return JSON.parse(sessionStorage.getItem(ironKeyFor(uid)) || '[]'); } catch { return []; }
}
function saveIron(uid: string, v: string[]) {
  try { sessionStorage.setItem(ironKeyFor(uid), JSON.stringify(v)); } catch { /* noop */ }
}

function readDark(): boolean {
  try { return localStorage.getItem('vaani.tamra') === '1'; } catch { return false; }
}

export const useChatUI = create<ChatUIState>((set, get) => ({
  activeChatId: null,
  openChat: (id) => { set({ activeChatId: id, infoOpen: false }); },
  closeChat: () => set({ activeChatId: null, infoOpen: false }),

  infoOpen: false,
  toggleInfo: () => set((s) => ({ infoOpen: !s.infoOpen })),

  newChatOpen: false,
  setNewChatOpen: (v) => set({ newChatOpen: v }),

  niyamOpen: false,
  setNiyamOpen: (v) => set({ niyamOpen: v }),

  forward: { open: false, messageId: '', content: '', mediaUrl: null },
  askForward: (messageId, content, mediaUrl) => set({ forward: { open: true, messageId, content, mediaUrl } }),
  closeForward: () => set((s) => ({ forward: { ...s.forward, open: false } })),

  lockPromptFor: null,
  askLockPin: (chatId) => set({ lockPromptFor: chatId }),

  viewProfileId: null,
  viewProfile: (id) => set({ viewProfileId: id }),

  pinned: [],
  locked: [],
  unlocked: [],
  initGuards: (uid) => {
    if (guardUid === uid) return;
    guardUid = uid;
    set({ pinned: lsGet(pinKeyFor(uid)), locked: lsGet(lockKeyFor(uid)), unlocked: sessionIron(uid) });
  },
  togglePin: (chatId) => {
    const { pinned } = get();
    const next = pinned.includes(chatId) ? pinned.filter((c) => c !== chatId) : [chatId, ...pinned];
    set({ pinned: next });
    if (guardUid) lsSet(pinKeyFor(guardUid), next);
  },
  lockChat: (chatId) => {
    const { locked, unlocked } = get();
    const nextLocked = locked.includes(chatId) ? locked.filter((c) => c !== chatId) : [...locked, chatId];
    const nextUnlocked = unlocked.filter((c) => c !== chatId);
    set({ locked: nextLocked, unlocked: nextUnlocked });
    if (guardUid) { lsSet(lockKeyFor(guardUid), nextLocked); saveIron(guardUid, nextUnlocked); }
    if (nextLocked.includes(chatId) && get().activeChatId === chatId) set({ activeChatId: null });
  },
  unlockChat: (chatId) => {
    const { unlocked } = get();
    if (unlocked.includes(chatId)) return;
    const next = [...unlocked, chatId];
    set({ unlocked: next });
    if (guardUid) saveIron(guardUid, next);
  },

  dark: readDark(),
  toggleDark: () => {
    const next = !get().dark;
    try { localStorage.setItem('vaani.tamra', next ? '1' : '0'); } catch { /* noop */ }
    set({ dark: next });
  },

  toast: null,
  showToast: (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 2600);
  },

  typing: {},
  setTyping: (chatId, name) =>
    set((s) => ({ typing: { ...s.typing, [chatId]: { name, until: Date.now() + 3500 } } })),
}));

export function applyThemeClass(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}
