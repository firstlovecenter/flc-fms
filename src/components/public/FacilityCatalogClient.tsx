"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { MapPin, Users, Clock, ArrowRight, Expand, Wifi, Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

type FacilityProps = {
  id: string;
  name: string;
  description: string | null;
  underMaintenance: boolean;
  maintenanceStartsAt?: string | null;
  maintenanceEndsAt?: string | null;
  capacity: number;
  pricePerHour: any;
  availableFrom: string;
  availableTo: string;
  amenities: string[];
  images: string[];
  supportedCategories: string[];
};

const CATEGORY_LABELS: Record<string, string> = {
  CHURCH_SERVICE:  "Church Service",
  WEDDING:         "Wedding",
  FUNERAL:         "Funeral",
  MEETING:         "Meeting",
  CONFERENCE:      "Conference",
  WORKSHOP:        "Workshop",
  BIRTHDAY_PARTY:  "Birthday Party",
  CONCERT:         "Concert",
  REHEARSAL:       "Rehearsal",
  BABY_DEDICATION: "Baby Dedication",
  OTHER:           "Other",
};

const CAPACITY_BUCKETS = [
  { label: "Any Size",   value: "all",    min: 0,    max: Infinity },
  { label: "< 100",      value: "small",  min: 0,    max: 99 },
  { label: "100 – 500",  value: "medium", min: 100,  max: 500 },
  { label: "500 – 1500", value: "large",  min: 501,  max: 1500 },
  { label: "1500+",      value: "xlarge", min: 1501, max: Infinity },
];

function matchesCapacity(capacity: number, bucket: string) {
  const b = CAPACITY_BUCKETS.find(b => b.value === bucket);
  if (!b || b.value === "all") return true;
  return capacity >= b.min && capacity <= b.max;
}

export default function FacilityCatalogClient({ facilities }: { facilities: FacilityProps[] }) {
  const [selectedFacility, setSelectedFacility] = useState<FacilityProps | null>(null);
  const [modalCarouselApi, setModalCarouselApi]  = useState<CarouselApi>();

  // ── Filter state ──
  const [searchQuery,        setSearchQuery]        = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [capacityBucket,     setCapacityBucket]     = useState("all");
  const [selectedAmenities,  setSelectedAmenities]  = useState<string[]>([]);
  const [showAvailableOnly,  setShowAvailableOnly]  = useState(false);
  const [filtersOpen,        setFiltersOpen]        = useState(false);

  // Derived option lists
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach(f => f.supportedCategories.forEach(c => set.add(c)));
    return Array.from(set).sort();
  }, [facilities]);

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach(f => f.amenities.forEach(a => set.add(a)));
    return Array.from(set).sort();
  }, [facilities]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return facilities.filter(f => {
      if (q && !f.name.toLowerCase().includes(q) && !(f.description?.toLowerCase().includes(q))) return false;
      if (selectedCategories.length > 0 && !selectedCategories.some(c => f.supportedCategories.includes(c))) return false;
      if (!matchesCapacity(f.capacity, capacityBucket)) return false;
      if (selectedAmenities.length > 0 && !selectedAmenities.every(a => f.amenities.includes(a))) return false;
      if (showAvailableOnly && f.underMaintenance) return false;
      return true;
    });
  }, [facilities, searchQuery, selectedCategories, capacityBucket, selectedAmenities, showAvailableOnly]);

  const activeFilterCount = [
    selectedCategories.length > 0,
    capacityBucket !== "all",
    selectedAmenities.length > 0,
    showAvailableOnly,
  ].filter(Boolean).length;

  function toggleCategory(cat: string) {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }
  function toggleAmenity(a: string) {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  }
  function clearAll() {
    setSearchQuery(""); setSelectedCategories([]); setCapacityBucket("all");
    setSelectedAmenities([]); setShowAvailableOnly(false);
  }

  useEffect(() => {
    if (!selectedFacility || !modalCarouselApi || selectedFacility.images.length <= 1) return;
    const interval = setInterval(() => { modalCarouselApi.scrollNext(); }, 3500);
    return () => clearInterval(interval);
  }, [selectedFacility, modalCarouselApi]);

  return (
    <>
      {/* ─────────────────── Filter Bar ─────────────────── */}
      <div className="mb-6 space-y-3">
        {/* Row: search + toggle + clear */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search venues…"
              className="w-full pl-9 pr-8 h-10 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--navy)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/20 focus:border-[var(--navy)]/40 transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--navy)]">
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={cn(
              "relative flex items-center gap-2 h-10 px-3 sm:px-4 rounded-xl border text-sm font-medium transition-colors shrink-0",
              filtersOpen || activeFilterCount > 0
                ? "bg-[var(--navy)] text-white border-[var(--navy)]"
                : "bg-white border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-dark)]"
            )}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--gold)] text-[var(--navy)] text-[10px] font-bold flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={13} className={cn("transition-transform duration-200", filtersOpen && "rotate-180")} />
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[hsl(var(--danger-hsl)/0.35)] transition-colors shrink-0"
            >
              <X size={14} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-4 sm:p-5 space-y-5 shadow-sm">

            {/* Event Type */}
            {allCategories.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2.5">Event Type</p>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                        selectedCategories.includes(cat)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-[var(--cream)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--navy)]/40 hover:bg-[var(--cream-dark)]"
                      )}
                    >
                      {CATEGORY_LABELS[cat] ?? cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Capacity */}
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2.5">Capacity</p>
              <div className="flex flex-wrap gap-2">
                {CAPACITY_BUCKETS.map(b => (
                  <button
                    key={b.value}
                    onClick={() => setCapacityBucket(b.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                      capacityBucket === b.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-[var(--cream)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--navy)]/40 hover:bg-[var(--cream-dark)]"
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {allAmenities.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2.5">
                  Amenities <span className="normal-case font-normal">(must include all selected)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {allAmenities.map(a => (
                    <button
                      key={a}
                      onClick={() => toggleAmenity(a)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                        selectedAmenities.includes(a)
                          ? "bg-[var(--gold)] text-[var(--navy)] border-[var(--gold)]"
                          : "bg-[var(--cream)] text-[var(--text-muted)] border-[var(--border)] hover:border-[hsl(var(--gold-hsl)/0.5)] hover:bg-[hsl(var(--gold-hsl)/0.10)]"
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Availability toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <div>
                <p className="text-sm font-semibold text-[var(--navy)]">Available only</p>
                <p className="text-xs text-[var(--text-muted)]">Hide venues under maintenance</p>
              </div>
              <button
                onClick={() => setShowAvailableOnly(v => !v)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0",
                  showAvailableOnly ? "bg-primary" : "bg-[var(--cream-dark)]"
                )}
              >
                <span className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-[#fff] shadow transition-all duration-200",
                  showAvailableOnly ? "left-6" : "left-1"
                )} />
              </button>
            </div>
          </div>
        )}

        {/* Active chip summary + result count */}
        {(activeFilterCount > 0 || searchQuery) && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[var(--text-muted)] shrink-0">
              <span className="font-semibold text-[var(--navy)]">{filtered.length}</span> of {facilities.length} venues
            </span>
            {selectedCategories.map(c => (
              <button key={c} onClick={() => toggleCategory(c)} className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--navy)]/10 text-[var(--navy)] font-semibold hover:bg-[var(--navy)]/20 transition-colors">
                {CATEGORY_LABELS[c] ?? c} <X size={11} />
              </button>
            ))}
            {capacityBucket !== "all" && (
              <button onClick={() => setCapacityBucket("all")} className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--navy)]/10 text-[var(--navy)] font-semibold hover:bg-[var(--navy)]/20 transition-colors">
                {CAPACITY_BUCKETS.find(b => b.value === capacityBucket)?.label} <X size={11} />
              </button>
            )}
            {selectedAmenities.map(a => (
              <button key={a} onClick={() => toggleAmenity(a)} className="flex items-center gap-1 px-2 py-1 rounded-full bg-[hsl(var(--gold-hsl)/0.18)] text-[var(--gold-muted)] font-semibold hover:bg-[hsl(var(--gold-hsl)/0.26)] transition-colors">
                {a} <X size={11} />
              </button>
            ))}
            {showAvailableOnly && (
              <button onClick={() => setShowAvailableOnly(false)} className="flex items-center gap-1 px-2 py-1 rounded-full bg-[hsl(var(--success-hsl)/0.14)] text-[var(--navy)] font-semibold hover:bg-[hsl(var(--success-hsl)/0.22)] transition-colors">
                Available Only <X size={11} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────── Facility Grid ─────────────────── */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white/40 border border-dashed border-[var(--border)] rounded-2xl">
          <Search size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="font-semibold text-[var(--text-muted)] mb-1">No venues match your filters</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">Try adjusting or clearing your filters</p>
          <button onClick={clearAll} className="text-sm text-[var(--navy)] font-semibold underline">Clear all filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
          {filtered.map((facility, index) => {
            const isPopular = facility.capacity >= 100 && Number(facility.pricePerHour) <= 50;

            return (
              <Card
                key={facility.id}
                className="group flex h-full flex-col overflow-hidden rounded-[var(--r-3xl)] border-[var(--border)] bg-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-dark)] hover:shadow-[var(--shadow-lg)] active:translate-y-0 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Image */}
                <div
                  className="relative aspect-video w-full bg-[var(--cream-dark)] overflow-hidden cursor-pointer"
                  onClick={() => setSelectedFacility(facility)}
                >
                  {facility.images && facility.images.length > 0 ? (
                    <img src={facility.images[0]} alt={facility.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                      <MapPin size={32} className="opacity-50 mb-2" />
                      <span className="text-xs font-semibold uppercase tracking-widest">No Image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Button
                    variant="secondary" size="icon"
                    className="absolute bottom-3 right-3 rounded-full opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-md bg-white/90 hover:bg-white text-[var(--navy)]"
                    onClick={e => { e.stopPropagation(); setSelectedFacility(facility); }}
                  >
                    <Expand size={16} />
                  </Button>
                  <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                    {isPopular && !facility.underMaintenance && <Badge className="bg-[var(--gold)] text-[var(--navy)] border-none shadow-sm font-bold w-fit text-[10px] px-1.5 py-0.5">Popular</Badge>}
                    {facility.underMaintenance && <Badge variant="destructive" className="shadow-sm w-fit border-none text-[10px] px-1.5 py-0.5">Under Maintenance</Badge>}
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-3 sm:p-5 flex-1 flex flex-col">
                  <h3 className="font-display font-bold text-sm sm:text-xl text-[var(--navy)] leading-tight line-clamp-2 mb-1">{facility.name}</h3>
                  {facility.underMaintenance ? (
                    <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
                      <span className="text-[10px] sm:text-xs text-[var(--warning)] font-semibold">
                        Unavailable
                        {facility.maintenanceEndsAt
                          ? ` until ${new Date(facility.maintenanceEndsAt).toLocaleDateString()}`
                          : " (maintenance)"}
                      </span>
                    </div>
                  ) : null}
                  <p className="hidden sm:block text-sm text-[var(--text-muted)] line-clamp-2 mb-3 font-light">
                    {facility.description || "A versatile space ready to host your next successful event or gathering."}
                  </p>
                  {facility.supportedCategories.length > 0 && (
                    <div className="hidden sm:flex flex-wrap gap-1 mb-3">
                      {facility.supportedCategories.slice(0, 2).map(cat => (
                        <span key={cat} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--navy)]/[0.08] text-[var(--navy)] border border-[var(--navy)]/10">
                          {CATEGORY_LABELS[cat] ?? cat}
                        </span>
                      ))}
                      {facility.supportedCategories.length > 2 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--cream-dark)] text-[var(--text-muted)]">
                          +{facility.supportedCategories.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="hidden sm:flex mt-auto text-xs font-medium text-[var(--text-muted)]">
                    <div className="flex items-center gap-1.5"><Users size={14} className="text-[var(--text-muted)]" /><span>Up to {facility.capacity}</span></div>
                  </div>
                  <div className="sm:hidden mt-auto flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-medium">
                    <Users size={11} /><span>{facility.capacity}</span>
                  </div>
                </CardContent>

                <CardFooter className="p-2 sm:p-5 pt-0 border-t border-[var(--border)] dark:border-white/5 bg-transparent dark:bg-transparent mt-1 sm:mt-4 flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                  {facility.underMaintenance ? (
                    <span className={cn(buttonVariants({ variant: "default" }), "w-full bg-[var(--cream-dark)] text-[var(--text-muted)] cursor-not-allowed shadow-none rounded-[calc(var(--radius)-2px)] h-9 sm:h-9 px-2 sm:px-4 py-1 sm:py-2 inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm font-medium pointer-events-none")}>
                      Unavailable
                    </span>
                  ) : (
                    <Link href={`/guest/book?facilityId=${facility.id}`} className={cn(buttonVariants({ variant: "default" }), "w-full bg-[var(--submit-bg)] text-[var(--submit-fg)] hover:bg-[var(--submit-bg-hover)] shadow-none rounded-[calc(var(--radius)-2px)] h-9 sm:h-9 px-2 sm:px-4 py-1 sm:py-2 inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50")}>
                      Book
                    </Link>
                  )}
                  <Link href={`/catalog/facilities/${facility.id}`} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto text-[var(--text-muted)] dark:text-[var(--text-muted)] border-[var(--border)] dark:border-white/5 rounded-[calc(var(--radius)-2px)] h-9 sm:h-9 px-2 sm:px-4 py-1 sm:py-2 inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border bg-background dark:bg-white/[0.03] hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50")}>
                    Details
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─────────────────── Quick View Modal ─────────────────── */}
      <Dialog open={!!selectedFacility} onOpenChange={(open) => !open && setSelectedFacility(null)}>
        <DialogContent
          showCloseButton={false}
          className="w-[96vw] max-w-[96vw] sm:!max-w-[520px] md:!max-w-[620px] lg:!max-w-[700px] xl:!max-w-[760px] h-[72vh] sm:h-[88vh] p-0 overflow-hidden rounded-2xl sm:rounded-[2rem] border-0 shadow-2xl bg-white gap-0 flex flex-col"
        >
          {selectedFacility && (
            <div className="flex h-full flex-col">
              <div className="bg-[var(--cream-dark)] relative h-[22vh] sm:h-[34vh] lg:h-[42vh]">
                {selectedFacility.images && selectedFacility.images.length > 0 ? (
                  <Carousel className="w-full h-full" opts={{ loop: true }} setApi={setModalCarouselApi}>
                    <CarouselContent className="-ml-0">
                      {selectedFacility.images.map((img, i) => (
                        <CarouselItem key={i} className="pl-0">
                          <div className="relative w-full h-[22vh] sm:h-[34vh] lg:h-[42vh]">
                            <img src={img} alt={`${selectedFacility.name} ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {selectedFacility.images.length > 1 && (
                      <>
                        <CarouselPrevious className="left-4 bg-white/50 backdrop-blur hover:bg-white border-none text-[var(--navy)]" />
                        <CarouselNext className="right-4 bg-white/50 backdrop-blur hover:bg-white border-none text-[var(--navy)]" />
                      </>
                    )}
                  </Carousel>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                    <MapPin size={48} className="opacity-30 mb-4" />
                    <span className="text-sm font-semibold uppercase tracking-widest">No Images Available</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  {selectedFacility.underMaintenance && <Badge variant="destructive" className="shadow-lg border-white border">Maintenance</Badge>}
                  {selectedFacility.capacity >= 100 && <Badge className="bg-[var(--gold)] text-[var(--navy)] hover:bg-[var(--gold)] border-white border shadow-lg">Premium Size</Badge>}
                </div>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="p-4 sm:p-6 md:p-8 pb-3 flex-1 overflow-y-auto">
                  <DialogHeader className="mb-4 text-left">
                    <DialogTitle className="font-display text-xl md:text-3xl font-bold text-[var(--navy)] leading-tight">
                      {selectedFacility.name}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[var(--text-muted)]">
                      {selectedFacility.description || "A premium venue space perfect for your special occasions, meetings, and celebrations."}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">


                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-[hsl(var(--accent-tours)/0.10)] border border-[hsl(var(--accent-tours)/0.28)] text-[var(--navy)]">
                        <Users size={16} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Max Capacity</p>
                          <p className="font-semibold text-xs sm:text-sm">{selectedFacility.capacity} guests</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-[hsl(var(--warning-hsl)/0.10)] border border-[hsl(var(--warning-hsl)/0.28)] text-[var(--navy)]">
                        <Clock size={16} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Hours</p>
                          <p className="font-semibold text-xs sm:text-sm">{selectedFacility.availableFrom} – {selectedFacility.availableTo}</p>
                        </div>
                      </div>
                    </div>

                    {selectedFacility.supportedCategories.length > 0 && (
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[var(--navy)] mb-2">Ideal For</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedFacility.supportedCategories.map(cat => (
                            <Badge key={cat} className="bg-[var(--navy)]/10 text-[var(--navy)] hover:bg-[var(--navy)]/20 border-none font-medium text-[11px]">
                              {CATEGORY_LABELS[cat] ?? cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedFacility.amenities.length > 0 && (
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[var(--navy)] mb-2 flex items-center gap-2">
                          <Wifi size={14} className="text-[var(--gold)]" /> Amenities
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedFacility.amenities.map(item => (
                            <Badge key={item} variant="secondary" className="bg-[var(--cream-dark)] text-[var(--text-muted)] hover:bg-[var(--cream-dark)] text-[11px]">{item}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-6 md:p-8 pt-3 bg-white border-t border-[var(--border)]">
                  {selectedFacility.underMaintenance && (
                    <div className="mb-3 p-3 rounded-xl bg-[hsl(var(--warning-hsl)/0.10)] border border-[hsl(var(--warning-hsl)/0.30)] text-[var(--navy)] text-sm flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">🔧</span>
                      <span>
                        This venue is under maintenance and cannot be booked.
                        {selectedFacility.maintenanceEndsAt && (
                          <> Expected back <strong>{new Date(selectedFacility.maintenanceEndsAt).toLocaleDateString()}</strong>.</>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:gap-3">
                    <Link href={`/catalog/facilities/${selectedFacility.id}`} className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-full")}>
                      Full Details
                    </Link>
                    {selectedFacility.underMaintenance ? (
                      <span className={cn(buttonVariants({ size: "lg", variant: "default" }), "w-full bg-[var(--cream-dark)] text-[var(--text-muted)] cursor-not-allowed pointer-events-none justify-center")}>
                        Unavailable
                      </span>
                    ) : (
                      <Link href={`/guest/book?facilityId=${selectedFacility.id}`} className={cn(buttonVariants({ size: "lg", variant: "default" }), "w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl")}>
                        Reserve Venue <ArrowRight size={16} className="ml-2" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
