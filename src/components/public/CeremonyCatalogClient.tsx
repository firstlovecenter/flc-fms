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
import { Input } from "@/components/ui/input";
import { Users, Expand, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { validateCeremonyCode } from "@/actions/ceremony-code.actions";

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
  const [codeModalConfig, setCodeModalConfig] = useState<Config | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const ceremonyLabel = type === "WEDDING" ? "Wedding" : "Naming Ceremony";

  async function handleProceedWithCode(config: Config) {
    if (!code.trim()) {
      setCodeError("Please enter your booking code.");
      return;
    }
    setCodeLoading(true);
    setCodeError(null);
    try {
      const result = await validateCeremonyCode(code.trim().toUpperCase());
      if (!result.valid) {
        setCodeError(result.error ?? "Invalid code.");
        return;
      }
      router.push(
        `/guest/book?ceremonyType=${type}&facilityId=${config.facility.id}&codeId=${result.codeId}`
      );
    } catch {
      setCodeError("Something went wrong. Please try again.");
    } finally {
      setCodeLoading(false);
    }
  }

  function openCodeModal(config: Config) {
    setCodeModalConfig(config);
    setCode("");
    setCodeError(null);
  }

  if (configs.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--muted)]">
        No {ceremonyLabel} venues are currently available. Please check back soon.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {configs.map((config) => (
          <Card
            key={config.id}
            className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
          >
            {/* Image */}
            <div
              className="relative h-48 bg-slate-100 overflow-hidden"
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
                  <svg
                    className="w-16 h-16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
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
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Expand size={14} />
              </button>
            </div>

            <CardContent className="p-4 space-y-1">
              <h3 className="font-bold text-[var(--navy)] text-base leading-snug">
                {config.facility.name}
              </h3>
              {config.description && (
                <p className="text-sm text-[var(--slate)] line-clamp-2">
                  {config.description}
                </p>
              )}
              <div className="flex items-center gap-1 text-xs text-[var(--muted)] pt-1">
                <Users size={12} />
                <span>Capacity: {config.facility.capacity.toLocaleString()}</span>
              </div>
            </CardContent>

            <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between">
              <span className="text-xl font-bold text-[var(--navy)]">
                {formatCurrency(Number(config.price))}
              </span>
              <Button
                size="sm"
                onClick={() => openCodeModal(config)}
                className="bg-[var(--navy)] hover:bg-[var(--navy)]/90 text-white"
              >
                Book Now
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

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
                  <DialogTitle className="text-xl text-[var(--navy)]">
                    {selectedConfig.facility.name}
                  </DialogTitle>
                </DialogHeader>
                {selectedConfig.description && (
                  <p className="text-sm text-[var(--slate)]">
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
                  <span className="text-2xl font-bold text-[var(--navy)]">
                    {formatCurrency(Number(selectedConfig.price))}
                  </span>
                  <Button
                    onClick={() => {
                      setSelectedConfig(null);
                      openCodeModal(selectedConfig);
                    }}
                    className="bg-[var(--navy)] hover:bg-[var(--navy)]/90 text-white"
                  >
                    Book Now
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Code entry modal */}
      <Dialog
        open={!!codeModalConfig}
        onOpenChange={(open) => !open && setCodeModalConfig(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Your Booking Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-[var(--slate)]">
              Enter the unique code you received after confirming payment to
              proceed with your booking.
            </p>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABCD1234"
                className="flex-1 font-mono tracking-widest uppercase"
                maxLength={8}
                autoFocus
              />
              <Button
                onClick={() => codeModalConfig && handleProceedWithCode(codeModalConfig)}
                disabled={codeLoading}
                className="bg-[var(--navy)] hover:bg-[var(--navy)]/90 text-white shrink-0"
              >
                {codeLoading ? "…" : "Proceed →"}
              </Button>
            </div>
            {codeError && (
              <p className="text-sm text-red-600">{codeError}</p>
            )}
            <div className="pt-2 border-t border-slate-100 text-sm text-[var(--muted)]">
              Don&apos;t have a code yet?{" "}
              <a
                href="/ceremony-code-request"
                className="text-[var(--gold)] hover:underline font-semibold"
              >
                Request a Payment Code →
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
