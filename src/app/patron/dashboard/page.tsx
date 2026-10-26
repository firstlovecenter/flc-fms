import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { cn, formatDateTime } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import PageHeader from "@/components/layout/PageHeader";
import SectionHeader from "@/components/layout/SectionHeader";
import { CalendarDays, CheckCircle2, Clock, Plus, ArrowRight, Building2 } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/empty";
import PatronBookingList from "@/components/patron/PatronBookingList";

export default async function PatronDashboardPage() {
	const session = await getSession();
	if (!session || session.role !== "PATRON") redirect("/patron/login");

	// userId: null excludes staff-created bookings merely linked to this
	// patron for notifications — only self-made bookings show here.
	const mine = { patronId: session.sub, userId: null, deletedAt: null };

	const [bookings, statusCounts, nextBooking, facilitiesOpen] = await Promise.all([
		prisma.booking.findMany({
			where: mine,
			include: { facility: { select: { name: true } } },
			orderBy: { createdAt: "desc" },
			take: 5,
		}),
		prisma.booking.groupBy({ by: ["status"], where: mine, _count: { _all: true } }),
		prisma.booking.findFirst({
			where: { ...mine, status: "APPROVED", startTime: { gte: new Date() } },
			include: { facility: { select: { name: true } } },
			orderBy: { startTime: "asc" },
		}),
		prisma.facility.count({ where: { isActive: true, underMaintenance: false } }),
	]);

	const countOf = (s: string) => statusCounts.find((c) => c.status === s)?._count._all ?? 0;
	const total = statusCounts.reduce((n, c) => n + c._count._all, 0);

	return (
		<div className="space-y-6 animate-fade-in">
			<PageHeader
				eyebrow={greeting()}
				title={`Welcome back, ${session.name.split(" ")[0]}`}
				description="Your facility bookings at First Love Center, and what's coming up next."
				actions={
					<Link href="/patron/book" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
						<Plus size={15} aria-hidden /> Book a facility
					</Link>
				}
				className="mb-0"
			/>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard
					hero
					label="Next booking"
					value={nextBooking ? formatDateTime(nextBooking.startTime) : "None yet"}
					icon={<CalendarDays size={16} />}
					sub={nextBooking ? nextBooking.facility?.name ?? nextBooking.title : "Approved bookings show here"}
					href={nextBooking ? `/patron/bookings/${nextBooking.id}` : "/patron/book"}
				/>
				<StatCard label="All bookings" value={total} color="neutral" href="/patron/bookings" icon={<CalendarDays size={16} />} sub="Everything you've booked" />
				<StatCard label="Approved" value={countOf("APPROVED")} color="finance" href="/patron/bookings?status=APPROVED" icon={<CheckCircle2 size={16} />} sub="Confirmed by the office" />
				<StatCard label="Pending" value={countOf("PENDING")} color="warning" href="/patron/bookings?status=PENDING" icon={<Clock size={16} />} sub="Waiting for approval" trend={countOf("PENDING") > 0 ? "down" : undefined} />
			</div>

			<section>
				<SectionHeader
					title="Recent bookings"
					description="Your five most recent requests."
					actions={
						<Link href="/patron/bookings" className="link-gold inline-flex items-center gap-1 text-[0.88rem]">
							View all <ArrowRight size={14} />
						</Link>
					}
				/>
				{bookings.length === 0 ? (
					<EmptyState
						icon={<CalendarDays />}
						title="No bookings yet"
						description="When you book a facility, it appears here with its status."
						action={
							<Link href="/patron/book" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
								<Plus size={15} /> Book a facility
							</Link>
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
			</section>

			<div className="flex flex-col items-start justify-between gap-4 rounded-[1.25rem] border border-border/70 bg-card p-5 shadow-[var(--shadow-xs)] sm:flex-row sm:items-center sm:p-6">
				<div className="flex items-center gap-3">
					<span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/80 text-facilities">
						<Building2 size={18} />
					</span>
					<div>
						<p className="font-medium text-[var(--navy)]">
							{facilitiesOpen} venue{facilitiesOpen !== 1 ? "s" : ""} open for booking
						</p>
						<p className="text-sm text-[var(--muted)]">Pick a space, a date and a time slot.</p>
					</div>
				</div>
				<Link href="/patron/book" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
					Browse venues <ArrowRight size={15} />
				</Link>
			</div>
		</div>
	);
}

function greeting() {
	const hour = Number(
		new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Accra" }).format(new Date()),
	);
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
}
