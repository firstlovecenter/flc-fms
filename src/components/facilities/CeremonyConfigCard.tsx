"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { upsertCeremonyVenueConfig } from "@/actions/ceremony-venue.actions";
import MediaUploader from "@/components/ui/MediaUploader";
import type { CeremonyVenueConfig } from "@prisma/client";

type Props = {
  facilityId: string;
  type: "WEDDING" | "NAMING";
  config: CeremonyVenueConfig | null;
};

export default function CeremonyConfigCard({ facilityId, type, config }: Props) {
  const router = useRouter();
  const label = type === "WEDDING" ? "Wedding" : "Naming Ceremony";

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [images, setImages] = useState<string[]>(config?.images ?? []);
  const [price, setPrice] = useState(
    config ? String(Number(config.price)) : ""
  );
  const [description, setDescription] = useState(config?.description ?? "");
  const [sortOrder, setSortOrder] = useState(
    config ? String(config.sortOrder) : "0"
  );
  const [isActive, setIsActive] = useState(config?.isActive ?? true);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const result = await upsertCeremonyVenueConfig(facilityId, type, {
        images,
        price: Number(price),
        description: description.trim() || undefined,
        isActive,
        sortOrder: Number(sortOrder) || 0,
      });
      if ("error" in result) {
        setError(result.error as string);
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--navy)]">{label} Config</h3>
          {!config && (
            <p className="text-xs text-[var(--muted)]">Not configured yet</p>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-[var(--gold)] hover:underline"
          >
            {config ? "Edit" : "Set up"}
          </button>
        )}
      </div>

      {!editing && config && (
        <div className="space-y-2 text-sm">
          {config.images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {config.images.slice(0, 4).map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--border)]">
                  <Image src={url} alt={`${label} image ${i + 1}`} fill className="object-cover" unoptimized />
                </div>
              ))}
              {config.images.length > 4 && (
                <div className="w-16 h-16 rounded-lg border border-[var(--border)] bg-gray-50 flex items-center justify-center text-xs text-[var(--muted)]">
                  +{config.images.length - 4}
                </div>
              )}
            </div>
          )}
          <p>
            <span className="text-[var(--muted)]">Price:</span>{" "}
            <strong>GH₵ {Number(config.price).toFixed(2)}</strong>
          </p>
          <p>
            <span className="text-[var(--muted)]">Images:</span>{" "}
            {config.images.length} uploaded
          </p>
          {config.description && (
            <p className="text-[var(--slate)] text-xs">{config.description}</p>
          )}
          <p>
            <span
              className={`text-xs font-semibold ${config.isActive ? "text-green-700" : "text-red-600"}`}
            >
              {config.isActive ? "Active" : "Inactive"}
            </span>
          </p>
        </div>
      )}

      {editing && (
        <div className="space-y-3">
          <MediaUploader
            mediaType="facility"
            mediaId={`ceremony-${type.toLowerCase()}-${facilityId}`}
            images={images}
            onImagesChange={setImages}
            max={6}
            showMain={true}
            label={`${label} Images`}
          />

          <div>
            <label className="label text-xs">Flat Price (GH₵) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input text-xs"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="label text-xs">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input text-xs"
              rows={2}
              placeholder="Brief description for the catalogue"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="label text-xs">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input text-xs"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer mt-5">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded"
              />
              Active
            </label>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-[var(--muted)] hover:text-[var(--navy)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
