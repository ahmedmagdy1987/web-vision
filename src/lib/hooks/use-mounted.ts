"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True after the first client render — use to gate client-only content.
 * Implemented with useSyncExternalStore so it returns false on the server and
 * true on the client without a setState-in-effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
