"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  KeyRound,
  Settings,
  UserCircle,
  ShieldAlert,
  Plus,
  X,
} from "lucide-react";
import {
  STAFF_NAV_GROUPS,
  STAFF_ADMIN_NAV,
  STAFF_BOTTOM_NAV,
  STAFF_ACTION_ITEMS,
  navItemVisible,
  type Permission,
  type PermissionSet,
} from "@/lib/permissions";

type SearchItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  keywords?: string[];
  group: string;
};

const NAV_ICONS: Record<string, React.ElementType> = {
  "/dashboard": LayoutDashboard,
  "/tasks": ListTodo,
  "/bookings": CalendarDays,
  "/checkin": ClipboardCheck,
  "/ceremony-codes": KeyRound,
  "/bookings/content": FileText,
  "/duty": ClipboardList,
  "/facilities": Building2,
  "/facilities/categories": Tags,
  "/items": Package,
  "/inventory": Boxes,
  "/maintenance": Wrench,
  "/transactions": ArrowLeftRight,
  "/reports": BarChart3,
  "/staff": Users,
  "/users": Users,
  "/audit": ShieldAlert,
  "/settings": Settings,
  "/profile": UserCircle,
  "/bookings/new": Plus,
  "/duty/new": Plus,
  "/transactions/new-expense": Plus,
  "/transactions/new-income": Plus,
};

const NAV_KEYWORDS: Record<string, string[]> = {
  "/dashboard": ["home", "overview"],
  "/tasks": ["todo", "to-do", "inbox", "task list"],
  "/duty": ["duty", "schedule", "checklist", "man on duty"],
  "/bookings": ["reservations", "booking list"],
  "/checkin": ["checkin", "arrival"],
  "/ceremony-codes": ["wedding", "naming", "ceremony", "access code"],
  "/bookings/content": ["terms", "content"],
  "/facilities": ["venues", "rooms"],
  "/facilities/categories": ["categories", "pricing", "rates"],
  "/items": ["bundles", "bookable items"],
  "/inventory": ["stock", "equipment"],
  "/maintenance": ["repairs", "schedule"],
  "/transactions": ["income", "expenses", "finance", "savings"],
  "/reports": ["analytics", "summary"],
  "/staff": ["employees", "team"],
  "/settings": ["settings", "configuration", "contact"],
  "/profile": ["profile", "account", "me"],
  "/users": ["accounts", "user management"],
  "/audit": ["logs", "history"],
  "/bookings/new": ["create booking", "add booking"],
  "/duty/new": ["duty", "assign", "schedule", "create"],
  "/transactions/new-expense": ["add expense", "create expense"],
  "/transactions/new-income": ["add income", "create income"],
};

function buildSearchItems(
  role: string,
  permissions: PermissionSet | undefined,
  hasPerm: (p: Permission) => boolean
): SearchItem[] {
  const items: SearchItem[] = [];

  for (const action of STAFF_ACTION_ITEMS) {
    if (!navItemVisible(action, role, hasPerm)) continue;
    items.push({
      label: action.label,
      href: action.href,
      icon: NAV_ICONS[action.href] ?? Plus,
      keywords: NAV_KEYWORDS[action.href],
      group: "Actions",
    });
  }

  for (const group of STAFF_NAV_GROUPS) {
    for (const item of group.items) {
      if (!navItemVisible(item, role, hasPerm)) continue;
      items.push({
        label: item.label,
        href: item.href,
        icon: NAV_ICONS[item.href] ?? LayoutDashboard,
        keywords: NAV_KEYWORDS[item.href],
        group: "Navigate",
      });
    }
  }

  if (role === "SUPER_ADMIN") {
    for (const item of STAFF_ADMIN_NAV) {
      items.push({
        label: item.label,
        href: item.href,
        icon: NAV_ICONS[item.href] ?? Users,
        keywords: NAV_KEYWORDS[item.href],
        group: "Navigate",
      });
    }
    items.push({
      label: "Category / Pricing",
      href: "/facilities/categories",
      icon: Tags,
      keywords: NAV_KEYWORDS["/facilities/categories"],
      group: "Navigate",
    });
  }

  for (const item of STAFF_BOTTOM_NAV) {
    if (!navItemVisible(item, role, hasPerm)) continue;
    items.push({
      label: item.label,
      href: item.href,
      icon: NAV_ICONS[item.href] ?? UserCircle,
      keywords: NAV_KEYWORDS[item.href],
      group: "Navigate",
    });
  }

  return items;
}

export default function CommandSearch({
  onClose,
  role = "",
  permissions,
}: {
  onClose: () => void;
  role?: string;
  permissions?: PermissionSet;
}) {
  const hasPerm = (p: Permission): boolean => {
    if (role === "SUPER_ADMIN") return true;
    return permissions?.[p] ?? false;
  };

  const ALL_ITEMS = useMemo(
    () => buildSearchItems(role, permissions, hasPerm),
    [role, permissions]
  );

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

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
                      key={`${item.href}-${item.label}`}
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

        <div className="border-t border-[var(--border)] px-4 py-2 flex items-center gap-4 text-[0.65rem] text-[var(--muted)]">
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--cream-dark)] border border-[var(--border)] font-mono text-[0.6rem]">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--cream-dark)] border border-[var(--border)] font-mono text-[0.6rem]">↵</kbd> Open</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--cream-dark)] border border-[var(--border)] font-mono text-[0.6rem]">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
