"use client";

import { useMemo } from "react";
import type { Project } from "@/lib/domain";
import { useAppState } from "./use-app-store";
import { useProjects } from "./use-collection";

/**
 * Resolve the active project: the explicitly selected project, falling back to
 * the first non-archived project so the workspace always has a project context.
 */
export function useActiveProject(): { project: Project | null; projects: Project[] } {
  const projects = useProjects();
  const { selectedProjectId } = useAppState();

  const project = useMemo(() => {
    const selectable = projects.filter((p) => p.status !== "archived");
    const selected = projects.find((p) => p.id === selectedProjectId);
    const validSelected = selected && selected.status !== "archived" ? selected : undefined;
    return validSelected ?? selectable[0] ?? projects[0] ?? null;
  }, [projects, selectedProjectId]);

  return { project, projects };
}
