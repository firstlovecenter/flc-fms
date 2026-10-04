import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, CalendarRange, Clock3, Users, ChevronLeft, MapPin, Sparkles } from "lucide-react";
import PublicShell from "@/components/public/PublicShell";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function PublicFacilityDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const facility = await prisma.facility.findFirst({
    where: { id: params.id, isActive: true },
    include: {
      pricing: {
        where: { isActive: true },
        select: { price: true },
      },
      bookings: {
        where: { status: { in: ["PENDING", "APPROVED"] }, startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        take: 4,
        select: { id: true, startTime: true, endTime: true, status: true },
      },
    },
  });

  if (!facility) notFound();
  const standardRate = facility.pricing.length
    ? Math.min(...facility.pricing.map((p) => Number(p.price)))
    : 0;

  return (
    <PublicShell layout="top" current="catalog" maxWidth="xl" className="selection:bg-[var(--gold-pale)]">
      <div className="space-y-10">
          
          {/* Header Section */}
          <section className="relative">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--navy)] transition-colors mb-6 group"
            >
              <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back to Catalog
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="outline" className="bg-white/50 dark:bg-[rgba(255,255,255,0.05)] backdrop-blur-md border-[var(--gold)]/30 text-[var(--navy)] px-3 py-1 uppercase tracking-widest text-[10px]">
                    <MapPin size={12} className="mr-1 inline-block text-[var(--gold)]" /> Facility Details
                  </Badge>
                  {facility.capacity > 100 && (
                    <Badge variant="secondary" className="bg-[var(--gold)]/10 text-[var(--gold-muted)] border-none px-3 py-1 uppercase tracking-widest text-[10px]">
                      <Sparkles size={12} className="mr-1 inline-block" /> High Capacity
                    </Badge>
                  )}
                </div>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-[var(--navy)] leading-tight tracking-tight mb-4 drop-shadow-sm">
                  {facility.name}
                </h1>
                <p className="text-lg text-[var(--text-muted)] leading-relaxed font-light">
                  {facility.description ?? "Experience premium amenities and unparalleled service in our professionally managed space."}
                </p>
              </div>

              <div className="flex-shrink-0 animate-fade-in">
                <Link
                  href={`/guest/book?facilityId=${facility.id}`}
                  className="inline-flex items-center justify-center bg-gradient-to-br from-[var(--navy)] to-[var(--navy-light)] dark:from-[#13233d] dark:to-[#1d3358] hover:opacity-90 shadow-xl shadow-[var(--navy)]/10 rounded-full px-8 py-6 text-[15px] font-semibold border border-white/10 transition-transform hover:-translate-y-1 text-white"
                >
                  Book Now <ArrowRight size={18} className="ml-2" />
                </Link>
              </div>
            </div>
          </section>

          {/* Facility Images Gallery */}
          {facility.images && facility.images.length > 0 && (
            <section className="animate-slide-in-up">
              <div className="rounded-3xl p-2 bg-white/40 dark:bg-[rgba(255,255,255,0.04)] backdrop-blur-2xl border border-white/60 dark:border-[rgba(255,255,255,0.1)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                {facility.images.length === 1 ? (
                  <div className="aspect-[21/9] w-full rounded-2xl overflow-hidden relative">
                     <img src={facility.images[0]} alt={facility.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 h-[450px]">
                    <div className="md:col-span-2 md:row-span-2 relative rounded-2xl overflow-hidden group">
                      <img src={facility.images[0]} alt={facility.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    {facility.images.slice(1, 5).map((img, idx) => (
                      <div key={idx} className="relative rounded-2xl overflow-hidden hidden md:block group">
                        <img src={img} alt={`${facility.name} - ${idx + 2}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        {idx === 3 && facility.images.length > 5 && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center transition-colors hover:bg-black/70 cursor-pointer">
                            <span className="text-[#fff] font-medium text-lg flex flex-col items-center gap-1">
                              <span className="text-2xl">+{facility.images.length - 5}</span>
                              <span className="text-xs uppercase tracking-widest text-[#fff]/80">More Photos</span>
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Core Info Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="bg-white/60 dark:bg-[rgba(255,255,255,0.04)] backdrop-blur-xl border-white/80 dark:border-[rgba(255,255,255,0.1)] shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300 rounded-3xl overflow-hidden group">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-xl">💰</span>
                </div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1">Standard Rate</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl text-[var(--navy)] font-bold">{formatCurrency(standardRate)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-[rgba(255,255,255,0.04)] backdrop-blur-xl border-white/80 dark:border-[rgba(255,255,255,0.1)] shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300 rounded-3xl overflow-hidden group">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-[var(--navy)]/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users size={22} className="text-[var(--navy-light)]" />
                </div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1">Max Capacity</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl text-[var(--navy)] font-bold">{facility.capacity.toLocaleString()}</span>
                  <span className="text-sm text-[var(--text-muted)] font-medium">guests</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-[rgba(255,255,255,0.04)] backdrop-blur-xl border-white/80 dark:border-[rgba(255,255,255,0.1)] shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300 rounded-3xl overflow-hidden group">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-info/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Clock3 size={22} className="text-info" />
                </div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1">Daily Hours</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-[var(--navy)] font-bold tracking-tight">
                    {facility.availableFrom} <span className="text-[var(--text-muted)] font-light mx-1">-</span> {facility.availableTo}
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Details & Schedule */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white/60 dark:bg-[rgba(255,255,255,0.04)] backdrop-blur-xl border-white/80 dark:border-[rgba(255,255,255,0.1)] shadow-sm rounded-3xl overflow-hidden">
                <CardContent className="p-8 md:p-10">
                  <h2 className="font-display text-2xl text-[var(--navy)] font-semibold border-b border-[var(--border)] pb-4 mb-6">Facility Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--navy)] uppercase tracking-wider mb-4">
                        <CalendarRange size={16} className="text-[var(--gold)]" /> Operating Days
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map((day, idx) => {
                          const isAvailable = facility.availableDays.includes(idx);
                          return (
                            <Badge key={day} variant={isAvailable ? "secondary" : "outline"} className={`px-3 py-1.5 font-medium ${isAvailable ? "bg-[var(--navy)]/5 text-[var(--navy)]" : "text-[var(--text-muted)] border-dashed"}`}>
                              {day}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--navy)] uppercase tracking-wider mb-4">
                        <Sparkles size={16} className="text-[var(--gold)]" /> Amenities provided
                      </h3>
                      {facility.amenities.length > 0 ? (
                        <ul className="grid grid-cols-1 gap-3">
                          {facility.amenities.map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-[var(--text-muted)] text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]"></span> {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[var(--text-muted)] italic">No specific amenities listed.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Activity Sidebar */}
            <div className="lg:col-span-1 border border-white/80 dark:border-[rgba(255,255,255,0.1)] bg-white/40 dark:bg-[rgba(255,255,255,0.04)] backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm h-fit">
              <h3 className="font-display text-xl text-[var(--navy)] font-semibold mb-6 flex items-center justify-between">
                Upcoming Schedule
                <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
              </h3>
              
              {facility.bookings.length === 0 ? (
                <div className="text-center py-10 bg-white/40 dark:bg-[rgba(255,255,255,0.03)] rounded-2xl border border-dashed border-[var(--border)]">
                  <CalendarRange size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
                  <p className="text-sm text-[var(--text-muted)] font-medium">Fully available this week.</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Be the first to book!</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--border)] before:to-transparent">
                  {facility.bookings.map((booking) => {
                    const startDate = new Date(booking.startTime);
                    const isApproved = booking.status === "APPROVED";
                    return (
                      <div key={booking.id} className="relative flex items-center justify-between pl-6 md:pl-0">
                        <div className="hidden md:flex w-24 flex-col text-right pr-4">
                          <span className="text-xs font-bold text-[var(--navy)]">{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className="text-[10px] text-[var(--text-muted)] uppercase">{startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                        <div className={`absolute left-0 md:left-1/2 -ml-1 md:-ml-[5px] w-3 h-3 rounded-full border-2 border-white dark:border-[#0f1a2b] shadow-sm z-10 ${isApproved ? "bg-success" : "bg-info"}`}></div>
                        <div className="bg-white/80 dark:bg-[rgba(255,255,255,0.05)] rounded-xl p-3 shadow-sm border border-[var(--border)] flex-1 md:ml-4 w-full">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[var(--navy)] md:hidden">{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {startDate.toLocaleTimeString('en-US', { hour: 'numeric' })}</span>
                            <StatusBadge status={booking.status} size="xs" className="print:hidden" />
                          </div>
                          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 font-medium">
                            <Clock3 size={11} /> {Math.round((new Date(booking.endTime).getTime() - startDate.getTime()) / (1000 * 60 * 60))} hours
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* One clear next action */}
          <section className="mt-12 overflow-hidden rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            <div className="flex flex-col items-start gap-6 p-7 sm:p-10 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--gold-muted)]">
                  Available to book
                </p>
                <h2 className="font-display text-2xl font-bold leading-tight text-[var(--navy)] sm:text-3xl">
                  Hold these dates for your gathering
                </h2>
                <p className="mt-2 leading-relaxed text-[var(--text-muted)]">
                  Tell us when you need {facility.name} and we will confirm the details.
                </p>
              </div>

              <div className="flex w-full shrink-0 flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Link
                  href={`/guest/book?facilityId=${facility.id}`}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--r-lg)] bg-[var(--submit-bg)] px-7 text-base font-semibold text-[var(--submit-fg)] no-underline transition-colors hover:bg-[var(--submit-bg-hover)] sm:w-auto"
                >
                  Plan your visit <ArrowRight size={17} aria-hidden />
                </Link>
                <Link
                  href="/patron/login"
                  className="text-sm font-semibold text-[var(--gold-muted)] underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </section>

      </div>
    </PublicShell>
  );
}
