/**
 * Carries the landing-page opening message into the conversation. Uses
 * localStorage so it survives the magic-link sign-in, which may open in a new tab.
 */
const OPENING_KEY = "meridian:opening";

export const pendingOpening = {
  get(): string | null {
    try {
      return localStorage.getItem(OPENING_KEY);
    } catch {
      return null;
    }
  },
  set(text: string) {
    try {
      localStorage.setItem(OPENING_KEY, text);
    } catch {
      // Storage unavailable (private mode): the conversation simply starts without the opener.
    }
  },
  clear() {
    try {
      localStorage.removeItem(OPENING_KEY);
    } catch {}
  },
};
