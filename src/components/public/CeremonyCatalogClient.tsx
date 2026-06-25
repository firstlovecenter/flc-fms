"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Expand, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Config = {
  id: string;
  type: string;
  images: string[];
  price: any;
  description: string | null;
  facility: {
    id: string;
    name: string;
    capacity: number;
    availableFrom: string;
    availableTo: string;
  };
};

type Props = {
  type: "WEDDING" | "NAMING";
  configs: Config[];
};

export default function CeremonyCatalogClient({ type, configs }: Props) {
  const router = useRouter();
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);

  const ceremonyLabel = type === "WEDDING" ? "Wedding" : "Naming Ceremony";

  function book(config: Config) {
    router.push(`/guest/book?ceremonyType=${type}&facilityId=${config.facility.id}`);
  }

  return (
    <>
      {/* Payment explainer — surfaced up front */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/25 px-4 py-3">
        <Info size={16} className="text-[var(--gold)] shrink-0" aria-hidden />
        <p className="text-sm text-[var(--slate)] dark:text-gray-300 min-w-0 flex-1">
          {ceremonyLabel} bookings are held on ceremony Saturdays and require a{" "}
          <strong>payment code</strong>. Pay, upload your receipt, and we&apos;ll issue your code.
        </p>
        <a
          href="/ceremony-code-request"
          className="text-xs font-semibold text-[var(--gold)] hover:underline whitespace-nowrap shrink-0"
        >
          Request a code →
        </a>
      </div>

      {configs.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          No {ceremonyLabel} venues are currently available. Please check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {configs.map((config) => (
            <Card
              key={config.id}
              className="overflow-hidden group hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              <div
                className="relative h-48 bg-slate-100 dark:bg-[rgba(255,255,255,0.04)] overflow-hidden cursor-pointer"
                onClick={() => setSelectedConfig(config)}
              >
                {config.images[0] ? (
                  <img
                    src={config.images[0]}
                    alt={config.facility.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConfig(config);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-[#fff] opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="View venue details"
                >
                  <Expand size={14} />
                </button>
              </div>

              <CardContent className="p-4 space-y-1">
                <h3 className="font-bold text-[var(--navy)] dark:text-gray-100 text-base leading-snug">
                  {config.facility.name}
                </h3>
                {config.description && (
                  <p className="text-sm text-[var(--slate)] dark:text-gray-300 line-clamp-2">
                    {config.description}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-[var(--muted)] pt-1">
                  <Users size={12} />
                  <span>Capacity: {config.facility.capacity.toLocaleString()}</span>
                </div>
              </CardContent>

              <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between">
                <div>
                  <span className="text-xl font-bold text-[var(--navy)] dark:text-gray-100">
                    {formatCurrency(Number(config.price))}
                  </span>
                  <p className="text-[11px] text-[var(--muted)]">Payment code required</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => book(config)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Book
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Venue detail modal */}
      <Dialog
        open={!!selectedConfig}
        onOpenChange={(open) => !open && setSelectedConfig(null)}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {selectedConfig && (
            <>
              {selectedConfig.images.length > 0 && (
                <Carousel className="w-full">
                  <CarouselContent>
                    {selectedConfig.images.map((src, i) => (
                      <CarouselItem key={i}>
                        <img
                          src={src}
                          alt={selectedConfig.facility.name}
                          className="w-full h-64 object-cover"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {selectedConfig.images.length > 1 && (
                    <>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </>
                  )}
                </Carousel>
              )}
              <div className="p-6 space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl text-[var(--navy)] dark:text-gray-100">
                    {selectedConfig.facility.name}
                  </DialogTitle>
                </DialogHeader>
                {selectedConfig.description && (
                  <p className="text-sm text-[var(--slate)] dark:text-gray-300">
                    {selectedConfig.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <Users size={13} />
                    Capacity: {selectedConfig.facility.capacity.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-2xl font-bold text-[var(--navy)] dark:text-gray-100">
                      {formatCurrency(Number(selectedConfig.price))}
                    </span>
                    <p className="text-xs text-[var(--muted)]">Payment code required to book</p>
                  </div>
                  <Button
                    onClick={() => {
                      const c = selectedConfig;
                      setSelectedConfig(null);
                      book(c);
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Book
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
