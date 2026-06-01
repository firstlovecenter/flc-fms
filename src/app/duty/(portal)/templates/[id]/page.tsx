import { redirect } from "next/navigation";

/** Duty form detail URLs open the editor directly. */
export default function DutyTemplateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/duty/templates/${params.id}/edit`);
}
