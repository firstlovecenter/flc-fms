"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import type { BookingContentPayload } from "@/lib/booking-content-defaults";
import { updateBookingContent } from "@/actions/booking-content.actions";

type Props = {
  initialContent: BookingContentPayload;
};

export default function BookingContentEditor({ initialContent }: Props) {
  const [content, setContent] = useState<BookingContentPayload>(initialContent);
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

      <section className="card p-5 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--navy)]">Booking Terms Section</h2>
          <p className="text-xs text-[var(--muted)]">This controls the terms shown on venue booking forms.</p>
        </div>

        <div>
          <label className="label">Section Title</label>
          <input
            className="input"
            value={content.bookingTermsTitle}
            onChange={(e) => setContent((prev) => ({ ...prev, bookingTermsTitle: e.target.value }))}
          />
        </div>

        <div>
          <label className="label">Section Intro</label>
          <textarea
            className="input"
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
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() =>
                    setContent((prev) => ({
                      ...prev,
                      bookingTerms: prev.bookingTerms.filter((_, i) => i !== index),
                    }))
                  }
                  disabled={content.bookingTerms.length <= 1}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>

              <div>
                <label className="label">Title</label>
                <input className="input" value={term.title} onChange={(e) => updateTerm(index, "title", e.target.value)} />
              </div>

              <div>
                <label className="label">Body</label>
                <textarea className="input" rows={3} value={term.body ?? ""} onChange={(e) => updateTerm(index, "body", e.target.value)} />
              </div>

              <div>
                <label className="label">Bullets (one per line)</label>
                <textarea
                  className="input"
                  rows={4}
                  value={(term.bullets ?? []).join("\n")}
                  onChange={(e) => updateTermBullets(index, e.target.value)}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setContent((prev) => ({
                ...prev,
                bookingTerms: [...prev.bookingTerms, { title: "", body: "", bullets: [] }],
              }))
            }
          >
            <Plus size={14} /> Add Booking Term
          </button>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--navy)]">FAQ Section</h2>
          <p className="text-xs text-[var(--muted)]">This controls the content of the public FAQ page.</p>
        </div>

        <div>
          <label className="label">FAQ Title</label>
          <input
            className="input"
            value={content.bookingFaqTitle}
            onChange={(e) => setContent((prev) => ({ ...prev, bookingFaqTitle: e.target.value }))}
          />
        </div>

        <div className="space-y-3">
          {content.bookingFaq.map((faq, index) => (
            <div key={`faq-${index}`} className="card-inset p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-[var(--navy)]">FAQ {index + 1}</p>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() =>
                    setContent((prev) => ({
                      ...prev,
                      bookingFaq: prev.bookingFaq.filter((_, i) => i !== index),
                    }))
                  }
                  disabled={content.bookingFaq.length <= 1}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>

              <div>
                <label className="label">Question</label>
                <input className="input" value={faq.question} onChange={(e) => updateFaq(index, "question", e.target.value)} />
              </div>

              <div>
                <label className="label">Answer</label>
                <textarea className="input" rows={3} value={faq.answer} onChange={(e) => updateFaq(index, "answer", e.target.value)} />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setContent((prev) => ({
                ...prev,
                bookingFaq: [...prev.bookingFaq, { question: "", answer: "" }],
              }))
            }
          >
            <Plus size={14} /> Add FAQ
          </button>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--navy)]">Item Booking Terms</h2>
          <p className="text-xs text-[var(--muted)]">This controls terms shown for item/package bookings.</p>
        </div>

        <div>
          <label className="label">Section Title</label>
          <input
            className="input"
            value={content.itemTermsTitle}
            onChange={(e) => setContent((prev) => ({ ...prev, itemTermsTitle: e.target.value }))}
          />
        </div>

        <div>
          <label className="label">Section Intro</label>
          <textarea
            className="input"
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
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() =>
                    setContent((prev) => ({
                      ...prev,
                      itemTerms: prev.itemTerms.filter((_, i) => i !== index),
                    }))
                  }
                  disabled={content.itemTerms.length <= 1}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>

              <textarea
                className="input"
                rows={4}
                value={term}
                onChange={(e) => updateItemTerm(index, e.target.value)}
              />
            </div>
          ))}

          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setContent((prev) => ({
                ...prev,
                itemTerms: [...prev.itemTerms, ""],
              }))
            }
          >
            <Plus size={14} /> Add Item Term
          </button>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="button" onClick={onSave} disabled={isPending} className="btn-primary">
          <Save size={15} /> {isPending ? "Saving..." : "Save Booking Content"}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Saved to Sanity successfully.</span>}
      </div>
    </div>
  );
}
