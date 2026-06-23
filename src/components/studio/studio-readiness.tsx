"use client";

import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StudioReadinessRow {
  label: string;
  done: boolean;
  why: string;
  actionHref?: string;
  actionLabel?: string;
}

/**
 * Informative readiness panel shown when Studio can't proceed yet — covers every
 * dependency (Project, Brand, Logo, Product, Location, Settings) with what is
 * missing, why it's needed, and a direct action, instead of a single dead-end.
 */
export function StudioReadiness({ rows }: { rows: StudioReadinessRow[] }) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div>
          <h3 className="text-base font-semibold">Get this generation ready</h3>
          <p className="text-muted-foreground text-sm">
            Studio composes prepared assets into one visualization. Complete the steps below to generate.
          </p>
        </div>
        <ul className="divide-border divide-y">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3 py-3">
              {r.done ? (
                <span className="bg-success/15 text-success flex size-5 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : (
                <Circle className="text-muted-foreground/50 size-5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", !r.done && "text-foreground")}>{r.label}</p>
                {!r.done && <p className="text-muted-foreground text-xs">{r.why}</p>}
              </div>
              {!r.done && r.actionHref && (
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href={r.actionHref}>
                    {r.actionLabel ?? "Add"}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
