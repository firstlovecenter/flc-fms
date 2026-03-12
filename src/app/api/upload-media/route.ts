import { getSession } from "@/lib/auth/session";
import { getSanityWriteClient, isSanityWriteEnabled } from "@/lib/sanity/server-client";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, or WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max size: 5MB" },
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

    const asset = await client.assets.upload("image", buffer, {
      filename: file.name,
      contentType: file.type,
      label: "facility",
      title: file.name,
      source: {
        name: "flc-fms",
        id: `user-${session.sub}`,
      },
    });

    return NextResponse.json({
      success: true,
      url: asset.url,
      assetId: asset._id,
      originalFilename: asset.originalFilename,
    });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: String(error) },
      { status: 500 }
    );
  }
}
