"use client";

import { useState, useCallback, useEffect } from "react";
import StaffSidebar from "@/components/staff-shell/StaffSidebar";
import MobileBottomNav from "@/components/staff-shell/MobileBottomNav";
import Topbar from "@/components/ui/Topbar";
import CommandSearch from "@/components/ui/CommandSearch";
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

  // Dialogs, sheets and menus portal to <body>, outside this wrapper; give
  // <body> the staff theme too while the shell is mounted.
  useEffect(() => {
    document.body.classList.add("surface-cool");
    return () => document.body.classList.remove("surface-cool");
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
      <StaffSidebar role={role} name={name} profilePicture={profilePicture} permissions={permissions} canUsePatronContext={canUsePatronContext} isOpen={menuOpen} onClose={close} collapsed={collapsed} onToggleCollapse={toggleCollapse} onSearch={openSearch} />
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
          <Topbar name={name} role={role} profilePicture={profilePicture} onMenuToggle={toggle} onSearch={openSearch} />
          <div className="staff-content mx-auto w-full max-w-screen-2xl">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav onMenuToggle={toggle} />
      {searchOpen && <CommandSearch onClose={closeSearch} role={role} permissions={permissions} />}
    </div>
  );
}
