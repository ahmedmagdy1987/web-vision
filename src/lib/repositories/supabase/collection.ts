/**
 * Supabase-backed observable collection.
 *
 * Preserves the synchronous `useSyncExternalStore` read contract used across the
 * app: reads return a referentially-stable in-memory snapshot, hydrated
 * asynchronously from Supabase on first subscribe. Writes are OPTIMISTIC — the
 * local cache is updated synchronously (so call sites keep their sync
 * signatures) and the Supabase write happens in the background, rolling back +
 * reporting on failure.
 */
import type { ID } from "@/lib/domain";
import { reportRepositoryError } from "../error-reporter";
import type { ReadableStore } from "../types";
import { onActiveOrgChange } from "./context";

const EMPTY: readonly never[] = Object.freeze([]);

export abstract class SupabaseCollection<T extends { id: ID }> implements ReadableStore<T> {
  private items: T[] = [];
  private listeners = new Set<() => void>();
  private status: "idle" | "loading" | "ready" | "error" = "idle";

  constructor() {
    // Re-hydrate when the active organization changes (sign-in / org switch).
    onActiveOrgChange(() => {
      this.status = "idle";
      this.items = [];
      this.emit();
      this.ensureLoaded();
    });
  }

  /** Load the full collection for the active organization from Supabase. */
  protected abstract fetchAll(): Promise<T[]>;
  /** Short label used in error reports, e.g. "brands". */
  protected abstract label(): string;

  private ensureLoaded(): void {
    if (this.status !== "idle") return;
    if (typeof window === "undefined") return; // client-only hydration
    this.status = "loading";
    this.fetchAll().then(
      (items) => {
        this.items = items;
        this.status = "ready";
        this.emit();
      },
      (error) => {
        this.status = "error";
        reportRepositoryError({ context: `load ${this.label()}`, error, reverted: false });
        this.emit();
      },
    );
  }

  subscribe = (listener: () => void): (() => void) => {
    this.ensureLoaded();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): T[] => {
    this.ensureLoaded();
    return this.items;
  };

  getServerSnapshot = (): T[] => EMPTY as unknown as T[];

  list(): T[] {
    return this.getSnapshot();
  }

  getById(id: ID): T | undefined {
    return this.items.find((i) => i.id === id);
  }

  protected emit(): void {
    for (const l of this.listeners) l();
  }

  /* ---------------------- optimistic cache mutators --------------------- */
  protected cachePrepend(item: T): void {
    this.items = [item, ...this.items];
    this.emit();
  }
  protected cacheAppend(item: T): void {
    this.items = [...this.items, item];
    this.emit();
  }
  protected cacheReplace(id: ID, item: T): void {
    this.items = this.items.map((i) => (i.id === id ? item : i));
    this.emit();
  }
  protected cacheUpdate(id: ID, updater: (current: T) => T): T | undefined {
    let next: T | undefined;
    this.items = this.items.map((i) => {
      if (i.id !== id) return i;
      next = updater(i);
      return next;
    });
    if (next) this.emit();
    return next;
  }
  protected cacheRemove(id: ID): void {
    this.items = this.items.filter((i) => i.id !== id);
    this.emit();
  }
  protected cacheSet(items: T[]): void {
    this.items = items;
    this.status = "ready";
    this.emit();
  }

  /** Reload from Supabase to reconcile after writes. */
  async refresh(): Promise<void> {
    try {
      this.items = await this.fetchAll();
      this.status = "ready";
      this.emit();
    } catch (error) {
      reportRepositoryError({ context: `refresh ${this.label()}`, error, reverted: false });
    }
  }

  /**
   * Apply an optimistic change synchronously, persist in the background, and on
   * failure run `rollback` and report. Returns the optimistic value.
   */
  protected optimistic<R>(opts: {
    apply: () => R;
    persist: () => Promise<void>;
    rollback: () => void;
    context: string;
    reconcile?: boolean;
  }): R {
    const value = opts.apply();
    opts.persist().then(
      () => {
        if (opts.reconcile) void this.refresh();
      },
      (error) => {
        opts.rollback();
        reportRepositoryError({ context: opts.context, error, reverted: true });
      },
    );
    return value;
  }
}
