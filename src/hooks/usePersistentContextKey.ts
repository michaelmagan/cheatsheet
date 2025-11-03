import { useMemo } from "react";

const STORAGE_KEY = "tambo-context-key";

function createContextKey(prefix: string) {
  const randomUUID =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${randomUUID}`;
}

/**
 * Ensures each user gets a stable context key generated on their first visit.
 */
export function usePersistentContextKey(prefix = "tambo-template") {
  const contextKey = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const prefixWithSeparator = `${prefix}-`;

    try {
      const existing = window.localStorage.getItem(STORAGE_KEY);
      if (existing && existing.startsWith(prefixWithSeparator)) {
        return existing;
      }
    } catch {
      // Ignore storage read errors and fall back to generating a volatile key.
    }

    const newKey = createContextKey(prefix);
    try {
      window.localStorage.setItem(STORAGE_KEY, newKey);
    } catch {
      // Ignore storage write errors; the key will remain in-memory for this session.
    }

    return newKey;
  }, [prefix]);

  return contextKey;
}
