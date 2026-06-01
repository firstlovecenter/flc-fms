"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AssignDutyForm from "./AssignDutyForm";

type Template = { id: string; name: string; type: string };
type Staff = { id: string; name: string };

export default function CreateDutyDialog({
  templates,
  staff,
  defaultDate,
  triggerClassName,
}: {
  templates: Template[];
  staff: Staff[];
  defaultDate: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  if (templates.length === 0 || staff.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={
          triggerClassName ??
          "btn-primary inline-flex items-center gap-2"
        }
      >
        <Plus className="h-4 w-4" />
        Assign duty
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign duty</DialogTitle>
        </DialogHeader>
        <AssignDutyForm
          templates={templates}
          staff={staff}
          defaultDate={defaultDate}
          embedded
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
