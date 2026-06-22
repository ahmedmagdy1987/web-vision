/** Id / timestamp helpers used by repositories and services. */

/** Generate a unique id with an optional human-readable prefix. */
export function newId(prefix?: string): string {
  const base =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${base}` : base;
}

/** Current time as an ISO-8601 string. */
export function nowIso(): string {
  return new Date().toISOString();
}
