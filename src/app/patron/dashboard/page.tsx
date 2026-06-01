import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CalendarDays, CheckCircle2, Clock, Plus, ArrowRight } from "lucide-react";

export default async function PatronDashboardPage() {
	const session = await getSession();
	if (!session || session.role !== "PATRON") redirect("/patron/login");

	const [bookings, facilitiesOpen] = await Promise.all([
		prisma.booking.findMany({
			where: { patronId: session.sub },
			include: { facility: { select: { name: true } } },
			orderBy: { createdAt: "desc" },
			take: 5,
		}),
		prisma.facility.count({ where: { isActive: true, underMaintenance: false } }),
	]);

	const pending = bookings.filter((b) => b.status === "PENDING").length;
	const approved = bookings.filter((b) => b.status === "APPROVED").length;

	return (
		<div className="space-y-8 animate-fade-in relative">
			{/* Ambient glow */}
			<div className="absolute -top-20 -right-16 w-96 h-96 rounded-full pointer-events-none z-0"
				style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)" }}
			/>

			{/* Hero header */}
			<div className="page-hero flex items-start justify-between gap-4 flex-wrap relative z-10">
				<div>
					<p className="section-eyebrow mb-3">Welcome back</p>
					<h1 className="page-title text-[clamp(1.75rem,3vw,2.5rem)] mb-1.5">
						{session.name.split(" ")[0]}&apos;s Bookings
					</h1>
					<p className="page-hero-muted text-[0.95rem]">
						Manage your facility reservations and browse available venues
					</p>
				</div>
				<Link href="/patron/book" className="btn-gold inline-flex items-center gap-2 flex-shrink-0 mt-1">
					<Plus size={15} /> Book Facility
				</Link>
			</div>

			{/* Stats */}
			<div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
				<Link href="/patron/bookings"
					className="stat-card flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 no-underline"
					data-accent="gold"
				>
					<div className="stat-accent" />
					<div className="w-10 h-10 rounded-xl bg-[rgba(200,163,90,0.15)] border border-[rgba(200,163,90,0.2)] flex items-center justify-center flex-shrink-0">
						<CalendarDays size={18} className="text-[var(--gold)]" />
					</div>
					<div>
						<p className="stat-label mb-0.5">My Bookings</p>
						<p className="stat-value text-2xl">{bookings.length}</p>
					</div>
				</Link>

				<Link href="/patron/bookings?status=APPROVED"
					className="stat-card flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 no-underline"
					data-accent="green"
				>
					<div className="stat-accent" />
					<div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center flex-shrink-0">
						<CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
					</div>
					<div>
						<p className="stat-label mb-0.5">Approved</p>
						<p className="stat-value text-2xl text-emerald-600 dark:text-emerald-400">{approved}</p>
					</div>
				</Link>

				<Link href="/patron/bookings?status=PENDING"
					className="stat-card flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 no-underline"
					data-accent="yellow"
				>
					<div className="stat-accent" />
					<div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-center flex-shrink-0">
						<Clock size={18} className="text-amber-600 dark:text-amber-400" />
					</div>
					<div>
						<p className="stat-label mb-0.5">Pending</p>
						<p className="stat-value text-2xl text-amber-600 dark:text-amber-400">{pending}</p>
					</div>
				</Link>
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

				<div className="card overflow-hidden">
					{bookings.length === 0 ? (
						<div className="empty-state py-14">
							<div className="w-14 h-14 rounded-2xl bg-[var(--cream-dark)] dark:bg-[rgba(255,255,255,0.05)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
								<CalendarDays size={24} className="text-[var(--text-muted)]" />
							</div>
							<p className="font-semibold text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)] mb-1">No bookings yet</p>
							<p className="text-sm text-[var(--text-muted)]">Book a facility to get started</p>
							<Link href="/patron/book" className="btn-primary mt-4 inline-flex">Start Booking Now</Link>
						</div>
					) : (
						<div className="table-scroll-wrapper">
							<table className="data-table">
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
												<Link href={`/patron/bookings/${b.id}`} className="btn-secondary text-xs py-1 px-3">
													View
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>

			{/* CTA banner */}
			<div className="page-hero text-center relative z-10">
				<p className="font-bold text-[1.1rem] text-white mb-1" style={{ fontFamily: "var(--font-display)" }}>
					{facilitiesOpen} venue{facilitiesOpen !== 1 ? "s" : ""} available
				</p>
				<p className="text-sm mb-5 text-[rgba(255,255,255,0.65)]">Browse and reserve your preferred space</p>
				<Link href="/patron/book" className="btn-gold inline-flex items-center gap-2">
					Browse & Book Now <ArrowRight size={15} />
				</Link>
			</div>
		</div>
	);
}
