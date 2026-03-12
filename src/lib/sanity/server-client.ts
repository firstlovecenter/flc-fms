import "server-only";

import { createClient } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const apiToken = process.env.SANITY_API_TOKEN;

export function getSanityWriteClient() {
  if (!projectId || !dataset || !apiToken) return null;

  return createClient({
    projectId,
    dataset,
    apiVersion: "2025-01-01",
    useCdn: false,
    token: apiToken,
  });
}

export function isSanityWriteEnabled() {
  return Boolean(projectId && dataset && apiToken);
}
