import { headers } from "next/headers";
import { prisma } from "./db/prisma";

interface AuditParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  before?: object | null;
  after?: object | null;
}

export function auditLog(params: AuditParams): void {
  // Fire-and-forget — never block the caller
  (async () => {
    try {
      const h = headers();
      const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        "unknown";
      const ua = h.get("user-agent") ?? "unknown";

      await prisma.auditLog.create({
        data: {
          userId:    params.userId ?? null,
          action:    params.action,
          entity:    params.entity,
          entityId:  params.entityId,
          before:    params.before ?? undefined,
          after:     params.after ?? undefined,
          ipAddress: ip,
          userAgent: ua}});
    } catch (err) {
      console.error("[AuditLog] Failed to write:", err);
    }
  })();
}
