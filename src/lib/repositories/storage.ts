/**
 * SSR-safe, versioned localStorage adapter. All reads/writes are guarded so the
 * code is safe to import in server components; on the server every read returns
 * null and writes are no-ops.
 */

const NAMESPACE = "web-vision";
const SCHEMA_VERSION = "v1";

function fullKey(key: string): string {
  return `${NAMESPACE}:${SCHEMA_VERSION}:${key}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const storage = {
  get<T>(key: string): T | null {
    if (!isBrowser()) return null;
    try {
      const raw = window.localStorage.getItem(fullKey(key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): boolean {
    if (!isBrowser()) return false;
    try {
      window.localStorage.setItem(fullKey(key), JSON.stringify(value));
      return true;
    } catch (error) {
      // Quota exceeded or serialization error — fail gracefully but surface it
      // so it is not entirely silent (e.g. localStorage quota for large uploads).
      console.warn(`[web-vision] Failed to persist "${key}" to localStorage`, error);
      return false;
    }
  },

  remove(key: string): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(fullKey(key));
    } catch {
      /* ignore */
    }
  },

  /** Remove every Web Vision key (used by "reset workspace"). */
  clearAll(): void {
    if (!isBrowser()) return;
    try {
      const prefix = `${NAMESPACE}:${SCHEMA_VERSION}:`;
      const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(prefix));
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  },
};
