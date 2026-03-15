"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBookableItem, updateBookableItem } from "@/actions/bookable-items.actions";
import { Plus, X } from "lucide-react";
import MediaUploader from "@/components/ui/MediaUploader";

export default function AddItemForm({ defaultValues, itemId }: {
  defaultValues?: Partial<{
    name: string; description: string; unit: string; pricePerUnit: string;
    quantity: number; tags: string[]; isActive: boolean; sortOrder: number;
  }>;
  itemId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(defaultValues?.tags ?? []);
  const [images, setImages] = useState<string[]>([]);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data = {
      name:         fd.get("name") as string,
      description:  fd.get("description") as string || undefined,
      unit:         fd.get("unit") as string,
      pricePerUnit: Number(fd.get("pricePerUnit")),
      quantity:     Number(fd.get("quantity")),
      sortOrder:    Number(fd.get("sortOrder") ?? 0),
      isActive:     fd.get("isActive") === "on",
      tags,
      images,
    };
    const result = itemId ? await updateBookableItem(itemId, data) : await createBookableItem(data);
    setLoading(false);
    if (result && "error" in result) { setError(result.error as string); return; }
    router.push("/items");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Item Name *</label>
          <input name="name" className="input" required defaultValue={defaultValues?.name} placeholder="e.g. Plastic Chair, Tent 10x10, PA System" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Description</label>
          <textarea name="description" className="input" rows={2} defaultValue={defaultValues?.description} placeholder="Brief description visible to guests" />
        </div>
        <div>
          <label className="label">Unit *</label>
          <input name="unit" className="input" required defaultValue={defaultValues?.unit ?? "piece"} placeholder="piece, set, day, microphone..." />
          <p className="text-xs text-[var(--muted)] mt-1">What counts as one unit? Shown as &quot;GH₵X / {"{unit}"}&quot;</p>
        </div>
        <div>
          <label className="label">Price per Unit (GH₵) *</label>
          <input name="pricePerUnit" type="number" step="0.01" min="0" className="input" required defaultValue={defaultValues?.pricePerUnit ?? "0"} />
        </div>
        <div>
          <label className="label">Stock Quantity *</label>
          <input name="quantity" type="number" min="1" className="input" required defaultValue={defaultValues?.quantity ?? 1} />
          <p className="text-xs text-[var(--muted)] mt-1">Total units available for booking</p>
        </div>
        <div>
          <label className="label">Sort Order</label>
          <input name="sortOrder" type="number" className="input" defaultValue={defaultValues?.sortOrder ?? 0} />
          <p className="text-xs text-[var(--muted)] mt-1">Lower = appears earlier in catalog</p>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="label">Tags</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Type a tag and press Add (e.g. audio, outdoor, furniture)"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          />
          <button type="button" onClick={addTag} className="btn-secondary px-3 flex items-center gap-1 text-sm">
            <Plus size={14} /> Add
          </button>
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

      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input name="isActive" type="checkbox" className="w-4 h-4 accent-[var(--navy)]" defaultChecked={defaultValues?.isActive !== false} />
        <span className="text-sm font-medium text-[var(--navy)]">Show in public catalog (active)</span>
      </label>

      {/* Images */}
      <MediaUploader
        mediaType="item"
        mediaId={itemId}
        images={images}
        onImagesChange={setImages}
        max={4}
        label="Item Images"
        showMain
      />

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-gold flex-1" style={{ paddingBlock: 10 }}>
          {loading ? (itemId ? "Updating…" : "Saving…") : (itemId ? "Update Item" : "Save Item")}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary px-6">
          Cancel
        </button>
      </div>
    </form>
  );
}
