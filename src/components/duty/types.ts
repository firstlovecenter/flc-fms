import type { DutyLogStatus, DutyTemplateType, DutyTimeType } from "@prisma/client";

export type SerializedDutyLog = {
  id: string;
  date: string;
  status: DutyLogStatus;
  assigneeSignedAt: string | null;
  supervisorSignedAt: string | null;
  template: {
    id: string;
    name: string;
    type: DutyTemplateType;
  };
  assignedTo: { id: string; name: string };
  createdBy: { id: string; name: string };
  supervisor: { id: string; name: string } | null;
  items: {
    id: string;
    sortOrder: number;
    timeType: DutyTimeType;
    scheduledTime: string | null;
    description: string;
    isDone: boolean;
    completedAt: string | null;
    signedBy: { id: string; name: string } | null;
  }[];
};

export function serializeDutyLog(
  log: {
    id: string;
    date: Date;
    status: DutyLogStatus;
    assigneeSignedAt: Date | null;
    supervisorSignedAt: Date | null;
    template: { id: string; name: string; type: DutyTemplateType };
    assignedTo: { id: string; name: string };
    createdBy: { id: string; name: string };
    supervisor: { id: string; name: string } | null;
    items: {
      id: string;
      sortOrder: number;
      timeType: DutyTimeType;
      scheduledTime: string | null;
      description: string;
      isDone: boolean;
      completedAt: Date | null;
      signedBy: { id: string; name: string } | null;
    }[];
  },
): SerializedDutyLog {
  return {
    ...log,
    date: log.date.toISOString(),
    assigneeSignedAt: log.assigneeSignedAt?.toISOString() ?? null,
    supervisorSignedAt: log.supervisorSignedAt?.toISOString() ?? null,
    items: log.items.map((item) => ({
      ...item,
      completedAt: item.completedAt?.toISOString() ?? null,
    })),
  };
}
