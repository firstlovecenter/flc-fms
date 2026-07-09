"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInventoryItem, updateInventoryItem } from "@/actions/inventory.actions";
import MediaUploader from "@/components/ui/MediaUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

const CONDITIONS = ["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED", "DISPOSED"] as const;
const STATUSES = ["AVAILABLE", "IN_USE", "CHECKED_OUT", "UNDER_MAINTENANCE", "DISPOSED", "LOST"] as const;

function toDateInputValue(d?: Date | string | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default function InventoryItemForm({
  categories,
  itemId,
  defaultValues,
}: {
  categories: { id: string; name: string }[];
  itemId?: string;
  defaultValues?: Partial<{
    categoryId: string | null;
    name: string;
    description: string | null;
    serialNumber: string | null;
    assetTag: string | null;
    condition: (typeof CONDITIONS)[number];
    status: (typeof STATUSES)[number];
    location: string | null;
    quantity: number;
    unitCost: number | null;
    purchaseDate: Date | string | null;
    supplier: string | null;
    warrantyExp: Date | string | null;
    notes: string | null;
    images: string[];
  }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>(defaultValues?.images ?? []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const unitCost = fd.get("unitCost");
    const purchaseDate = fd.get("purchaseDate");
    const warrantyExp = fd.get("warrantyExp");

    const data = {
      categoryId:   (fd.get("categoryId") as string) || undefined,
      name:         fd.get("name") as string,
      description:  (fd.get("description") as string) || undefined,
      serialNumber: (fd.get("serialNumber") as string) || undefined,
      assetTag:     (fd.get("assetTag") as string) || undefined,
      condition:    fd.get("condition") as (typeof CONDITIONS)[number],
      status:       fd.get("status") as (typeof STATUSES)[number],
      location:     (fd.get("location") as string) || undefined,
      quantity:     Number(fd.get("quantity")),
      unitCost:     unitCost ? Number(unitCost) : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate as string) : undefined,
      supplier:     (fd.get("supplier") as string) || undefined,
      warrantyExp:  warrantyExp ? new Date(warrantyExp as string) : undefined,
      notes:        (fd.get("notes") as string) || undefined,
      images,
    };

    const result = itemId
      ? await updateInventoryItem(itemId, data)
      : await createInventoryItem(data);

    setLoading(false);
    if (result && "error" in result) { setError(result.error as string); return; }
    router.push(itemId ? `/inventory/items/${itemId}` : "/inventory/items");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="inv-name">Item Name *</Label>
          <Input id="inv-name" name="name" required defaultValue={defaultValues?.name} placeholder="e.g. Plastic Chair, Projector, PA Speaker" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="inv-description">Description</Label>
          <Textarea id="inv-description" name="description" rows={2} defaultValue={defaultValues?.description ?? ""} placeholder="Brief description" />
        </div>

        <div>
          <Label htmlFor="inv-category">Category</Label>
          <NativeSelect id="inv-category" name="categoryId" defaultValue={defaultValues?.categoryId ?? ""} className="w-full text-sm">
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="inv-location">Location</Label>
          <Input id="inv-location" name="location" defaultValue={defaultValues?.location ?? ""} placeholder="e.g. Store Room A" />
        </div>

        <div>
          <Label htmlFor="inv-condition">Condition *</Label>
          <NativeSelect id="inv-condition" name="condition" defaultValue={defaultValues?.condition ?? "GOOD"} className="w-full text-sm">
            {CONDITIONS.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="inv-status">Status *</Label>
          <NativeSelect id="inv-status" name="status" defaultValue={defaultValues?.status ?? "AVAILABLE"} className="w-full text-sm">
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </NativeSelect>
        </div>

        <div>
          <Label htmlFor="inv-quantity">Quantity *</Label>
          <Input id="inv-quantity" name="quantity" type="number" min="1" required defaultValue={defaultValues?.quantity ?? 1} />
        </div>
        <div>
          <Label htmlFor="inv-unitCost">Unit Cost (GH₵)</Label>
          <Input id="inv-unitCost" name="unitCost" type="number" step="0.01" min="0" defaultValue={defaultValues?.unitCost ?? ""} />
        </div>

        <div>
          <Label htmlFor="inv-serial">Serial Number</Label>
          <Input id="inv-serial" name="serialNumber" defaultValue={defaultValues?.serialNumber ?? ""} />
        </div>
        <div>
          <Label htmlFor="inv-assetTag">Asset Tag</Label>
          <Input id="inv-assetTag" name="assetTag" defaultValue={defaultValues?.assetTag ?? ""} placeholder="Must be unique" />
        </div>

        <div>
          <Label htmlFor="inv-supplier">Supplier</Label>
          <Input id="inv-supplier" name="supplier" defaultValue={defaultValues?.supplier ?? ""} />
        </div>
        <div>
          <Label htmlFor="inv-purchaseDate">Purchase Date</Label>
          <Input id="inv-purchaseDate" name="purchaseDate" type="date" defaultValue={toDateInputValue(defaultValues?.purchaseDate)} />
        </div>

        <div>
          <Label htmlFor="inv-warrantyExp">Warranty Expiry</Label>
          <Input id="inv-warrantyExp" name="warrantyExp" type="date" defaultValue={toDateInputValue(defaultValues?.warrantyExp)} />
        </div>
      </div>

      <div>
        <Label htmlFor="inv-notes">Notes</Label>
        <Textarea id="inv-notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <MediaUploader
        mediaType="inventory"
        mediaId={itemId}
        images={images}
        onImagesChange={setImages}
        max={4}
        label="Item Images"
        showMain
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} variant="gold" className="flex-1">
          {loading ? (itemId ? "Updating…" : "Saving…") : (itemId ? "Update Item" : "Save Item")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
