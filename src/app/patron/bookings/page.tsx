import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import PageHeader from "@/components/layout/PageHeader";
import { FilterPills } from "@/components/layout/ListControls";
import { EmptyState } from "@/components/ui/empty";
import PatronBookingList from "@/components/patron/PatronBookingList";

const STATUSES = ["ALL", "PENDING", "APPROVED", "COMPLETED", "REJECTED", "CANCELLED"] as const;
type StatusFilter = (typeof STATUSES)[number];
const STATUS_LABELS: Record<StatusFilter, string> = {
	ALL: "All",
	PENDING: "Pending",
	APPROVED: "Approved",
	COMPLETED: "Completed",
	REJECTED: "Rejected",
	CANCELLED: "Cancelled",
};

export default async function PatronBookingsPage(props: { searchParams: Promise<{ status?: string }> }) {
	const searchParams = await props.searchParams;
	const session = await getSession();
	if (!session || session.role !== "PATRON") redirect("/patron/login");

	const status: StatusFilter = (STATUSES as readonly string[]).includes(searchParams.status ?? "")
		? (searchParams.status as StatusFilter)
		: "ALL";

	// userId: null excludes staff-created bookings merely linked to this
	// patron for notifications — only self-made bookings show here.
	const mine = { patronId: session.sub, userId: null, deletedAt: null };

	const [bookings, statusCounts] = await Promise.all([
		prisma.booking.findMany({
			where: { ...mine, ...(status !== "ALL" ? { status } : {}) },
			include: { facility: { select: { name: true } } },
			orderBy: { startTime: "desc" },
		}),
		prisma.booking.groupBy({ by: ["status"], where: mine, _count: { _all: true } }),
	]);

	const countFor = (s: StatusFilter) =>
		s === "ALL"
			? statusCounts.reduce((n, c) => n + c._count._all, 0)
			: statusCounts.find((c) => c.status === s)?._count._all ?? 0;

	return (
		<div className="space-y-5 animate-fade-in">
			<PageHeader
				title="My bookings"
				description="Every facility you've booked, newest first. Open one to see its details, request check-in or cancel it."
				actions={
					<Link href="/patron/book" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
						<Plus size={15} /> New booking
					</Link>
				}
				className="mb-0"
			/>

			<FilterPills
				label="Status"
				value={status}
				options={STATUSES.map((s) => ({
					value: s,
					label: STATUS_LABELS[s],
					count: countFor(s),
					href: s === "ALL" ? "/patron/bookings" : `/patron/bookings?status=${s}`,
				}))}
			/>

			{bookings.length === 0 ? (
				<EmptyState
					icon={<CalendarDays />}
					title={status === "ALL" ? "No bookings yet" : `No ${STATUS_LABELS[status].toLowerCase()} bookings`}
					description={
						status === "ALL"
							? "When you book a facility, it appears here with its status."
							: "Bookings with this status will appear here."
					}
					action={
						status === "ALL" ? (
							<Link href="/patron/book" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
								<Plus size={15} /> Book a facility
							</Link>
						) : (
							<Link href="/patron/bookings" className={cn(buttonVariants({ variant: "outline" }))}>
								Show all bookings
							</Link>
						)
					}
				/>
			) : (
				<PatronBookingList
					bookings={bookings.map((b) => ({
						id: b.id,
						title: b.title,
						facilityName: b.facility?.name ?? "N/A",
						status: b.status,
						startTime: b.startTime,
						endTime: b.endTime,
						totalAmount: Number(b.totalAmount ?? 0),
					}))}
				/>
			)}
		</div>
	);
}
