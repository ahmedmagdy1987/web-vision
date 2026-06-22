import type { ID } from "@/lib/domain";
import { storage } from "./storage";

type Listener = () => void;

/** Stable empty array reused for every server snapshot. */
const EMPTY: readonly never[] = Object.freeze([]);

interface Identifiable {
  id: ID;
}

/**
 * Generic observable collection backed by localStorage. Designed to drive
 * React's `useSyncExternalStore`: snapshots are referentially stable and only
 * change identity when the data actually mutates.
 */
export class ObservableCollection<T extends Identifiable> {
  private items: T[] = [];
  private listeners = new Set<Listener>();
  private loaded = false;

  constructor(
    private readonly storageKey: string,
    private readonly seed?: () => T[],
  ) {}

  /** Lazily hydrate from storage (client only). Seeds on first run. */
  private ensureLoaded(): void {
    if (this.loaded || typeof window === "undefined") return;
    const stored = storage.get<T[]>(this.storageKey);
    if (stored) {
      this.items = stored;
    } else if (this.seed) {
      this.items = this.seed();
      storage.set(this.storageKey, this.items);
    }
    this.loaded = true;
  }

  private persist(): void {
    storage.set(this.storageKey, this.items);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  /** Replace the backing array (new reference), persist and notify. */
  private commit(next: T[]): void {
    this.items = next;
    this.persist();
    this.emit();
  }

  subscribe = (listener: Listener): (() => void) => {
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

  /* ----------------------------- reads ----------------------------- */

  list(): T[] {
    return this.getSnapshot();
  }

  getById(id: ID): T | undefined {
    return this.getSnapshot().find((item) => item.id === id);
  }

  /* ---------------------------- writes ----------------------------- */

  create(item: T): T {
    this.ensureLoaded();
    this.commit([...this.items, item]);
    return item;
  }

  /** Insert at the front (useful for newest-first collections like jobs). */
  prepend(item: T): T {
    this.ensureLoaded();
    this.commit([item, ...this.items]);
    return item;
  }

  update(id: ID, updater: (current: T) => T): T | undefined {
    this.ensureLoaded();
    let updated: T | undefined;
    const next = this.items.map((item) => {
      if (item.id !== id) return item;
      updated = updater(item);
      return updated;
    });
    if (updated) this.commit(next);
    return updated;
  }

  upsert(item: T): T {
    this.ensureLoaded();
    const exists = this.items.some((existing) => existing.id === item.id);
    this.commit(exists ? this.items.map((e) => (e.id === item.id ? item : e)) : [...this.items, item]);
    return item;
  }

  remove(id: ID): void {
    this.ensureLoaded();
    const next = this.items.filter((item) => item.id !== id);
    if (next.length !== this.items.length) this.commit(next);
  }

  replaceAll(items: T[]): void {
    this.ensureLoaded();
    this.commit([...items]);
  }
}
