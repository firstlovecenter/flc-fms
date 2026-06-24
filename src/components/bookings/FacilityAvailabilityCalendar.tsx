"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, addDays, startOfDay } from "date-fns";
import { getFacilityAvailability, getFacilityPricing } from "@/actions/availability.actions";
import { formatCurrency } from "@/lib/utils";
import { MAX_BOOKING_ADVANCE_DAYS } from "@/lib/booking-window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "react-day-picker/dist/style.css";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  isFlexible: boolean;
  isFree: boolean;
  effectivePricePerHour: number;
  maxBookings: number;
  currentBookings: number;
  isAvailable: boolean;
}

interface FacilityAvailabilityCalendarProps {
  facilityId: string;
  category: string;
  onDateTimeSelect: (date: Date, startTime?: string, endTime?: string, slotId?: string) => void;
  selectedDate?: Date;
  availableDays?: number[]; // From facility.availableDays
}

export default function FacilityAvailabilityCalendar({
  facilityId,
  category,
  onDateTimeSelect,
  selectedDate: initialSelectedDate,
  availableDays = [0, 1, 2, 3, 4, 5, 6],
}: FacilityAvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialSelectedDate);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [pricing, setPricing] = useState<{ price: number } | null>(null);

  // Fetch pricing when category changes
  useEffect(() => {
    if (facilityId && category) {
      getFacilityPricing(facilityId, category).then((result) => {
        if (result.success && result.pricing) {
          setPricing(result.pricing);
        }
      });
    }
  }, [facilityId, category]);

  // Fetch time slots when date is selected
  useEffect(() => {
    if (!selectedDate || !facilityId || !category) return;

    setLoading(true);
    setSelectedSlot(null);
    setCustomStartTime("");
    setCustomEndTime("");

    getFacilityAvailability(facilityId, selectedDate, category)
      .then((result) => {
        if (result.success) {
          setTimeSlots(result.slots || []);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedDate, facilityId, category]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setCustomStartTime("");
    setCustomEndTime("");
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.isAvailable) return;

    setSelectedSlot(slot);

    if (slot.isFlexible) {
      // For flexible slots, user can choose their own time within the range
      setCustomStartTime(slot.startTime);
      setCustomEndTime(slot.endTime);
    } else {
      // For strict slots, use the exact times
      if (selectedDate) {
        onDateTimeSelect(selectedDate, slot.startTime, slot.endTime, slot.id);
      }
    }
  };

  const handleFlexibleTimeConfirm = () => {
    if (selectedDate && customStartTime && customEndTime && selectedSlot) {
      onDateTimeSelect(selectedDate, customStartTime, customEndTime, selectedSlot.id);
    }
  };

  const estimatedCost = () => {
    if (!customStartTime || !customEndTime) return null;

    const start = parseTime(customStartTime);
    const end = parseTime(customEndTime);
    if (end <= start) return null;

    // Use selected slot's configured amount if available, otherwise fall back to category default
    const price = selectedSlot?.effectivePricePerHour ?? pricing?.price ?? 0;
    return price;
  };

  // Disable days that aren't in availableDays
  const disabledDays = [
    { before: addDays(new Date(), 1) }, // Can't book today or past
    { after: addDays(new Date(), MAX_BOOKING_ADVANCE_DAYS) },
    { dayOfWeek: [1] }, // Mondays are off-days (Sabbath)
    (date: Date) => !availableDays.includes(date.getDay()),
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Calendar */}
      <div style={{
        background: "rgba(255, 255, 255, 0.12)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(200, 163, 90, 0.2)",
        borderRadius: "var(--r-md)",
        padding: "24px",
      }}>
        <h3 style={{
          fontSize: "0.95rem",
          fontWeight: 600,
          color: "var(--navy)",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          📅 Select a Date
        </h3>
        {!category && (
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "10px" }}>
            Select an event category first.
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "center", animation: "fade-in 0.3s ease-out" }}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={[() => !category, ...disabledDays]}
            className="border rounded-lg p-2"
            modifiersClassNames={{
              selected: "bg-gold text-[#fff]",
              today: "border-2 border-gold",
            }}
            fromDate={addDays(new Date(), 1)}
            toDate={addDays(new Date(), 90)}
          />
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div style={{
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(200, 163, 90, 0.2)",
          borderRadius: "var(--r-md)",
          padding: "24px",
          animation: "slide-in-up 0.4s ease-out",
        }}>
          <h3 style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "var(--navy)",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            ⏰ Available Times - {format(selectedDate, "MMMM d, yyyy")}
          </h3>

          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--slate)", animation: "pulse 2s ease-in-out infinite" }}>
              Loading availability...
            </div>
          ) : timeSlots.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--slate)" }}>
              No time slots available for this day
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {timeSlots.map((slot, idx) => (
                <button
                  key={slot.id}
                  onClick={() => handleSlotSelect(slot)}
                  disabled={!slot.isAvailable}
                  style={{
                    textAlign: "left",
                    padding: "16px",
                    borderRadius: "var(--r-sm)",
                    border: selectedSlot?.id === slot.id 
                      ? "2px solid var(--gold)" 
                      : slot.isAvailable 
                      ? "1.5px solid rgba(200, 163, 90, 0.15)"
                      : "1.5px solid rgba(200, 163, 90, 0.08)",
                    background: selectedSlot?.id === slot.id
                      ? "rgba(200, 163, 90, 0.15)"
                      : slot.isAvailable
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(255, 255, 255, 0.04)",
                    color: slot.isAvailable ? "var(--navy)" : "var(--muted)",
                    cursor: slot.isAvailable ? "pointer" : "not-allowed",
                    opacity: slot.isAvailable ? 1 : 0.6,
                    transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transform: selectedSlot?.id === slot.id ? "translateY(-2px)" : "translateY(0)",
                    boxShadow: selectedSlot?.id === slot.id 
                      ? "0 4px 12px rgba(200, 163, 90, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                      : slot.isAvailable
                      ? "0 2px 8px rgba(10, 22, 40, 0.08)"
                      : "none",
                    animation: `fade-in 0.3s ease-out ${idx * 0.05}s backwards`,
                  }}
                  onMouseEnter={(e) => {
                    if (slot.isAvailable && selectedSlot?.id !== slot.id) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.12)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(200, 163, 90, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSlot?.id !== slot.id) {
                      (e.currentTarget as HTMLElement).style.background = slot.isAvailable ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.04)";
                      (e.currentTarget as HTMLElement).style.boxShadow = slot.isAvailable ? "0 2px 8px rgba(10, 22, 40, 0.08)" : "none";
                    }
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--navy)" }}>{slot.label}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--slate)", marginTop: "4px" }}>
                        {slot.startTime} - {slot.endTime}
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                        {slot.isFree ? (
                          <span
                            className="bg-success/15 text-success border border-success/30"
                            style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            borderRadius: "var(--r-xs)",
                          }}>
                            ✓ FREE
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--gold)" }}>
                            ⚡ {formatCurrency(slot.effectivePricePerHour)}
                          </span>
                        )}
                        {slot.isFlexible && (
                          <span style={{ fontSize: "0.75rem", color: "var(--gold)", fontWeight: 500 }}>
                            🎯 Flexible
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {slot.isAvailable ? (
                        <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--success)" }}>✓ Available</span>
                      ) : (
                        <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--danger)" }}>✗ Booked</span>
                      )}
                      <div style={{ fontSize: "0.75rem", color: "var(--slate)", marginTop: "4px" }}>
                        {slot.currentBookings}/{slot.maxBookings}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom Time Selection for Flexible Slots */}
      {selectedSlot?.isFlexible && (
        <div style={{
          background: "linear-gradient(135deg, rgba(200, 163, 90, 0.15) 0%, rgba(200, 163, 90, 0.08) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(200, 163, 90, 0.3)",
          borderRadius: "var(--r-md)",
          padding: "24px",
          animation: "scale-in 0.3s ease-out",
        }}>
          <h4 style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "var(--navy)",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            🎯 Choose Your Booking Time
          </h4>
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: "var(--slate)",
                  marginBottom: "8px",
                }}>
                  Start Time
                </label>
                <Input
                  type="time"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  min={selectedSlot.startTime}
                  max={selectedSlot.endTime}
                  style={{ fontSize: "0.9rem" }}
                />
              </div>
              <div>
                <label style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: "var(--slate)",
                  marginBottom: "8px",
                }}>
                  End Time
                </label>
                <Input
                  type="time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  min={selectedSlot.startTime}
                  max={selectedSlot.endTime}
                  style={{ fontSize: "0.9rem" }}
                />
              </div>
            </div>

            {estimatedCost() !== null && (
              <div
                className={selectedSlot?.isFree ? "bg-success/10 border border-success/20" : "bg-gold/10 border border-gold/20"}
                style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                color: selectedSlot?.isFree ? "var(--success)" : "var(--navy)",
                padding: "12px 16px",
                borderRadius: "var(--r-sm)",
              }}>
                {selectedSlot?.isFree ? (
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--success)" }}>
                    ✓ This booking is FREE
                  </div>
                ) : (
                  <div>
                    💰 Estimated Cost: {formatCurrency(estimatedCost()!)}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleFlexibleTimeConfirm}
              disabled={!customStartTime || !customEndTime || parseTime(customEndTime) <= parseTime(customStartTime)}
              className="w-full"
            >
              Confirm Time Selection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to convert "HH:MM" to minutes since midnight
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}
