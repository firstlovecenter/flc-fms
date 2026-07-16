"use client";

import { useState, useCallback, useEffect } from "react";
import StaffSidebar from "@/components/staff-shell/StaffSidebar";
import MobileBottomNav from "@/components/staff-shell/MobileBottomNav";
import Topbar from "@/components/ui/Topbar";
import OfflineQueueBanner from "@/components/layout/OfflineQueueBanner";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import type { PermissionSet } from "@/lib/permissions";

interface ImpersonatedBy {
  id: string;
  name: string;
}

export default function StaffShell({
  children,
  name,
  role,
  profilePicture,
  canUsePatronContext,
  permissions,
  impersonatedBy,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
  profilePicture?: string;
  canUsePatronContext?: boolean;
  permissions?: PermissionSet;
  impersonatedBy?: ImpersonatedBy;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useCallback(() => setMenuOpen((o) => !o), []);
  const close  = useCallback(() => setMenuOpen(false), []);

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);
  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <div className="surface-cool flex h-[100dvh] bg-cream overflow-hidden">
      <StaffSidebar role={role} name={name} profilePicture={profilePicture} permissions={permissions} canUsePatronContext={canUsePatronContext} isOpen={menuOpen} onClose={close} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {impersonatedBy && (
          <ImpersonationBanner
            adminName={impersonatedBy.name}
            targetName={name}
            targetRole={role}
          />
        )}
        <Topbar name={name} role={role} profilePicture={profilePicture} permissions={permissions} onMenuToggle={toggle} />
        <OfflineQueueBanner />
        <main className="staff-main flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <MobileBottomNav onMenuToggle={toggle} />
    </div>
  );
}
