"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import type { BookingContentPayload } from "@/lib/booking-content-defaults";
import { updateBookingContent } from "@/actions/booking-content.actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

type Tab = "terms" | "faqs" | "item-terms";

const TABS: { id: Tab; label: string }[] = [
  { id: "terms", label: "Terms & Conditions" },
  { id: "faqs", label: "FAQs" },
  { id: "item-terms", label: "Item Booking Terms" },
];

type Props = {
  initialContent: BookingContentPayload;
};

export default function BookingContentEditor({ initialContent }: Props) {
  const [content, setContent] = useState<BookingContentPayload>(initialContent);
  const [activeTab, setActiveTab] = useState<Tab>("terms");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateTerm(index: number, key: "title" | "body", value: string) {
    setContent((prev) => ({
      ...prev,
      bookingTerms: prev.bookingTerms.map((term, i) =>
        i === index ? { ...term, [key]: value } : term
      ),
    }));
  }

  function updateTermBullets(index: number, value: string) {
    const bullets = value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    setContent((prev) => ({
      ...prev,
      bookingTerms: prev.bookingTerms.map((term, i) =>
        i === index ? { ...term, bullets } : term
      ),
    }));
  }

  function updateFaq(index: number, key: "question" | "answer", value: string) {
    setContent((prev) => ({
      ...prev,
      bookingFaq: prev.bookingFaq.map((faq, i) =>
        i === index ? { ...faq, [key]: value } : faq
      ),
    }));
  }

  function updateItemTerm(index: number, value: string) {
    setContent((prev) => ({
      ...prev,
      itemTerms: prev.itemTerms.map((term, i) => (i === index ? value : term)),
    }));
  }

  function onSave() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateBookingContent(content);
      if ("error" in result && result.error) {
        setError(result.error as string);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="space-y-6">
      {error && <div className="alert alert-error">{error}</div>}

      <Card className="overflow-hidden">
        {/* Tab bar */}
        <div className="border-b border-[var(--border)] bg-[var(--card)]">
          <nav className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative px-5 py-3.5 text-sm font-medium transition-colors focus:outline-none",
                  activeTab === tab.id
                    ? "text-[var(--primary)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--primary)]"
                    : "text-[var(--muted)] hover:text-[var(--navy)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab panels */}
        <div className="p-5 space-y-4">

          {/* ── Terms & Conditions ── */}
          {activeTab === "terms" && (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--navy)]">Booking Terms Section</h2>
                <p className="text-xs text-[var(--muted)]">This controls the terms shown on venue booking forms.</p>
              </div>

              <div>
                <Label htmlFor="booking-terms-title">Section Title</Label>
                <Input
                  id="booking-terms-title"
                  value={content.bookingTermsTitle}
                  onChange={(e) => setContent((prev) => ({ ...prev, bookingTermsTitle: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="booking-terms-intro">Section Intro</Label>
                <Textarea
                  id="booking-terms-intro"
                  rows={3}
                  value={content.bookingTermsIntro}
                  onChange={(e) => setContent((prev) => ({ ...prev, bookingTermsIntro: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                {content.bookingTerms.map((term, index) => (
                  <div key={`term-${index}`} className="card-inset p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[var(--navy)]">Term {index + 1}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setContent((prev) => ({
                            ...prev,
                            bookingTerms: prev.bookingTerms.filter((_, i) => i !== index),
                          }))
                        }
                        disabled={content.bookingTerms.length <= 1}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    </div>

                    <div>
                      <Label htmlFor={`term-title-${index}`}>Title</Label>
                      <Input id={`term-title-${index}`} value={term.title} onChange={(e) => updateTerm(index, "title", e.target.value)} />
                    </div>

                    <div>
                      <Label htmlFor={`term-body-${index}`}>Body</Label>
                      <Textarea id={`term-body-${index}`} rows={3} value={term.body ?? ""} onChange={(e) => updateTerm(index, "body", e.target.value)} />
                    </div>

                    <div>
                      <Label htmlFor={`term-bullets-${index}`}>Bullets (one per line)</Label>
                      <Textarea
                        id={`term-bullets-${index}`}
                        rows={4}
                        value={(term.bullets ?? []).join("\n")}
                        onChange={(e) => updateTermBullets(index, e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setContent((prev) => ({
                      ...prev,
                      bookingTerms: [...prev.bookingTerms, { title: "", body: "", bullets: [] }],
                    }))
                  }
                >
                  <Plus size={14} /> Add Booking Term
                </Button>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button type="button" onClick={onSave} disabled={isPending}>
                  <Save size={15} /> {isPending ? "Saving..." : "Save Terms & Conditions"}
                </Button>
                {saved && <span className="text-sm text-success font-medium">Saved successfully.</span>}
              </div>
            </div>
          )}

          {/* ── FAQs ── */}
          {activeTab === "faqs" && (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--navy)]">FAQ Section</h2>
                <p className="text-xs text-[var(--muted)]">This controls the content of the public FAQ page.</p>
              </div>

              <div>
                <Label htmlFor="booking-faq-title">FAQ Title</Label>
                <Input
                  id="booking-faq-title"
                  value={content.bookingFaqTitle}
                  onChange={(e) => setContent((prev) => ({ ...prev, bookingFaqTitle: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                {content.bookingFaq.map((faq, index) => (
                  <div key={`faq-${index}`} className="card-inset p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[var(--navy)]">FAQ {index + 1}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setContent((prev) => ({
                            ...prev,
                            bookingFaq: prev.bookingFaq.filter((_, i) => i !== index),
                          }))
                        }
                        disabled={content.bookingFaq.length <= 1}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    </div>

                    <div>
                      <Label htmlFor={`faq-question-${index}`}>Question</Label>
                      <Input id={`faq-question-${index}`} value={faq.question} onChange={(e) => updateFaq(index, "question", e.target.value)} />
                    </div>

                    <div>
                      <Label htmlFor={`faq-answer-${index}`}>Answer</Label>
                      <Textarea id={`faq-answer-${index}`} rows={3} value={faq.answer} onChange={(e) => updateFaq(index, "answer", e.target.value)} />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setContent((prev) => ({
                      ...prev,
                      bookingFaq: [...prev.bookingFaq, { question: "", answer: "" }],
                    }))
                  }
                >
                  <Plus size={14} /> Add FAQ
                </Button>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button type="button" onClick={onSave} disabled={isPending}>
                  <Save size={15} /> {isPending ? "Saving..." : "Save FAQs"}
                </Button>
                {saved && <span className="text-sm text-success font-medium">Saved successfully.</span>}
              </div>
            </div>
          )}

          {/* ── Item Booking Terms ── */}
          {activeTab === "item-terms" && (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--navy)]">Item Booking Terms</h2>
                <p className="text-xs text-[var(--muted)]">This controls terms shown for item/package bookings.</p>
              </div>

              <div>
                <Label htmlFor="item-terms-title">Section Title</Label>
                <Input
                  id="item-terms-title"
                  value={content.itemTermsTitle}
                  onChange={(e) => setContent((prev) => ({ ...prev, itemTermsTitle: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="item-terms-intro">Section Intro</Label>
                <Textarea
                  id="item-terms-intro"
                  rows={3}
                  value={content.itemTermsIntro}
                  onChange={(e) => setContent((prev) => ({ ...prev, itemTermsIntro: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                {content.itemTerms.map((term, index) => (
                  <div key={`item-term-${index}`} className="card-inset p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[var(--navy)]">Item Term {index + 1}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setContent((prev) => ({
                            ...prev,
                            itemTerms: prev.itemTerms.filter((_, i) => i !== index),
                          }))
                        }
                        disabled={content.itemTerms.length <= 1}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    </div>

                    <Textarea
                      rows={4}
                      value={term}
                      onChange={(e) => updateItemTerm(index, e.target.value)}
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setContent((prev) => ({
                      ...prev,
                      itemTerms: [...prev.itemTerms, ""],
                    }))
                  }
                >
                  <Plus size={14} /> Add Item Term
                </Button>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button type="button" onClick={onSave} disabled={isPending}>
                  <Save size={15} /> {isPending ? "Saving..." : "Save Item Booking Terms"}
                </Button>
                {saved && <span className="text-sm text-success font-medium">Saved successfully.</span>}
              </div>
            </div>
          )}

        </div>
      </Card>
    </div>
  );
}
