"use client";

import { useState, useCallback, useEffect } from "react";
import StaffSidebar from "@/components/staff-shell/StaffSidebar";
import MobileBottomNav from "@/components/staff-shell/MobileBottomNav";
import Topbar from "@/components/ui/Topbar";
import CommandSearch from "@/components/ui/CommandSearch";
import OfflineQueueBanner from "@/components/layout/OfflineQueueBanner";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import BodyScope from "@/components/layout/BodyScope";
import { useStackedTables } from "@/components/ui/useStackedTables";
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
  // Tables become labelled cards on phones (see "Phone tables" in globals.css).
  useStackedTables(".staff-main");

  // Phones and tablets navigate with the bottom bar's launcher sheet; the
  // header's menu button opens the same sheet.
  const [launcherOpen, setLauncherOpen] = useState(false);
  const openLauncher = useCallback(() => setLauncherOpen(true), []);

  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

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

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="surface-cool flex h-[100dvh] overflow-hidden bg-background">
      <BodyScope className="surface-cool" />
      <StaffSidebar role={role} name={name} profilePicture={profilePicture} permissions={permissions} canUsePatronContext={canUsePatronContext} collapsed={collapsed} onToggleCollapse={toggleCollapse} onSearch={openSearch} />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {impersonatedBy && (
          <ImpersonationBanner
            adminName={impersonatedBy.name}
            targetName={name}
            targetRole={role}
          />
        )}
        <OfflineQueueBanner />
        <main className="staff-main flex-1 overflow-y-auto">
          <Topbar name={name} role={role} profilePicture={profilePicture} permissions={permissions} onMenuToggle={openLauncher} onSearch={openSearch} />
          <div className="staff-content mx-auto w-full max-w-screen-2xl">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav
        role={role}
        name={name}
        permissions={permissions}
        canUsePatronContext={canUsePatronContext}
        launcherOpen={launcherOpen}
        onLauncherChange={setLauncherOpen}
        onSearch={openSearch}
      />
      {searchOpen && <CommandSearch onClose={closeSearch} role={role} permissions={permissions} />}
    </div>
  );
}
