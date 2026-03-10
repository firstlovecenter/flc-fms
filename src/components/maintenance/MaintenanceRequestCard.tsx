"use client";

import Link from "next/link";
import MaintenanceStatusUpdate from "@/components/maintenance/MaintenanceStatusUpdate";

// Format date and currency locally
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface MaintenanceRequestCardProps {
  request: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    createdAt: Date;
    estimatedCost: number | null;
    actualCost: number | null;
    facility: { name: string };
    requestedBy: { name: string };
    assignedTo: { name: string } | null;
  };
  canManage: boolean;
  index: number;
}

export default function MaintenanceRequestCard({
  request: r,
  canManage,
  index: idx,
}: MaintenanceRequestCardProps) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.12)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(200, 163, 90, 0.2)",
        borderRadius: "var(--r-md)",
        padding: "20px",
        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        animation: `fade-in 0.3s ease-out ${idx * 0.05}s backwards`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.15)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(200, 163, 90, 0.4)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(10, 22, 40, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.12)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(200, 163, 90, 0.2)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
            <h3 style={{ fontWeight: 600, color: "var(--navy)", fontSize: "1rem" }}>{r.title}</h3>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              background: r.priority === "HIGH" ? "rgba(239, 68, 68, 0.15)" : r.priority === "MEDIUM" ? "rgba(245, 158, 11, 0.15)" : "rgba(34, 197, 94, 0.15)",
              color: r.priority === "HIGH" ? "#EF4444" : r.priority === "MEDIUM" ? "#F59E0B" : "#22C55E",
              fontSize: "0.75rem",
              fontWeight: 600,
              borderRadius: "var(--r-xs)",
              border: `1px solid ${r.priority === "HIGH" ? "rgba(239, 68, 68, 0.3)" : r.priority === "MEDIUM" ? "rgba(245, 158, 11, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
            }}>
              {r.priority}
            </span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              background: r.status === "OPEN" ? "rgba(245, 158, 11, 0.15)" : r.status === "IN_PROGRESS" ? "rgba(59, 130, 246, 0.15)" : "rgba(34, 197, 94, 0.15)",
              color: r.status === "OPEN" ? "#F59E0B" : r.status === "IN_PROGRESS" ? "#3B82F6" : "#22C55E",
              fontSize: "0.75rem",
              fontWeight: 600,
              borderRadius: "var(--r-xs)",
              border: `1px solid ${r.status === "OPEN" ? "rgba(245, 158, 11, 0.3)" : r.status === "IN_PROGRESS" ? "rgba(59, 130, 246, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
            }}>
              {r.status.replace("_", " ")}
            </span>
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--slate)", marginBottom: "12px" }}>{r.description}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "0.8rem", color: "var(--slate)" }}>
            <span>📍 {r.facility.name}</span>
            <span>👤 {r.requestedBy.name}</span>
            {r.assignedTo && <span>🔧 Assigned to {r.assignedTo.name}</span>}
            <span>📅 {formatDate(r.createdAt)}</span>
            {r.estimatedCost && <span>Est. {formatCurrency(Number(r.estimatedCost))}</span>}
            {r.actualCost && <span>Actual {formatCurrency(Number(r.actualCost))}</span>}
          </div>
        </div>
        {canManage && !["RESOLVED", "CLOSED"].includes(r.status) && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <Link href={`/maintenance/${r.id}`} className="btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>View</Link>
            <MaintenanceStatusUpdate requestId={r.id} currentStatus={r.status} />
          </div>
        )}
        {(!canManage || ["RESOLVED", "CLOSED"].includes(r.status)) && (
          <Link href={`/maintenance/${r.id}`} className="btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 12px", flexShrink: 0 }}>View</Link>
        )}
      </div>
    </div>
  );
}
