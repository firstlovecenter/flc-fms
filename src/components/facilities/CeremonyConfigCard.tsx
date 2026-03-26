"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertCeremonyVenueConfig } from "@/actions/ceremony-venue.actions";
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

  const [imagesRaw, setImagesRaw] = useState(
    config?.images.join("\n") ?? ""
  );
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
    const images = imagesRaw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
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
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-[var(--muted)]">Price:</span>{" "}
            <strong>GH₵ {Number(config.price).toFixed(2)}</strong>
          </p>
          <p>
            <span className="text-[var(--muted)]">Images:</span>{" "}
            {config.images.length} url(s)
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
          <div>
            <label className="label text-xs">
              Image URLs (one per line)
            </label>
            <textarea
              value={imagesRaw}
              onChange={(e) => setImagesRaw(e.target.value)}
              className="input text-xs"
              rows={4}
              placeholder="https://example.com/image1.jpg"
            />
          </div>

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
