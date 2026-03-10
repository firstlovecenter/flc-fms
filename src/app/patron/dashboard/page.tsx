import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { formatDateTime, statusBadgeClass } from "@/lib/utils";

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
		<div className="space-y-8 animate-fade-in" style={{ position: "relative" }}>
			{/* Decorative background */}
			<div style={{
				position: "absolute",
				top: -120,
				right: -60,
				width: 400,
				height: 400,
				borderRadius: "50%",
				background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
				pointerEvents: "none",
				zIndex: 0
			}} />

			{/* Header */}
			<div className="card" style={{
				padding: "32px 28px",
				background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
				borderColor: "rgba(200,163,90,0.3)",
				boxShadow: "0 8px 32px rgba(10,22,40,0.12)",
				position: "relative",
				zIndex: 1
			}}>
				<p style={{ 
					fontSize: "0.7rem", 
					textTransform: "uppercase", 
					letterSpacing: "0.08em", 
					color: "rgba(255,255,255,0.6)", 
					marginBottom: 8,
					fontWeight: 700
				}}>
					Patron Dashboard
				</p>
				<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
					<div style={{ color: "#fff", flex: 1 }}>
						<h1 style={{ 
							fontFamily: "var(--font-display)", 
							fontSize: "clamp(2rem, 3vw, 2.8rem)", 
							fontWeight: 700,
							lineHeight: 1.1,
							marginBottom: 4
						}}>
							My Bookings
						</h1>
						<p style={{ 
							fontSize: "1rem", 
							color: "rgba(255,255,255,0.75)" 
						}}>
							Manage your facility reservations and browse available venues
						</p>
					</div>
					<Link href="/patron/book" className="btn-gold" style={{ flexShrink: 0, marginTop: 8 }}>
						Book Facility
					</Link>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ position: "relative", zIndex: 1 }}>
				<div className="card" style={{
					padding: "20px",
					background: "linear-gradient(135deg, rgba(200,163,90,0.08) 0%, rgba(200,163,90,0.02) 100%)",
					borderColor: "rgba(200,163,90,0.2)"
				}}>
					<p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>My Bookings</p>
					<p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>
						{bookings.length}
					</p>
				</div>
				<div className="card" style={{
					padding: "20px",
					background: "linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.02) 100%)",
					borderColor: "rgba(34,197,94,0.2)"
				}}>
					<p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Approved</p>
					<p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "rgb(34,197,94)", lineHeight: 1 }}>
						{approved}
					</p>
				</div>
				<div className="card" style={{
					padding: "20px",
					background: "linear-gradient(135deg, rgba(250,110,0,0.1) 0%, rgba(250,110,0,0.02) 100%)",
					borderColor: "rgba(250,110,0,0.2)"
				}}>
					<p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Pending</p>
					<p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "rgb(250,110,0)", lineHeight: 1 }}>
						{pending}
					</p>
				</div>
			</div>

			{/* Latest Bookings */}
			<div style={{ position: "relative", zIndex: 1 }}>
				<div style={{ marginBottom: 16 }}>
					<p style={{ 
						fontSize: "0.7rem", 
						textTransform: "uppercase", 
						letterSpacing: "0.08em", 
						color: "var(--muted)",
						fontWeight: 700,
						marginBottom: 4
					}}>
						Recently Booked
					</p>
					<h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--navy)", lineHeight: 1.2 }}>
						Your Bookings
					</h2>
				</div>
				<div className="card overflow-hidden" style={{
					background: "linear-gradient(135deg, #FFFFFF 0%, #FEFDFB 100%)",
					boxShadow: "0 2px 8px rgba(10,22,40,0.04), 0 1px 3px rgba(10,22,40,0.06)"
				}}>
					{bookings.length === 0 ? (
						<div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
							<p style={{ fontSize: "1rem", marginBottom: 16 }}>No bookings yet</p>
							<Link href="/patron/book" className="btn-primary">Start Booking Now</Link>
						</div>
					) : (
						<div style={{ overflowX: "auto" }}>
							<table className="data-table">
								<thead>
									<tr>
										<th>Facility</th>
										<th>Title</th>
										<th>Date & Time</th>
										<th>Status</th>
										<th>Action</th>
									</tr>
								</thead>
								<tbody>
									{bookings.map((b) => (
										<tr key={b.id}>
											<td style={{ fontWeight: 500, color: "var(--navy)" }}>{b.facility?.name ?? "N/A"}</td>
											<td style={{ color: "var(--slate)" }}>{b.title}</td>
											<td style={{ fontSize: "0.85rem", color: "var(--navy)", fontWeight: 500 }}>{formatDateTime(b.startTime)}</td>
											<td>
												<span className={`badge ${statusBadgeClass(b.status)}`}>{b.status}</span>
											</td>
											<td>
												<Link href={`/patron/bookings/${b.id}`} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.75rem" }}>
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

			{/* CTA */}
			<div className="card" style={{
				padding: "24px",
				background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
				borderColor: "rgba(200,163,90,0.3)",
				textAlign: "center",
				position: "relative",
				zIndex: 1
			}}>
				<p style={{ color: "rgba(255,255,255,0.75)", marginBottom: 12 }}>
					{facilitiesOpen} venues available for booking
				</p>
				<Link href="/patron/book" className="btn-gold" style={{ marginTop: 12 }}>
					Browse & Book Now
				</Link>
			</div>
		</div>
	);
}
