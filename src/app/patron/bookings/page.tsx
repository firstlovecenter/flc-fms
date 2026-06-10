import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { Card } from "@/components/ui/card";

export default async function PatronBookingsPage() {
	const session = await getSession();
	if (!session || session.role !== "PATRON") redirect("/patron/login");

	const bookings = await prisma.booking.findMany({
		where: { patronId: session.sub },
		include: { facility: { select: { name: true } } },
		orderBy: { createdAt: "desc" },
	});

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-3 flex-wrap">
				<div>
					<h1 className="page-title">My Bookings</h1>
					<p className="text-sm page-subtitle">{bookings.length} booking{bookings.length === 1 ? "" : "s"}</p>
				</div>
				<Link href="/patron/book" className={cn(buttonVariants({ variant: "default" }), "flex-shrink-0")}>New Booking</Link>
			</div>

			<Card className="overflow-hidden">
				{bookings.length === 0 ? (
					<div className="p-8 text-center text-[var(--muted)] text-sm">No bookings yet.</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-[var(--cream)] border-b border-[var(--border)]">
								<tr>
									<th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Title</th>
									<th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Facility</th>
									<th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Start</th>
									<th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Amount</th>
									<th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Status</th>
								</tr>
							</thead>
							<tbody>
								{bookings.map((b) => (
									<tr key={b.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
										<td className="py-3 px-4 text-[var(--navy)] font-medium">
											<Link href={`/patron/bookings/${b.id}`} className="hover:underline">{b.title}</Link>
										</td>
										<td className="py-3 px-4 text-[var(--slate)]">{b.facility?.name ?? "N/A"}</td>
										<td className="py-3 px-4 text-[var(--muted)]">{formatDateTime(b.startTime)}</td>
										<td className="py-3 px-4 text-[var(--slate)]">{formatCurrency(Number(b.totalAmount ?? 0))}</td>
										<td className="py-3 px-4"><StatusBadge status={b.status} size="xs" /></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</div>
	);
}
