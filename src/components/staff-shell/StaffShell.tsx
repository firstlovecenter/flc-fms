"use client";

import { useState, useCallback, useEffect } from "react";
import StaffSidebar from "@/components/staff-shell/StaffSidebar";
import MobileBottomNav from "@/components/staff-shell/MobileBottomNav";
import Topbar from "@/components/ui/Topbar";
import OfflineQueueBanner from "@/components/layout/OfflineQueueBanner";
import ImpersonationBanner from "@/components/ImpersonationBanner";

interface ImpersonatedBy {
  id: string;
  name: string;
}

export default function StaffShell({
  children,
  name,
  role,
  profilePicture,
  impersonatedBy,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
  profilePicture?: string;
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
      <StaffSidebar role={role} name={name} profilePicture={profilePicture} isOpen={menuOpen} onClose={close} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {impersonatedBy && (
          <ImpersonationBanner
            adminName={impersonatedBy.name}
            targetName={name}
            targetRole={role}
          />
        )}
        <Topbar name={name} role={role} profilePicture={profilePicture} onMenuToggle={toggle} />
        <OfflineQueueBanner />
        <main className="staff-main flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <MobileBottomNav onMenuToggle={toggle} />
    </div>
  );
}
