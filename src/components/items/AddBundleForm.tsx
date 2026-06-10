"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBookableBundle, updateBookableBundle } from "@/actions/bookable-items.actions";
import { Plus, X, Layers } from "lucide-react";
import MediaUploader from "@/components/ui/MediaUploader";
import { Button } from "@/components/ui/button";
import { Input, inputStyles } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AvailableItem = {
  id: string;
  name: string;
  unit: string;
  pricePerUnit: string;
};

type ComponentRow = {
  itemId: string;
  quantity: number;
  label: string;
};

type BundleDefaults = {
  name?: string;
  tagline?: string;
  description?: string;
  price?: string;
  sortOrder?: number;
  isActive?: boolean;
  requiresBookingTerms?: boolean;
  requiresItemBookingTerms?: boolean;
  tags?: string[];
  components?: ComponentRow[];
};

export default function AddBundleForm({
  availableItems,
  bundleId,
  defaultValues,
}: {
  availableItems: AvailableItem[];
  bundleId?: string;
  defaultValues?: BundleDefaults;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [components, setComponents] = useState<ComponentRow[]>(defaultValues?.components ?? [{ itemId: "", quantity: 1, label: "" }]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(defaultValues?.tags ?? []);
  const [images, setImages] = useState<string[]>([]);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  }

  function addComponent() {
    setComponents(prev => [...prev, { itemId: "", quantity: 1, label: "" }]);
  }

  function removeComponent(idx: number) {
    setComponents(prev => prev.filter((_, i) => i !== idx));
  }

  function updateComponent(idx: number, field: keyof ComponentRow, value: string | number) {
    setComponents(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validComponents = components.filter(c => c.itemId);
    if (validComponents.length === 0) {
      setError("Add at least one item to the package.");
      return;
    }

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data = {
      name:        fd.get("name") as string,
      description: fd.get("description") as string || undefined,
      tagline:     fd.get("tagline") as string || undefined,
      price:       Number(fd.get("price")),
      sortOrder:   Number(fd.get("sortOrder") ?? 0),
      isActive:    fd.get("isActive") === "on",
      requiresBookingTerms: fd.get("requiresBookingTerms") === "on",
      requiresItemBookingTerms: fd.get("requiresItemBookingTerms") === "on",
      tags,
      images,
      components: validComponents.map(c => ({
        itemId:   c.itemId,
        quantity: c.quantity,
        label:    c.label || undefined,
      })),
    };

    const result = bundleId ? await updateBookableBundle(bundleId, data) : await createBookableBundle(data);
    setLoading(false);
    if (result && "error" in result) { setError(result.error as string); return; }
    router.push("/items");
    router.refresh();
  }

  // Compute price suggestion from components
  const suggested = components.reduce((sum, c) => {
    const item = availableItems.find(i => i.id === c.itemId);
    return sum + (item ? Number(item.pricePerUnit) * c.quantity : 0);
  }, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="bundle-name">Package Name *</Label>
          <Input id="bundle-name" name="name" required defaultValue={defaultValues?.name} placeholder="e.g. Wedding Reception Bundle, Conference Starter Pack" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="bundle-tagline">Tagline</Label>
          <Input id="bundle-tagline" name="tagline" defaultValue={defaultValues?.tagline} placeholder="Short pitch — e.g. Everything for a perfect outdoor wedding" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="bundle-description">Description</Label>
          <Textarea id="bundle-description" name="description" rows={2} defaultValue={defaultValues?.description} placeholder="Describe what's included and any conditions" />
        </div>
        <div>
          <Label htmlFor="bundle-price">
            Flat Price (GH₵) *
            {suggested > 0 && (
              <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                (items total: GH₵{suggested.toFixed(2)})
              </span>
            )}
          </Label>
          <Input id="bundle-price" name="price" type="number" step="0.01" min="0" required defaultValue={suggested > 0 ? suggested.toFixed(2) : ""} />
          <p className="text-xs text-[var(--muted)] mt-1">Set below items total for a bundle discount</p>
        </div>
        <div>
          <Label htmlFor="bundle-sort-order">Sort Order</Label>
          <Input id="bundle-sort-order" name="sortOrder" type="number" defaultValue={defaultValues?.sortOrder ?? 0} />
        </div>
      </div>

      {/* Components */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="mb-0">Package Contents *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addComponent} className="gap-1">
            <Plus size={12} /> Add Item
          </Button>
        </div>
        <div className="space-y-2">
          {components.map((comp, idx) => (
            <div key={idx} className="flex gap-2 items-end p-3 rounded-xl" style={{ background: "var(--cream)", border: "1px solid var(--border)" }}>
              <div className="flex-1">
                <Label htmlFor={`bundle-comp-${idx}-item`} className="text-xs">Item</Label>
                <select
                  id={`bundle-comp-${idx}-item`}
                  value={comp.itemId}
                  onChange={e => updateComponent(idx, "itemId", e.target.value)}
                  className={cn(inputStyles)}
                >
                  <option value="">Select an item…</option>
                  {availableItems.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (GH₵{Number(i.pricePerUnit).toFixed(2)} / {i.unit})</option>
                  ))}
                </select>
              </div>
              <div style={{ width: 80 }}>
                <Label htmlFor={`bundle-comp-${idx}-qty`} className="text-xs">Qty</Label>
                <Input
                  id={`bundle-comp-${idx}-qty`}
                  type="number" min="1"
                  value={comp.quantity}
                  onChange={e => updateComponent(idx, "quantity", Number(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor={`bundle-comp-${idx}-label`} className="text-xs">Label (optional)</Label>
                <Input
                  id={`bundle-comp-${idx}-label`}
                  placeholder="Override display name"
                  value={comp.label}
                  onChange={e => updateComponent(idx, "label", e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeComponent(idx)}
                className="mb-0.5 text-[var(--muted)] hover:text-danger"
                title="Remove"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        {components.filter(c => c.itemId).length > 0 && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <Layers size={14} style={{ color: "var(--gold)" }} />
            <span className="text-xs text-[var(--muted)]">
              {components.filter(c => c.itemId).length} item type{components.filter(c => c.itemId).length !== 1 ? "s" : ""} in package
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <Label htmlFor="bundle-tags">Tags</Label>
        <div className="flex gap-2">
          <Input
            id="bundle-tags"
            className="flex-1"
            placeholder="wedding, conference, outdoor..."
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          />
          <Button type="button" variant="outline" onClick={addTag} className="gap-1">
            <Plus size={14} /> Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: "var(--cream)", color: "var(--navy)", border: "1px solid var(--border)" }}>
                {t}
                <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input name="isActive" type="checkbox" className="w-4 h-4 accent-[var(--navy)]" defaultChecked={defaultValues?.isActive !== false} />
        <span className="text-sm font-medium text-[var(--navy)]">Show in public catalog (active)</span>
      </label>

      <div className="space-y-2 rounded-xl border border-[var(--border)] bg-white p-4">
        <p className="text-xs uppercase tracking-wide font-semibold text-[var(--muted)]">Terms Mapping</p>
        <label className="flex items-center gap-2 text-sm text-[var(--navy)]">
          <input
            name="requiresBookingTerms"
            type="checkbox"
            defaultChecked={defaultValues?.requiresBookingTerms === true}
          />
          Require Booking Terms and Conditions
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--navy)]">
          <input
            name="requiresItemBookingTerms"
            type="checkbox"
            defaultChecked={defaultValues?.requiresItemBookingTerms ?? true}
          />
          Require Item Booking Terms
        </label>
      </div>

      {/* Images */}
      <MediaUploader
        mediaType="bundle"
        mediaId={bundleId}
        images={images}
        onImagesChange={setImages}
        max={4}
        label="Package Images"
        showMain
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} variant="gold" className="flex-1">
          {loading ? (bundleId ? "Updating…" : "Creating…") : (bundleId ? "Update Package" : "Create Package")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
