"use client";

import { Building2, Check, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABELS } from "@/lib/auth/permissions";

export function AccountMenu() {
  const { mode, user, orgs, activeOrg, role, signOut, selectOrg } = useAuth();

  if (mode === "demo") {
    return (
      <span className="text-muted-foreground hidden rounded-full border px-2 py-0.5 text-xs sm:inline" title="Running on the local demo backend">
        Demo
      </span>
    );
  }
  if (!user) return null;

  const initial = (user.email?.[0] ?? "U").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account menu">
          <Avatar className="size-7">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="truncate">{user.email ?? "Signed in"}</div>
          {role && (
            <div className="text-muted-foreground text-xs font-normal">
              {ROLE_LABELS[role]}
              {activeOrg ? ` · ${activeOrg.name}` : ""}
            </div>
          )}
        </DropdownMenuLabel>

        {orgs.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">Organizations</DropdownMenuLabel>
            {orgs.map((o) => (
              <DropdownMenuItem key={o.organization.id} onClick={() => selectOrg(o.organization.id)}>
                <Building2 className="size-4" />
                <span className="truncate">{o.organization.name}</span>
                {o.organization.id === activeOrg?.id && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
