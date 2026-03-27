import { getSanityWriteClient, isSanityWriteEnabled } from "@/lib/sanity/server-client";
import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(req: NextRequest) {
  try {
    if (!isSanityWriteEnabled()) {
      return NextResponse.json({ error: "Media service is not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, PDF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Max size: 5MB" }, { status: 400 });
    }

    const client = getSanityWriteClient();
    if (!client) {
      return NextResponse.json({ error: "Media service is not configured" }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const assetType = file.type === "application/pdf" ? "file" : "image";

    const asset = await client.assets.upload(assetType, buffer, {
      filename: file.name,
      contentType: file.type,
      label: "ceremony-receipt",
      title: file.name,
      source: { name: "flc-fms", id: "ceremony-receipt" },
    });

    return NextResponse.json({ success: true, url: asset.url });
  } catch (error) {
    console.error("Receipt upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
