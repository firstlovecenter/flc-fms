import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { getBookableItems } from "@/actions/bookable-items.actions";
import AddBundleForm from "@/components/items/AddBundleForm";

import { Card } from "@/components/ui/card";

export default async function EditBundlePage({ params }: { params: { id: string } }) {
  await requirePerm("items:manage");

  const [bundle, availableItems] = await Promise.all([
    prisma.bookableBundle.findUnique({
      where: { id: params.id },
      include: { components: { include: { item: true } } },
    }),
    getBookableItems(),
  ]);

  if (!bundle) notFound();

  const defaultValues = {
    name:        bundle.name,
    tagline:     bundle.tagline ?? "",
    description: bundle.description ?? "",
    requiresBookingTerms: bundle.requiresBookingTerms,
    requiresItemBookingTerms: bundle.requiresItemBookingTerms,
    price:       bundle.price.toString(),
    sortOrder:   bundle.sortOrder,
    isActive:    bundle.isActive,
    tags:        bundle.tags,
    components:  bundle.components.map(c => ({
      itemId:   c.itemId,
      quantity: c.quantity,
      label:    c.label ?? "",
    })),
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link href="/items" className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--navy)] mb-1">
            <ArrowLeft size={14} /> Back to Items & Packages
          </Link>
          <h1 className="page-title">Edit Package</h1>
          <p className="page-subtitle">{bundle.name}</p>
        </div>
      </div>

      <Card className="max-w-[720px]">
        <div className="card-inset">
          <AddBundleForm
            bundleId={bundle.id}
            availableItems={availableItems}
            defaultValues={defaultValues}
          />
        </div>
      </Card>
    </div>
  );
}
