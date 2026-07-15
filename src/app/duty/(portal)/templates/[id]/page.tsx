import { redirect } from "next/navigation";

/** Duty form detail URLs open the editor directly. */
export default async function DutyTemplateDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  redirect(`/duty/templates/${params.id}/edit`);
}
