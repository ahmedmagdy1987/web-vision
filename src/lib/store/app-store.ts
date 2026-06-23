import type { ID } from "@/lib/domain";
import { storage } from "@/lib/repositories/storage";

export type ThemePreference = "light" | "dark" | "system";

export interface AppState {
  selectedBrandId: ID | null;
  selectedProjectId: ID | null;
  searchQuery: string;
  sidebarCollapsed: boolean;
  theme: ThemePreference;
}

const DEFAULT_STATE: AppState = {
  selectedBrandId: null,
  selectedProjectId: null,
  searchQuery: "",
  sidebarCollapsed: false,
  theme: "system",
};

type Listener = () => void;

const KEYS = {
  selectedBrandId: "app:selectedBrandId",
  selectedProjectId: "app:selectedProjectId",
  sidebar: "app:sidebarCollapsed",
  theme: "app:theme",
} as const;

/** Observable global UI store driving `useSyncExternalStore`. */
class AppStore {
  private state: AppState = DEFAULT_STATE;
  private serverState: AppState = DEFAULT_STATE;
  private listeners = new Set<Listener>();
  private loaded = false;

  private ensureLoaded(): void {
    if (this.loaded || typeof window === "undefined") return;
    this.state = {
      selectedBrandId: storage.get<ID>(KEYS.selectedBrandId) ?? null,
      selectedProjectId: storage.get<ID>(KEYS.selectedProjectId) ?? null,
      searchQuery: "",
      sidebarCollapsed: storage.get<boolean>(KEYS.sidebar) ?? false,
      theme: storage.get<ThemePreference>(KEYS.theme) ?? "system",
    };
    this.loaded = true;
  }

  private set(patch: Partial<AppState>): void {
    this.ensureLoaded();
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.ensureLoaded();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): AppState => {
    this.ensureLoaded();
    return this.state;
  };

  getServerSnapshot = (): AppState => this.serverState;

  /* ----------------------------- actions ----------------------------- */

  setSelectedBrand(id: ID | null): void {
    this.set({ selectedBrandId: id });
    if (id) storage.set(KEYS.selectedBrandId, id);
    else storage.remove(KEYS.selectedBrandId);
  }

  setSelectedProject(id: ID | null): void {
    this.set({ selectedProjectId: id });
    if (id) storage.set(KEYS.selectedProjectId, id);
    else storage.remove(KEYS.selectedProjectId);
  }

  setSearchQuery(query: string): void {
    this.set({ searchQuery: query });
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.set({ sidebarCollapsed: collapsed });
    storage.set(KEYS.sidebar, collapsed);
  }

  toggleSidebar(): void {
    this.setSidebarCollapsed(!this.getSnapshot().sidebarCollapsed);
  }

  setTheme(theme: ThemePreference): void {
    this.set({ theme });
    storage.set(KEYS.theme, theme);
  }
}

export const appStore = new AppStore();
