"use client";

import { useSyncExternalStore } from "react";
import { appStore, type AppState } from "@/lib/store/app-store";

/** Read the global app state. Use `appStore` methods for actions. */
export function useAppState(): AppState {
  return useSyncExternalStore(appStore.subscribe, appStore.getSnapshot, appStore.getServerSnapshot);
}

export { appStore };
