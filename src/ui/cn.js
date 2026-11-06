/** Склейка классов без зависимостей. */
export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}
