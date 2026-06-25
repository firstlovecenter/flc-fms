import { redirect } from "next/navigation";

// Ceremony catalogs are now a filter on the main catalog.
export default function NamingCatalogRedirect() {
  redirect("/?vtype=naming");
}
