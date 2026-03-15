import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, CalendarRange, Clock3, Users, ChevronLeft, MapPin, Sparkles } from "lucide-react";
import PublicTopNav from "@/components/public/PublicTopNav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function PublicFacilityDetailPage({ params }: { params: { id: string } }) {
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
    <div className="min-h-screen relative overflow-hidden bg-slate-50 selection:bg-[var(--gold-pale)]">
      {/* Immersive Background Blur / Gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[70%] rounded-full bg-[var(--gold)]/10 blur-[120px]" />
        <div className="absolute top-[40%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[var(--navy)]/5 blur-[100px]" />
        <div className="absolute -bottom-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-[#1c3058]/5 blur-[80px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 w-full">
        <PublicTopNav current="home" />

        <main className="max-w-[1200px] mx-auto px-5 md:px-8 py-10 md:py-16 space-y-10">
          
          {/* Header Section */}
          <section className="relative">
            <Link 
              href="/" 
              className="group mb-8 inline-flex items-center gap-2 py-3"
            >
              <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back to Home
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="outline" className="bg-white/50 backdrop-blur-md border-[var(--gold)]/30 text-[var(--navy)] px-3 py-1 uppercase tracking-widest text-[10px]">
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
                <p className="text-lg text-slate-600 leading-relaxed font-light">
                  {facility.description ?? "Experience premium amenities and unparalleled service in our professionally managed space."}
                </p>
              </div>

              <div className="flex-shrink-0 animate-fade-in">
                <Link
                  href={`/guest/book?facilityId=${facility.id}`}
                  className="inline-flex items-center justify-center bg-gradient-to-br from-[var(--navy)] to-[var(--navy-light)] hover:opacity-90 shadow-xl shadow-[var(--navy)]/10 rounded-full px-8 py-6 text-[15px] font-semibold border border-white/10 transition-transform hover:-translate-y-1 text-white"
                >
                  Book Now <ArrowRight size={18} className="ml-2" />
                </Link>
              </div>
            </div>
          </section>

          {/* Facility Images Gallery */}
          {facility.images && facility.images.length > 0 && (
            <section className="animate-slide-in-up">
              <div className="rounded-3xl p-2 bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
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
                            <span className="text-white font-medium text-lg flex flex-col items-center gap-1">
                              <span className="text-2xl">+{facility.images.length - 5}</span>
                              <span className="text-xs uppercase tracking-widest text-white/80">More Photos</span>
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
            <Card className="bg-white/60 backdrop-blur-xl border-white/80 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300 rounded-3xl overflow-hidden group">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-xl">💰</span>
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Standard Rate</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl text-[var(--navy)] font-bold">{formatCurrency(standardRate)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl border-white/80 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300 rounded-3xl overflow-hidden group">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-[var(--navy)]/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users size={22} className="text-[var(--navy-light)]" />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Max Capacity</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl text-[var(--navy)] font-bold">{facility.capacity.toLocaleString()}</span>
                  <span className="text-sm text-slate-500 font-medium">guests</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl border-white/80 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300 rounded-3xl overflow-hidden group">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Clock3 size={22} className="text-sky-600" />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Daily Hours</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-[var(--navy)] font-bold tracking-tight">
                    {facility.availableFrom} <span className="text-slate-300 font-light mx-1">-</span> {facility.availableTo}
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Details & Schedule */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white/60 backdrop-blur-xl border-white/80 shadow-sm rounded-3xl overflow-hidden">
                <CardContent className="p-8 md:p-10">
                  <h2 className="font-display text-2xl text-[var(--navy)] font-semibold border-b border-slate-100 pb-4 mb-6">Facility Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--navy)] uppercase tracking-wider mb-4">
                        <CalendarRange size={16} className="text-[var(--gold)]" /> Operating Days
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map((day, idx) => {
                          const isAvailable = facility.availableDays.includes(idx);
                          return (
                            <Badge key={day} variant={isAvailable ? "secondary" : "outline"} className={`px-3 py-1.5 font-medium ${isAvailable ? "bg-[var(--navy)]/5 text-[var(--navy)]" : "text-slate-300 border-dashed"}`}>
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
                            <li key={i} className="flex items-center gap-3 text-slate-600 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]"></span> {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No specific amenities listed.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Activity Sidebar */}
            <div className="lg:col-span-1 border border-white/80 bg-white/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm h-fit">
              <h3 className="font-display text-xl text-[var(--navy)] font-semibold mb-6 flex items-center justify-between">
                Upcoming Schedule
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
              </h3>
              
              {facility.bookings.length === 0 ? (
                <div className="text-center py-10 bg-white/40 rounded-2xl border border-dashed border-slate-200">
                  <CalendarRange size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500 font-medium">Fully available this week.</p>
                  <p className="text-xs text-slate-400 mt-1">Be the first to book!</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {facility.bookings.map((booking) => {
                    const startDate = new Date(booking.startTime);
                    const isApproved = booking.status === "APPROVED";
                    return (
                      <div key={booking.id} className="relative flex items-center justify-between pl-6 md:pl-0">
                        <div className="hidden md:flex w-24 flex-col text-right pr-4">
                          <span className="text-xs font-bold text-[var(--navy)]">{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                        <div className={`absolute left-0 md:left-1/2 -ml-1 md:-ml-[5px] w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${isApproved ? "bg-emerald-500" : "bg-sky-400"}`}></div>
                        <div className="bg-white/80 rounded-xl p-3 shadow-sm border border-slate-100 flex-1 md:ml-4 w-full">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-700 md:hidden">{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {startDate.toLocaleTimeString('en-US', { hour: 'numeric' })}</span>
                            <Badge variant="outline" className={`text-[9px] uppercase px-1.5 py-0 border-none print:hidden ${isApproved ? "text-emerald-600 bg-emerald-50" : "text-sky-600 bg-sky-50"}`}>
                              {booking.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
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

          {/* Super-CTA Section */}
          <section className="relative mt-12 rounded-[2rem] overflow-hidden group">
            <div className="absolute inset-0 bg-[var(--navy)]">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[var(--navy-light)] to-transparent skew-x-12 translate-x-32 group-hover:translate-x-10 transition-transform duration-1000 ease-out"></div>
            </div>
            
            <div className="relative p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 z-10">
              <div className="text-center md:text-left">
                <span className="text-[var(--gold)] text-sm font-bold uppercase tracking-widest block mb-2">Ready to Reserve?</span>
                <h2 className="text-3xl md:text-4xl font-display text-white font-bold max-w-xl leading-tight">
                  Secure your dates before they&apos;re gone.
                </h2>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <Link
                  href={`/guest/book?facilityId=${facility.id}`}
                  className="inline-flex items-center justify-center bg-white text-[var(--navy)] hover:bg-[var(--cream)] rounded-full px-8 h-14 text-base font-semibold shadow-xl border-0"
                >
                  Reserve as Guest
                </Link>
                <Link
                  href="/patron/login"
                  className="inline-flex items-center justify-center bg-transparent text-white border border-white/20 hover:bg-white/10 rounded-full px-8 h-14 text-base font-medium"
                >
                  Patron Sign In
                </Link>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
