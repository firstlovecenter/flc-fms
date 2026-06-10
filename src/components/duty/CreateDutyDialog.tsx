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
import type { VariantProps } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import type { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import AssignDutyForm from "./AssignDutyForm";

type Template = { id: string; name: string; type: string };
type Staff = { id: string; name: string };

export default function CreateDutyDialog({
  templates,
  staff,
  defaultDate,
  triggerVariant = "default",
  triggerClassName,
}: {
  templates: Template[];
  staff: Staff[];
  defaultDate: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  if (templates.length === 0 || staff.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size="sm"
            className={cn("gap-2", triggerClassName)}
          />
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
