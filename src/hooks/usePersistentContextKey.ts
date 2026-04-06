import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "tambo-context-key";

function createContextKey(prefix: string) {
  const randomUUID =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${randomUUID}`;
}

function getServerSnapshot() {
  return null;
}

// localStorage is not an observable store, so we use a no-op subscribe.
// The value only needs to be read once on mount and never changes.
function subscribe() {
  return () => {};
}

/**
 * Ensures each user gets a stable context key generated on their first visit.
 * Returns null during SSR (via getServerSnapshot) to avoid hydration mismatches.
 */
export function usePersistentContextKey(prefix = "tambo-template") {
  const getSnapshot = useCallback(() => {
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

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
