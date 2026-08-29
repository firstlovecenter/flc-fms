import PublicShell from "@/components/public/PublicShell";
import GuestPageHero from "@/components/public/GuestPageHero";
import FeedbackForm from "@/components/public/FeedbackForm";
import FeedbackStaffList from "@/components/feedback/FeedbackStaffList";
import StaffLayout from "@/components/layout/StaffLayout";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { getStaffAuthContext, ctxHasPermission } from "@/lib/permissions/session";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Feedback — FLC FMS",
  description: "Submit complaints, feedback, or suggestions about our facilities",
};

export default async function FeedbackPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getSession();

  if (session && session.role !== "PATRON") {
    const ctx =
      session.role === "SUPER_ADMIN" ? null : await getStaffAuthContext(session.sub);
    const canView =
      session.role === "SUPER_ADMIN" ||
      (ctx ? ctxHasPermission(ctx, "feedback:view") : false);

    if (canView) {
      const canManage =
        session.role === "SUPER_ADMIN" ||
        (ctx ? ctxHasPermission(ctx, "feedback:manage") : false);

      return (
        <StaffLayout>
          <FeedbackStaffList searchParams={searchParams} canManage={canManage} />
        </StaffLayout>
      );
    }
  }

  const facilities = await prisma.facility.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <PublicShell layout="top" current="feedback" maxWidth="md">
      <div className="space-y-6">
        <GuestPageHero
          eyebrow="We Value Your Voice"
          title="Complaints & Feedback"
          description="Share a complaint, feedback, or suggestion about our facilities. You can choose to remain anonymous or leave contact details if you'd like us to follow up."
        />
        <Card className="p-6 md:p-8">
          <FeedbackForm facilities={facilities} />
        </Card>
      </div>
    </PublicShell>
  );
}
