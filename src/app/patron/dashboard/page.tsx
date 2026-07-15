import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { cn, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { buttonVariants } from "@/components/ui/button-variants";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable } from "@/components/layout/DataTable";
import { CalendarDays, CheckCircle2, Clock, Plus, ArrowRight } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { Card } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/layout/DataTable";

export default async function PatronDashboardPage() {
	const session = await getSession();
	if (!session || session.role !== "PATRON") redirect("/patron/login");

	const [bookings, facilitiesOpen] = await Promise.all([
		prisma.booking.findMany({
			// userId: null excludes staff-created bookings merely linked to this
			// patron for notifications — only self-made bookings show here.
			where: { patronId: session.sub, userId: null },
			include: { facility: { select: { name: true } } },
			orderBy: { createdAt: "desc" },
			take: 5,
		}),
		prisma.facility.count({ where: { isActive: true, underMaintenance: false } }),
	]);

	const pending = bookings.filter((b) => b.status === "PENDING").length;
	const approved = bookings.filter((b) => b.status === "APPROVED").length;

	return (
		<div className="space-y-5 sm:space-y-7 animate-fade-in relative overflow-x-clip">
			{/* Ambient glow */}
			<div className="absolute -top-20 right-0 w-96 h-96 rounded-full pointer-events-none z-0"
				style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)" }}
			/>

			<PageHeader
				variant="hero"
				eyebrow="Welcome back"
				title={`${session.name.split(" ")[0]}'s Bookings`}
				description="Manage your facility reservations and browse available venues"
				actions={
					<Link href="/patron/book" className={cn(buttonVariants({ variant: "gold" }), "gap-2 flex-shrink-0")}>
						<Plus size={15} aria-hidden /> Book Facility
					</Link>
				}
				className="relative z-10"
			/>

			<div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 stagger-children">
				<StatCard
					label="Bookings"
					value={bookings.length}
					color="gold"
					href="/patron/bookings"
					compact
					icon={<CalendarDays size={16} />}
				/>
				<StatCard
					label="Approved"
					value={approved}
					color="finance"
					href="/patron/bookings?status=APPROVED"
					compact
					icon={<CheckCircle2 size={16} />}
				/>
				<StatCard
					label="Pending"
					value={pending}
					color="warning"
					href="/patron/bookings?status=PENDING"
					compact
					icon={<Clock size={16} />}
				/>
			</div>

			{/* Latest Bookings */}
			<div className="relative z-10">
				<div className="flex items-end justify-between mb-4">
					<div>
						<p className="section-eyebrow mb-1">Recently Booked</p>
						<h2 className="text-[1.4rem] font-bold text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
							Your Bookings
						</h2>
					</div>
					<Link href="/patron/bookings" className="link-gold text-[0.88rem] font-semibold inline-flex items-center gap-1">
						View All <ArrowRight size={14} />
					</Link>
				</div>

				<Card className="overflow-hidden py-0">
					{bookings.length === 0 ? (
						<DataTableEmpty>
							<div className="w-14 h-14 rounded-2xl bg-cream-dark dark:bg-[rgba(255,255,255,0.05)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
								<CalendarDays size={24} className="text-muted-foreground" />
							</div>
							<p className="font-semibold text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)] mb-1">No bookings yet</p>
							<p className="text-sm text-muted-foreground">Book a facility to get started</p>
							<Link href="/patron/book" className={cn(buttonVariants({ variant: "default" }), "mt-4")}>Start Booking Now</Link>
						</DataTableEmpty>
					) : (
						<DataTable>
								<thead>
									<tr>
										<th>Facility</th>
										<th>Title</th>
										<th>Date & Time</th>
										<th>Status</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{bookings.map((b) => (
										<tr key={b.id}>
											<td className="font-medium text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)]">{b.facility?.name ?? "N/A"}</td>
											<td className="text-[var(--slate)]">{b.title}</td>
											<td className="text-sm font-medium text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)]">{formatDateTime(b.startTime)}</td>
											<td>
												<StatusBadge status={b.status} size="xs" />
											</td>
											<td>
												<Link href={`/patron/bookings/${b.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
													View
												</Link>
											</td>
										</tr>
									))}
								</tbody>
						</DataTable>
					)}
				</Card>
			</div>

			<PageHeader
				variant="hero"
				className="relative z-10 text-center [&>div]:items-center [&>div]:text-center"
				title={`${facilitiesOpen} venue${facilitiesOpen !== 1 ? "s" : ""} available`}
				description="Browse and reserve your preferred space"
				actions={
					<Link href="/patron/book" className={cn(buttonVariants({ variant: "gold" }), "gap-2")}>
						Browse & Book Now <ArrowRight size={15} />
					</Link>
				}
			/>
		</div>
	);
}
