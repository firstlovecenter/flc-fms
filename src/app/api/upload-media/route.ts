import { getSession } from "@/lib/auth/session";
import { getSanityWriteClient, isSanityWriteEnabled } from "@/lib/sanity/server-client";
import { NextRequest, NextResponse } from "next/server";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_FILE_TYPES = ["application/pdf"];

type MediaType = "facility" | "staff" | "receipt" | "item" | "bundle" | "inventory";

const ALLOWED_MEDIA_TYPES: MediaType[] = [
  "facility",
  "staff",
  "receipt",
  "item",
  "bundle",
  "inventory",
];

function getAllowedTypes(mediaType: MediaType): string[] {
  switch (mediaType) {
    case "receipt":
      return [...ALLOWED_IMAGE_TYPES, ...ALLOWED_FILE_TYPES];
    default:
      return ALLOWED_IMAGE_TYPES;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSanityWriteEnabled()) {
      return NextResponse.json(
        { error: "Sanity media service is not configured" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mediaType = (formData.get("mediaType") as string) || "facility";
    const mediaId = formData.get("mediaId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_MEDIA_TYPES.includes(mediaType as MediaType)) {
      return NextResponse.json(
        { error: `Invalid media type. Allowed: ${ALLOWED_MEDIA_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const allowedTypes = getAllowedTypes(mediaType as MediaType);
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type for ${mediaType}. Allowed: ${allowedTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const maxSize = file.type.startsWith("application/") ? MAX_FILE_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const client = getSanityWriteClient();
    if (!client) {
      return NextResponse.json(
        { error: "Sanity media service is not configured" },
        { status: 500 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine asset type based on file
    const assetType = file.type.startsWith("application/") ? "file" : "image";

    const asset = await client.assets.upload(assetType, buffer, {
      filename: file.name,
      contentType: file.type,
      label: mediaType,
      title: file.name,
      source: {
        name: "flc-fms",
        id: `${mediaType}-${mediaId || session.sub}`,
      },
    });

    return NextResponse.json({
      success: true,
      url: asset.url,
      assetId: asset._id,
      originalFilename: asset.originalFilename,
      mediaType,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: String(error) },
      { status: 500 }
    );
  }
}
