import * as React from "react";
import { CheckCircle2, CircleDashed, Clock, FileText, Loader2, XCircle } from "lucide-react";
import type { EntityStatus, JobStatus, ResultReview } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

export function ReviewBadge({ review }: { review: ResultReview }) {
  const map: Record<ResultReview, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
    draft: { label: "Draft", variant: "muted", icon: <FileText /> },
    approved: { label: "Approved", variant: "success", icon: <CheckCircle2 /> },
    rejected: { label: "Rejected", variant: "destructive", icon: <XCircle /> },
  };
  const { label, variant, icon } = map[review];
  return (
    <Badge variant={variant}>
      {icon}
      {label}
    </Badge>
  );
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
    queued: { label: "Queued", variant: "muted", icon: <Clock /> },
    processing: { label: "Processing", variant: "brand", icon: <Loader2 className="animate-spin" /> },
    completed: { label: "Completed", variant: "success", icon: <CheckCircle2 /> },
    failed: { label: "Failed", variant: "destructive", icon: <XCircle /> },
  };
  const { label, variant, icon } = map[status];
  return (
    <Badge variant={variant}>
      {icon}
      {label}
    </Badge>
  );
}

export function EntityStatusBadge({ status }: { status: EntityStatus }) {
  return status === "active" ? (
    <Badge variant="success">Active</Badge>
  ) : (
    <Badge variant="muted">
      <CircleDashed />
      Archived
    </Badge>
  );
}
