import { requireStaff } from "@/lib/auth/guards";
import FacilityForm from "@/components/facilities/FacilityForm";

export default async function NewFacilityPage() {
  await requireStaff("FACILITY_MANAGER");
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Add Facility</h1>
        <p className="text-sm page-subtitle">Create a new bookable facility for this campus.</p>
      </div>
      <FacilityForm />
    </div>
  );
}
