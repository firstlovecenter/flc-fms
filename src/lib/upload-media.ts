export type MediaType =
  | "facility"
  | "staff"
  | "receipt"
  | "item"
  | "bundle"
  | "inventory";

export type UploadResult = {
  url: string;
  assetId: string;
  originalFilename: string;
  mediaType: MediaType;
  uploadedAt: string;
};

/**
 * Client-side helper that posts a file to /api/upload-media and returns
 * the Sanity CDN URL + asset metadata.
 */
export async function uploadMedia(
  file: File,
  mediaType: MediaType,
  mediaId?: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mediaType", mediaType);
  if (mediaId) formData.append("mediaId", mediaId);

  const response = await fetch("/api/upload-media", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error ?? "Upload failed");
  }

  return response.json() as Promise<UploadResult>;
}
