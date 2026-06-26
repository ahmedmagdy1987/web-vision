"use client";

import { LogOut } from "lucide-react";
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
  const { mode, user, role, signOut } = useAuth();

  if (mode === "demo") {
    return (
      <span
        className="text-muted-foreground hidden rounded-full border px-2 py-0.5 text-xs sm:inline"
        title="Running on the local demo backend"
      >
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
          {/* Static internal team context — Malahi tenancy is not a product concept. */}
          <div className="text-muted-foreground text-xs font-normal">
            {role ? ROLE_LABELS[role] : "Member"} · Malahi
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
