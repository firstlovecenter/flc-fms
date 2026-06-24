"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Star, Loader2 } from "lucide-react";
import { uploadMedia, type MediaType } from "@/lib/upload-media";

interface Props {
  mediaType: MediaType;
  mediaId?: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  max?: number;
  /** Accept attribute for the file input, e.g. "image/*" or "image/*,application/pdf" */
  accept?: string;
  label?: string;
  /** If true the first image is highlighted as "main" image */
  showMain?: boolean;
}

export default function MediaUploader({
  mediaType,
  mediaId,
  images,
  onImagesChange,
  max = 4,
  accept = "image/jpeg,image/png,image/webp",
  label = "Images",
  showMain = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const result = await uploadMedia(file, mediaType, mediaId);
      onImagesChange(
        images.length >= max
          ? [...images.slice(1), result.url]
          : [...images, result.url]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(index: number) {
    onImagesChange(images.filter((_, i) => i !== index));
  }

  function setMain(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    onImagesChange(next);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--slate)]">{label}</label>

      {error && (
        <p className="text-red-500 text-xs">{error}</p>
      )}

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div
              key={url}
              className="relative w-20 h-20 rounded-xl overflow-hidden border-2"
              style={{
                borderColor:
                  showMain && i === 0 ? "var(--gold)" : "var(--border)",
              }}
            >
              <Image
                src={url}
                alt={`Upload ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 flex gap-0.5 p-1 opacity-0 hover:opacity-100 transition-opacity bg-black/40">
                {showMain && i !== 0 && (
                  <button
                    type="button"
                    onClick={() => setMain(i)}
                    title="Set as main"
                    className="text-[#fff] hover:text-yellow-300"
                  >
                    <Star size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="ml-auto text-[#fff] hover:text-red-300"
                  title="Remove"
                >
                  <X size={13} />
                </button>
              </div>
              {showMain && i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-semibold text-[#fff] bg-black/60 py-0.5">
                  MAIN
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < max && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--navy)] hover:text-[var(--navy)] transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {uploading ? "Uploading…" : `Add ${label.toLowerCase()} (${images.length}/${max})`}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
