/**
 * Generates a unique ID for components, tabs, etc.
 * Uses timestamp + random string for uniqueness.
 */
export const generateId = (): string => {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
