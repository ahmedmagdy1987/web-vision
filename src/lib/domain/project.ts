import type { ID, ImageAsset, Timestamps } from "./common";

/** A project is one client engagement / proposal / campaign / body of work. */
export type ProjectStatus = "active" | "draft" | "completed" | "archived";

export interface Project extends Timestamps {
  id: ID;
  name: string;
  slug: string;
  clientName?: string;
  description?: string;
  status: ProjectStatus;
  coverImage?: ImageAsset;
  startDate?: string;
  notes?: string;
  /** Reusable many-to-many associations (asset ids may appear in many projects). */
  brandIds: ID[];
  productIds: ID[];
  locationIds: ID[];
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  draft: "Draft",
  completed: "Completed",
  archived: "Archived",
};

export const PROJECT_STATUSES: ProjectStatus[] = ["active", "draft", "completed", "archived"];
