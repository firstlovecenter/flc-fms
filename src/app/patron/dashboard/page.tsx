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
			<div className="absolute -top-20 -right-16 w-96 h-96 rounded-full pointer-events-none"
				style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)", zIndex: 0 }}
			/>

			{/* Hero header */}
			<div className="card relative overflow-hidden z-10"
				style={{
					padding: "28px 28px",
					background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
					borderColor: "rgba(200,163,90,0.3)",
					boxShadow: "0 8px 32px rgba(10,22,40,0.12)",
				}}
			>
				<div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,163,90,0.5), transparent)" }} />
				<div className="flex items-start justify-between gap-4 flex-wrap">
					<div>
						<p className="text-[0.68rem] uppercase tracking-[0.08em] font-bold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
							Welcome back
						</p>
						<h1 className="font-bold leading-[1.1] mb-1.5 text-white" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
							{session.name.split(" ")[0]}&apos;s Bookings
						</h1>
						<p className="text-[0.95rem]" style={{ color: "rgba(255,255,255,0.7)" }}>
							Manage your facility reservations and browse available venues
						</p>
					</div>
					<Link href="/patron/book"
						className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex-shrink-0 mt-1"
						style={{ background: "var(--gold)", color: "var(--navy)", boxShadow: "0 2px 8px rgba(200,163,90,0.3)" }}
					>
						<Plus size={15} /> Book Facility
					</Link>
				</div>
			</div>

			{/* Stats */}
			<div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Link href="/patron/bookings"
					className="card flex items-center gap-4 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
					style={{ background: "linear-gradient(135deg, rgba(200,163,90,0.08) 0%, rgba(200,163,90,0.02) 100%)", borderColor: "rgba(200,163,90,0.2)", textDecoration: "none" }}
				>
					<div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(200,163,90,0.15)", border: "1px solid rgba(200,163,90,0.2)" }}>
						<CalendarDays size={18} style={{ color: "var(--gold)" }} />
					</div>
					<div>
						<p className="text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-[var(--muted)] mb-0.5">My Bookings</p>
						<p className="text-2xl font-bold leading-none" style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>{bookings.length}</p>
					</div>
				</Link>

				<Link href="/patron/bookings?status=APPROVED"
					className="card flex items-center gap-4 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
					style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%)", borderColor: "rgba(34,197,94,0.2)", textDecoration: "none" }}
				>
					<div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.18)" }}>
						<CheckCircle2 size={18} className="text-emerald-600" />
					</div>
					<div>
						<p className="text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-[var(--muted)] mb-0.5">Approved</p>
						<p className="text-2xl font-bold leading-none text-emerald-600" style={{ fontFamily: "var(--font-display)" }}>{approved}</p>
					</div>
				</Link>

				<Link href="/patron/bookings?status=PENDING"
					className="card flex items-center gap-4 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
					style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)", borderColor: "rgba(245,158,11,0.2)", textDecoration: "none" }}
				>
					<div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.18)" }}>
						<Clock size={18} className="text-amber-600" />
					</div>
					<div>
						<p className="text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-[var(--muted)] mb-0.5">Pending</p>
						<p className="text-2xl font-bold leading-none text-amber-600" style={{ fontFamily: "var(--font-display)" }}>{pending}</p>
					</div>
				</Link>
			</div>

			{/* Latest Bookings */}
			<div className="relative z-10">
				<div className="flex items-end justify-between mb-4">
					<div>
						<p className="text-[0.68rem] uppercase tracking-[0.08em] font-bold text-[var(--muted)] mb-1">Recently Booked</p>
						<h2 className="text-[1.4rem] font-bold text-[var(--navy)] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
							Your Bookings
						</h2>
					</div>
					<Link href="/patron/bookings" className="text-[0.88rem] font-semibold text-[var(--gold)] hover:text-[var(--gold-bright)] transition-colors flex items-center gap-1">
						View All <ArrowRight size={14} />
					</Link>
				</div>

				<div className="card overflow-hidden" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #FEFDFB 100%)", boxShadow: "0 2px 8px rgba(10,22,40,0.04)" }}>
					{bookings.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-4 py-14 px-6 text-center">
							<div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--cream-dark)", border: "1px solid var(--border)" }}>
								<CalendarDays size={24} className="text-[var(--muted)]" />
							</div>
							<div>
								<p className="font-semibold text-[var(--navy)] mb-1">No bookings yet</p>
								<p className="text-sm text-[var(--muted)]">Book a facility to get started</p>
							</div>
							<Link href="/patron/book" className="btn-primary mt-1">Start Booking Now</Link>
						</div>
					) : (
						<div className="overflow-x-auto">
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
											<td className="font-medium text-[var(--navy)]">{b.facility?.name ?? "N/A"}</td>
											<td className="text-[var(--slate)]">{b.title}</td>
											<td className="text-sm font-medium text-[var(--navy)]">{formatDateTime(b.startTime)}</td>
											<td>
												<StatusBadge status={b.status} size="xs" />
											</td>
											<td>
												<Link href={`/patron/bookings/${b.id}`} className="btn-secondary" style={{ padding: "5px 12px", fontSize: "0.75rem" }}>
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
			<div className="card relative overflow-hidden z-10 text-center"
				style={{
					padding: "28px 24px",
					background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
					borderColor: "rgba(200,163,90,0.3)",
				}}
			>
				<div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,163,90,0.4), transparent)" }} />
				<p className="font-bold text-[1.1rem] text-white mb-1" style={{ fontFamily: "var(--font-display)" }}>
					{facilitiesOpen} venue{facilitiesOpen !== 1 ? "s" : ""} available
				</p>
				<p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.65)" }}>Browse and reserve your preferred space</p>
				<Link href="/patron/book"
					className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
					style={{ background: "var(--gold)", color: "var(--navy)", boxShadow: "0 2px 12px rgba(200,163,90,0.3)" }}
				>
					Browse & Book Now <ArrowRight size={15} />
				</Link>
			</div>
		</div>
	);
}
