import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import AddItemForm from "@/components/items/AddItemForm";

export default async function EditItemPage({ params }: { params: { id: string } }) {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");

  const item = await prisma.bookableItem.findUnique({ where: { id: params.id } });
  if (!item) notFound();

  const defaultValues = {
    name:         item.name,
    description:  item.description ?? "",
    unit:         item.unit,
    requiresBookingTerms: item.requiresBookingTerms,
    requiresItemBookingTerms: item.requiresItemBookingTerms,
    pricePerUnit: item.pricePerUnit.toString(),
    quantity:     item.quantity,
    sortOrder:    item.sortOrder,
    isActive:     item.isActive,
    tags:         item.tags,
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link href="/items" className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--navy)] mb-1">
            <ArrowLeft size={14} /> Back to Items & Packages
          </Link>
          <h1 className="page-title">Edit Item</h1>
          <p className="page-subtitle">{item.name}</p>
        </div>
      </div>

      <div className="card max-w-[640px]">
        <div className="card-inset">
          <AddItemForm itemId={item.id} defaultValues={defaultValues} />
        </div>
      </div>
    </div>
  );
}
