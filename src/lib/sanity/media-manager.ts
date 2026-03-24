import "server-only";

import { getSanityWriteClient, isSanityWriteEnabled } from "./server-client";

export type MediaUploadResult = {
  success: boolean;
  assetId?: string;
  assetUrl?: string;
  error?: string;
};

/**
 * Creates or updates a staff profile document in Sanity
 */
export async function upsertStaffProfile(
  userId: string,
  profilePictureUrl: string,
  staffName: string
): Promise<MediaUploadResult> {
  if (!isSanityWriteEnabled()) {
    return { success: false, error: "Sanity not configured" };
  }

  try {
    const client = getSanityWriteClient();
    if (!client) return { success: false, error: "Sanity client unavailable" };

    const result = await client.createOrReplace({
      _type: "staffProfile",
      _id: `staff-${userId}`,
      userId,
      name: staffName,
      profilePicture: {
        _type: "image",
        asset: {
          _ref: profilePictureUrl.split("/").pop()?.split(".")[0] || "",
        },
      },
      uploadedAt: new Date().toISOString(),
    });

    return {
      success: true,
      assetId: result._id,
      assetUrl: profilePictureUrl,
    };
  } catch (error) {
    console.error("Error creating staff profile:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Creates or updates facility media document in Sanity
 */
export async function upsertFacilityMedia(
  facilityId: string,
  facilityName: string,
  imageUrls: string[]
): Promise<MediaUploadResult> {
  if (!isSanityWriteEnabled()) {
    return { success: false, error: "Sanity not configured" };
  }

  try {
    const client = getSanityWriteClient();
    if (!client) return { success: false, error: "Sanity client unavailable" };

    const images = imageUrls.map((url) => ({
      _type: "image",
      asset: {
        _ref: url.split("/").pop()?.split(".")[0] || "",
      },
    }));

    const result = await client.createOrReplace({
      _type: "facilityMedia",
      _id: `facility-${facilityId}`,
      facilityId,
      facilityName,
      images,
      uploadedAt: new Date().toISOString(),
    });

    return {
      success: true,
      assetId: result._id,
    };
  } catch (error) {
    console.error("Error upserting facility media:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Creates or updates bookable item media document in Sanity
 */
export async function upsertBookableItemMedia(
  itemId: string,
  itemName: string,
  imageUrls: string[]
): Promise<MediaUploadResult> {
  if (!isSanityWriteEnabled()) {
    return { success: false, error: "Sanity not configured" };
  }

  try {
    const client = getSanityWriteClient();
    if (!client) return { success: false, error: "Sanity client unavailable" };

    const images = imageUrls.map((url) => ({
      _type: "image",
      asset: {
        _ref: url.split("/").pop()?.split(".")[0] || "",
      },
    }));

    const result = await client.createOrReplace({
      _type: "bookableItemMedia",
      _id: `item-${itemId}`,
      itemId,
      itemName,
      images,
      uploadedAt: new Date().toISOString(),
    });

    return {
      success: true,
      assetId: result._id,
    };
  } catch (error) {
    console.error("Error upserting bookable item media:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Creates or updates bookable bundle media document in Sanity
 */
export async function upsertBookableBundleMedia(
  bundleId: string,
  bundleName: string,
  imageUrls: string[]
): Promise<MediaUploadResult> {
  if (!isSanityWriteEnabled()) {
    return { success: false, error: "Sanity not configured" };
  }

  try {
    const client = getSanityWriteClient();
    if (!client) return { success: false, error: "Sanity client unavailable" };

    const images = imageUrls.map((url) => ({
      _type: "image",
      asset: {
        _ref: url.split("/").pop()?.split(".")[0] || "",
      },
    }));

    const result = await client.createOrReplace({
      _type: "bookableBundleMedia",
      _id: `bundle-${bundleId}`,
      bundleId,
      bundleName,
      images,
      uploadedAt: new Date().toISOString(),
    });

    return {
      success: true,
      assetId: result._id,
    };
  } catch (error) {
    console.error("Error upserting bookable bundle media:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Creates or updates inventory item media document in Sanity
 */
export async function upsertInventoryItemMedia(
  itemId: string,
  itemName: string,
  imageUrls: string[]
): Promise<MediaUploadResult> {
  if (!isSanityWriteEnabled()) {
    return { success: false, error: "Sanity not configured" };
  }

  try {
    const client = getSanityWriteClient();
    if (!client) return { success: false, error: "Sanity client unavailable" };

    const images = imageUrls.map((url) => ({
      _type: "image",
      asset: {
        _ref: url.split("/").pop()?.split(".")[0] || "",
      },
    }));

    const result = await client.createOrReplace({
      _type: "inventoryItemMedia",
      _id: `inventory-${itemId}`,
      itemId,
      itemName,
      images,
      uploadedAt: new Date().toISOString(),
    });

    return {
      success: true,
      assetId: result._id,
    };
  } catch (error) {
    console.error("Error upserting inventory item media:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Creates or updates inventory category icon document in Sanity
 */
export async function upsertInventoryCategoryIcon(
  categoryId: string,
  categoryName: string,
  iconUrl: string
): Promise<MediaUploadResult> {
  if (!isSanityWriteEnabled()) {
    return { success: false, error: "Sanity not configured" };
  }

  try {
    const client = getSanityWriteClient();
    if (!client) return { success: false, error: "Sanity client unavailable" };

    const result = await client.createOrReplace({
      _type: "inventoryCategoryIcon",
      _id: `category-icon-${categoryId}`,
      categoryId,
      categoryName,
      icon: {
        _type: "image",
        asset: {
          _ref: iconUrl.split("/").pop()?.split(".")[0] || "",
        },
      },
      uploadedAt: new Date().toISOString(),
    });

    return {
      success: true,
      assetId: result._id,
      assetUrl: iconUrl,
    };
  } catch (error) {
    console.error("Error upserting inventory category icon:", error);
    return { success: false, error: String(error) };
  }
}
