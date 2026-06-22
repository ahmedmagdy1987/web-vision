/** Domain primitives shared across all entities. */

export type ID = string;

/** ISO-8601 timestamps. */
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export type EntityStatus = "active" | "archived";

/**
 * A stored image asset. Uploaded files are persisted as data URLs so the
 * prototype survives refresh without external storage; a later phase can swap
 * `url` for a cloud storage reference without changing consumers.
 */
export interface ImageAsset {
  id: ID;
  /** data: URL (uploaded) or remote URL (future). */
  url: string;
  name: string;
  /** MIME type, e.g. "image/png". */
  mimeType: string;
  /** Size in bytes (best-effort for data URLs). */
  size: number;
  width?: number;
  height?: number;
  createdAt: string;
}
