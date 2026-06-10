"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Layers, ShoppingCart, ChevronDown, ChevronUp, ArrowRight, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type BookableItem = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  pricePerUnit: string;
  quantity: number;
  images: string[];
  tags: string[];
};

type BundleComponent = {
  id: string;
  quantity: number;
  label: string | null;
  item: BookableItem;
};

type BookableBundle = {
  id: string;
  name: string;
  description: string | null;
  tagline: string | null;
  price: string;
  images: string[];
  tags: string[];
  components: BundleComponent[];
};

type CartLine = {
  type: "item" | "bundle";
  id: string;
  name: string;
  unitPrice: number;
  unit: string;
  qty: number;
};

export default function ItemsCatalogClient({
  items,
  bundles,
  mode,
}: {
  items: BookableItem[];
  bundles: BookableBundle[];
  mode: "items" | "packages";
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  function addToCart(type: "item" | "bundle", id: string, name: string, unitPrice: number, unit: string) {
    setCart(prev => {
      const existing = prev.find(l => l.id === id && l.type === type);
      if (existing) return prev.map(l => l.id === id && l.type === type ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { type, id, name, unitPrice, unit, qty: 1 }];
    });
    setShowCart(true);
  }

  function updateQty(id: string, type: "item" | "bundle", delta: number) {
    setCart(prev => prev
      .map(l => l.id === id && l.type === type ? { ...l, qty: l.qty + delta } : l)
      .filter(l => l.qty > 0)
    );
  }

  const total = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const cartParams = cart.map(l => `${l.type === "item" ? "item" : "bundle"}=${l.id}:${l.qty}`).join(",");
  const bookUrl = `/guest/book?type=items&lines=${encodeURIComponent(cartParams)}`;

  return (
    <div className="space-y-4">
      {/* Items grid */}
      {mode === "items" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onAdd={() => addToCart("item", item.id, item.name, Number(item.pricePerUnit), item.unit)}
            />
          ))}
        </div>
      )}

      {/* Bundles grid */}
      {mode === "packages" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger-children">
          {bundles.map(bundle => (
            <BundleCard
              key={bundle.id}
              bundle={bundle}
              expanded={expanded === bundle.id}
              onToggleExpand={() => setExpanded(prev => prev === bundle.id ? null : bundle.id)}
              onAdd={() => addToCart("bundle", bundle.id, bundle.name, Number(bundle.price), "package")}
            />
          ))}
        </div>
      )}

      {/* Floating Cart */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto z-50 [filter:drop-shadow(0_8px_24px_rgba(10,22,40,0.22))]">
          {showCart ? (
            <Card className="rounded-2xl overflow-hidden w-full sm:w-80 p-0">
              {/* Cart header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--navy)] text-white">
                <span className="font-semibold flex items-center gap-2">
                  <ShoppingCart size={16} /> Your Selection
                </span>
                <button onClick={() => setShowCart(false)} aria-label="Collapse cart" className="opacity-70 hover:opacity-100">
                  <ChevronDown size={18} />
                </button>
              </div>
              {/* Lines */}
              <div className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
                {cart.map(line => (
                  <div key={line.id} className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--slate)]">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)] truncate">{line.name}</p>
                      <p className="text-[var(--text-muted)]">GH₵{line.unitPrice.toFixed(2)} / {line.unit}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(line.id, line.type, -1)}
                        aria-label={`Decrease quantity of ${line.name}`}
                        className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                      ><Minus size={12} /></button>
                      <span className="w-6 text-center font-bold">{line.qty}</span>
                      <button
                        onClick={() => updateQty(line.id, line.type, 1)}
                        aria-label={`Increase quantity of ${line.name}`}
                        className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                      ><Plus size={12} /></button>
                    </div>
                    <button
                      onClick={() => updateQty(line.id, line.type, -line.qty)}
                      aria-label={`Remove ${line.name} from cart`}
                      className="text-[var(--text-muted)] hover:text-danger"
                    ><X size={14} /></button>
                  </div>
                ))}
              </div>
              {/* Total + CTA */}
              <div className="px-4 py-3 border-t border-[var(--border)]">
                <div className="flex justify-between text-sm font-semibold mb-3">
                  <span>Total estimate</span>
                  <span className="text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)]">GH₵{total.toFixed(2)}</span>
                </div>
                <Link href={bookUrl} className={cn(buttonVariants({ variant: "gold" }), "w-full gap-2")}>
                  Book Now <ArrowRight size={15} />
                </Link>
                <p className="text-center text-xs text-[var(--text-muted)] mt-2">
                  Final price confirmed by staff after submission
                </p>
              </div>
            </Card>
          ) : (
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm shadow-lg bg-[var(--navy)] text-white hover:bg-[var(--navy-mid)] transition-colors"
            >
              <ShoppingCart size={16} />
              {cart.reduce((s, l) => s + l.qty, 0)} item{cart.reduce((s, l) => s + l.qty, 0) !== 1 ? "s" : ""}
              <span className="text-[var(--gold)]">• GH₵{total.toFixed(2)}</span>
              <ChevronUp size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({ item, onAdd }: { item: BookableItem; onAdd: () => void }) {
  const img = item.images[0];
  return (
    <Card className="rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 p-0">
      {img ? (
        <img src={img} alt={item.name} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 flex items-center justify-center bg-gradient-to-br from-[rgba(10,22,40,0.05)] to-[rgba(200,163,90,0.08)] dark:from-[rgba(200,163,90,0.05)] dark:to-[rgba(200,163,90,0.12)]">
          <Package size={36} className="text-[var(--gold)]" />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)] text-base leading-snug">{item.name}</h3>
          <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-[rgba(200,163,90,0.12)] text-[var(--navy)] border border-[rgba(200,163,90,0.3)]">
            {item.quantity} avail.
          </span>
        </div>
        {item.description && (
          <p className="text-sm text-[var(--slate)] leading-relaxed line-clamp-2">{item.description}</p>
        )}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {item.tags.slice(0, 3).map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[var(--cream)] dark:bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)]">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 pt-2 border-t border-[var(--border)]">
          <div>
            <span className="font-bold text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)] text-lg">GH₵{Number(item.pricePerUnit).toFixed(2)}</span>
            <span className="text-xs text-[var(--text-muted)] ml-1">/ {item.unit}</span>
          </div>
          <Button
            size="sm"
            onClick={onAdd}
            className="w-full sm:w-auto"
          >
            <Plus size={13} /> Add
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── Bundle card ───────────────────────────────────────────────────────────────

function BundleCard({
  bundle,
  expanded,
  onToggleExpand,
  onAdd,
}: {
  bundle: BookableBundle;
  expanded: boolean;
  onToggleExpand: () => void;
  onAdd: () => void;
}) {
  const img = bundle.images[0];
  return (
    <Card className="rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 p-0">
      {img ? (
        <img src={img} alt={bundle.name} className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 flex items-center justify-center bg-gradient-to-br from-[rgba(10,22,40,0.06)] to-[rgba(200,163,90,0.1)] dark:from-[rgba(200,163,90,0.05)] dark:to-[rgba(200,163,90,0.15)]">
          <Layers size={40} className="text-[var(--gold)]" />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[rgba(200,163,90,0.15)] text-[var(--navy)] dark:text-[rgba(232,238,248,0.85)] border border-[rgba(200,163,90,0.35)]">
            <Layers size={10} className="inline mr-1" />Package
          </span>
          {bundle.tags.slice(0, 2).map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[var(--cream)] dark:bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)]">
              {t}
            </span>
          ))}
        </div>

        <div>
          <h3 className="font-bold text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)] text-lg leading-snug">{bundle.name}</h3>
          {bundle.tagline && <p className="text-sm font-medium text-[var(--gold)]">{bundle.tagline}</p>}
          {bundle.description && (
            <p className="text-sm text-[var(--slate)] mt-1 leading-relaxed">{bundle.description}</p>
          )}
        </div>

        {/* Components toggle */}
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--navy)] dark:text-[rgba(232,238,248,0.8)] hover:text-[var(--gold)] transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {bundle.components.length} item{bundle.components.length !== 1 ? "s" : ""} included
        </button>

        {expanded && (
          <ul className="space-y-1.5 text-sm pl-1">
            {bundle.components.map(c => (
              <li key={c.id} className="flex items-center gap-2 text-[var(--slate)]">
                <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0 bg-[var(--cream)] dark:bg-[rgba(255,255,255,0.08)] text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)]">
                  {c.quantity}
                </span>
                <span>{c.label ?? c.item.name}</span>
                <span className="ml-auto text-xs text-[var(--text-muted)]">({c.item.unit})</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-auto pt-3 border-t border-[var(--border)]">
          <div>
            <span className="font-bold text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)] text-xl">GH₵{Number(bundle.price).toFixed(2)}</span>
            <span className="text-xs text-[var(--text-muted)] ml-1">flat rate</span>
          </div>
          <Button
            onClick={onAdd}
            size="sm"
            className="w-full sm:w-auto"
          >
            <ShoppingCart size={14} /> Select
          </Button>
        </div>
      </div>
    </Card>
  );
}
