"use client";

import { useState, useCallback } from "react";
import StaffSidebar from "@/components/staff-shell/StaffSidebar";
import Topbar from "@/components/ui/Topbar";
import OfflineQueueBanner from "@/components/layout/OfflineQueueBanner";

export default function StaffShell({
  children,
  name,
  role,
  profilePicture,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
  profilePicture?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useCallback(() => setMenuOpen((o) => !o), []);
  const close  = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="flex h-[100dvh] bg-cream overflow-hidden">
      <StaffSidebar role={role} name={name} profilePicture={profilePicture} isOpen={menuOpen} onClose={close} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        <Topbar name={name} role={role} profilePicture={profilePicture} onMenuToggle={toggle} />
        <OfflineQueueBanner />
        <main
          className="staff-main"
          style={{ flex: 1, overflowY: "auto" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
