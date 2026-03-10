"use client";

import { useState, useCallback } from "react";
import CampusSidebar from "@/components/campus/CampusSidebar";
import Topbar from "@/components/ui/Topbar";

export default function CampusShell({
  children,
  name,
  role,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useCallback(() => setMenuOpen((o) => !o), []);
  const close  = useCallback(() => setMenuOpen(false), []);

  return (
    <div style={{ display: "flex", height: "100dvh", background: "var(--cream)", overflow: "hidden" }}>
      <CampusSidebar role={role} name={name} isOpen={menuOpen} onClose={close} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Topbar name={name} role={role} onMenuToggle={toggle} />
        <main
          className="campus-main"
          style={{ flex: 1, overflowY: "auto" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
