"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Car,
  UserCheck,
  Clock,
  FileSpreadsheet,
  DollarSign,
  MessageSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "./actions";
import type { UserProfile } from "./layout";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: ("admin" | "supervisor")[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "supervisor"] },
  { label: "Usuarios", href: "/dashboard/users", icon: Users, roles: ["admin"] },
  { label: "Vehiculos", href: "/dashboard/vehicles", icon: Car, roles: ["admin", "supervisor"] },
  { label: "Choferes", href: "/dashboard/drivers", icon: UserCheck, roles: ["admin", "supervisor"] },
  { label: "Turnos", href: "/dashboard/shifts", icon: Clock, roles: ["admin", "supervisor"] },
  { label: "DiDi", href: "/dashboard/didi", icon: FileSpreadsheet, roles: ["admin", "supervisor"] },
  { label: "Payroll", href: "/dashboard/payroll", icon: DollarSign, roles: ["admin"] },
  { label: "AI Chat", href: "/dashboard/chat", icon: MessageSquare, roles: ["admin", "supervisor"] },
];

type SidebarProps = {
  profile: UserProfile;
};

export const Sidebar = ({ profile }: SidebarProps) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(profile.role)
  );

  const handleToggleCollapse = () => setCollapsed((prev) => !prev);

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Image
            src={mounted && theme === "dark" ? "/lafa-logo-dark.png" : "/lafa-logo.webp"}
            alt="LAFA"
            width={mounted && theme === "dark" ? (collapsed ? 52 : 64) : (collapsed ? 40 : 48)}
            height={mounted && theme === "dark" ? (collapsed ? 52 : 64) : (collapsed ? 40 : 48)}
            className="shrink-0 object-contain"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleTheme}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={mounted && theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            tabIndex={0}
          >
            {mounted && theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            tabIndex={0}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label={item.label}
              tabIndex={0}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="border-t p-3">
        {!collapsed && (
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium">{profile.name || profile.email}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">{profile.role}</p>
          </div>
        )}
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={cn("w-full text-muted-foreground hover:text-destructive", !collapsed && "justify-start gap-2")}
            aria-label="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Cerrar sesion</span>}
          </Button>
        </form>
      </div>
    </aside>
  );
};
