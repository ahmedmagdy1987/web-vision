"use client";

import * as React from "react";
import type { Project, ProjectStatus } from "@/lib/domain";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/domain";
import { appStore } from "@/lib/hooks";
import { projectRepository } from "@/lib/repositories";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  selectOnCreate?: boolean;
}

export function ProjectFormDialog({ open, onOpenChange, project, selectOnCreate = true }: ProjectFormDialogProps) {
  const isEdit = project != null;
  const formKey = `${project?.id ?? "new"}:${open ? "open" : "closed"}`;
  const [lastKey, setLastKey] = React.useState(formKey);
  const [name, setName] = React.useState(project?.name ?? "");
  const [clientName, setClientName] = React.useState(project?.clientName ?? "");
  const [description, setDescription] = React.useState(project?.description ?? "");
  const [status, setStatus] = React.useState<ProjectStatus>(project?.status ?? "active");
  const [startDate, setStartDate] = React.useState(project?.startDate ?? "");
  const [notes, setNotes] = React.useState(project?.notes ?? "");
  const [submitted, setSubmitted] = React.useState(false);

  if (formKey !== lastKey) {
    setLastKey(formKey);
    setName(project?.name ?? "");
    setClientName(project?.clientName ?? "");
    setDescription(project?.description ?? "");
    setStatus(project?.status ?? "active");
    setStartDate(project?.startDate ?? "");
    setNotes(project?.notes ?? "");
    setSubmitted(false);
  }

  const trimmedName = name.trim();
  const nameValid = trimmedName.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!nameValid) {
      toast.error("A project name is required.");
      return;
    }
    const input = {
      name: trimmedName,
      clientName: clientName.trim() || undefined,
      description: description.trim() || undefined,
      status,
      startDate: startDate || undefined,
      notes: notes.trim() || undefined,
    };
    if (isEdit && project) {
      projectRepository.updateProject(project.id, input);
      toast.success(`“${trimmedName}” updated.`);
    } else {
      const created = projectRepository.addProject(input);
      if (selectOnCreate) appStore.setSelectedProject(created.id);
      toast.success(`“${created.name}” created.`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this project’s details."
              : "Create a project to organize brands, products, locations, and generated work."}
          </DialogDescription>
        </DialogHeader>

        <form id="project-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seaside Boardwalk Proposal"
              autoFocus
              aria-invalid={submitted && !nameValid}
            />
            {submitted && !nameValid && <p className="text-destructive text-xs">A project name is required.</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="project-client">Client name</Label>
              <Input
                id="project-client"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Aventura Parks"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger id="project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-start">Start date</Label>
            <Input id="project-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-desc">Description</Label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this engagement covers."
              className="min-h-16"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-notes">Notes</Label>
            <Textarea
              id="project-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-16"
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="project-form">
            {isEdit ? "Save changes" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
