/**
 * Decouples the repository layer from the toast UI. The Supabase repositories
 * report write-through failures here; Providers wires a handler that surfaces a
 * recoverable toast (see src/components/layout/providers.tsx). Mirrors the
 * existing storage error-handler pattern.
 */
export interface RepositoryError {
  /** Short operation label, e.g. "save brand". */
  context: string;
  error: unknown;
  /** True when the optimistic local change was rolled back. */
  reverted: boolean;
}

type Handler = (error: RepositoryError) => void;

let handler: Handler | null = null;

export function setRepositoryErrorHandler(next: Handler | null): void {
  handler = next;
}

export function reportRepositoryError(error: RepositoryError): void {
  if (handler) handler(error);
  else console.warn(`[web-vision] repository error (${error.context})`, error.error);
}
