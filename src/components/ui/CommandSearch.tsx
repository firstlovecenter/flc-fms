"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CalendarDays,
  LayoutDashboard,
  Building2,
  Tags,
  Boxes,
  Users,
  ArrowLeftRight,
  BarChart3,
  Wrench,
  Package,
  FileText,
  ClipboardCheck,
  ClipboardList,
  ListTodo,
  ShieldAlert,
  Plus,
  X,
} from "lucide-react";

type SearchItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  keywords?: string[];
  group: string;
  superAdminOnly?: boolean;
  roles?: string[];
};

const NAV_ITEMS: SearchItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: ["home", "overview"], group: "Navigate" },
  { label: "Tasks", href: "/tasks", icon: ListTodo, keywords: ["todo", "to-do", "inbox", "task list"], group: "Navigate" },
  { label: "Duty Logs", href: "/duty", icon: ClipboardList, keywords: ["duty", "schedule", "checklist", "man on duty"], group: "Navigate" },
  { label: "Bookings", href: "/bookings", icon: CalendarDays, keywords: ["reservations", "booking list"], group: "Navigate" },
  { label: "Check-In", href: "/checkin", icon: ClipboardCheck, keywords: ["checkin", "arrival"], group: "Navigate" },
  { label: "Booking Content", href: "/bookings/content", icon: FileText, keywords: ["terms", "content"], group: "Navigate" },
  { label: "Facilities", href: "/facilities", icon: Building2, keywords: ["venues", "rooms"], group: "Navigate" },
  { label: "Category / Pricing", href: "/facilities/categories", icon: Tags, keywords: ["categories", "pricing", "rates"], group: "Navigate", superAdminOnly: true },
  { label: "Items & Packages", href: "/items", icon: Package, keywords: ["bundles", "bookable items"], group: "Navigate" },
  { label: "Inventory", href: "/inventory", icon: Boxes, keywords: ["stock", "equipment"], group: "Navigate" },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight, keywords: ["income", "expenses", "finance"], group: "Navigate" },
  { label: "Reports", href: "/reports", icon: BarChart3, keywords: ["analytics", "summary"], group: "Navigate" },
  { label: "Staff", href: "/staff", icon: Users, keywords: ["employees", "team"], group: "Navigate" },
  { label: "Maintenance", href: "/maintenance", icon: Wrench, keywords: ["repairs", "schedule"], group: "Navigate" },
  { label: "Manage Users", href: "/users", icon: Users, keywords: ["accounts", "user management"], group: "Navigate" },
  { label: "Audit Logs", href: "/audit", icon: ShieldAlert, keywords: ["logs", "history"], group: "Navigate" },
];

const ACTION_ITEMS: SearchItem[] = [
  { label: "New Booking", href: "/bookings/new", icon: Plus, keywords: ["create booking", "add booking"], group: "Actions" },
  {
    label: "Create Duty",
    href: "/duty/new",
    icon: Plus,
    keywords: ["duty", "assign", "schedule", "create"],
    group: "Actions",
    roles: ["FACILITY_MANAGER", "SUPER_ADMIN"],
  },
  { label: "New Expense", href: "/transactions/new-expense", icon: Plus, keywords: ["add expense", "create expense"], group: "Actions" },
  { label: "New Income", href: "/transactions/new-income", icon: Plus, keywords: ["add income", "create income"], group: "Actions" },
];

export default function CommandSearch({ onClose, role }: { onClose: () => void; role?: string }) {
  const ALL_ITEMS = [...ACTION_ITEMS, ...NAV_ITEMS].filter((item) => {
    if (item.superAdminOnly && role !== "SUPER_ADMIN") return false;
    if (item.roles && role && !item.roles.includes(role)) return false;
    if (item.roles && !role) return false;
    return true;
  });
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? ALL_ITEMS.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.toLowerCase().includes(q))
        );
      })
    : ALL_ITEMS;

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function navigate(href: string) {
    onClose();
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      scrollToActive(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      scrollToActive(activeIndex - 1);
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      navigate(filtered[activeIndex].href);
    }
  }

  function scrollToActive(index: number) {
    const el = listRef.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }

  if (!open) return null;

  // Group items for display
  const groups: Record<string, SearchItem[]> = {};
  for (const item of filtered) {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  }
  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1a2233] rounded-xl shadow-2xl w-full max-w-lg border border-[var(--border)] overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-[var(--border)]">
          <Search size={16} className="text-[var(--muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions…"
            className="flex-1 h-12 bg-transparent border-0 outline-none text-sm text-[var(--navy)] placeholder:text-[var(--muted)]"
          />
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded bg-[var(--cream-dark)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--navy)] transition-colors"
          >
            <X size={12} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[340px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div className="px-4 pt-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {group}
                </div>
                {items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        idx === activeIndex
                          ? "bg-[var(--cream-dark)] text-[var(--navy)]"
                          : "text-[var(--slate)] hover:bg-[var(--cream)]"
                      }`}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <Icon size={16} className={idx === activeIndex ? "text-[var(--gold)]" : "text-[var(--muted)]"} />
                      <span className="flex-1 font-medium">{item.label}</span>
                      {idx === activeIndex && (
                        <kbd className="text-[0.6rem] px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--muted)] font-mono">↵</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-4 py-2 flex items-center gap-4 text-[0.65rem] text-[var(--muted)]">
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--cream-dark)] border border-[var(--border)] font-mono text-[0.6rem]">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--cream-dark)] border border-[var(--border)] font-mono text-[0.6rem]">↵</kbd> Open</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--cream-dark)] border border-[var(--border)] font-mono text-[0.6rem]">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
