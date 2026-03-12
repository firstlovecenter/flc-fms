"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Layers, Tag, ShoppingCart, ChevronDown, ChevronUp, ArrowRight, X, Plus, Minus } from "lucide-react";

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
        <div
          className="fixed bottom-6 right-6 z-50"
          style={{ filter: "drop-shadow(0 8px 24px rgba(10,22,40,0.22))" }}
        >
          {showCart ? (
            <div
              className="rounded-2xl overflow-hidden w-80"
              style={{ background: "var(--white)", border: "1px solid var(--border)" }}
            >
              {/* Cart header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ background: "var(--navy)", color: "#fff" }}
              >
                <span className="font-semibold flex items-center gap-2">
                  <ShoppingCart size={16} /> Your Selection
                </span>
                <button onClick={() => setShowCart(false)} className="opacity-70 hover:opacity-100">
                  <ChevronDown size={18} />
                </button>
              </div>
              {/* Lines */}
              <div className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
                {cart.map(line => (
                  <div key={line.id} className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--slate)]">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--navy)] truncate">{line.name}</p>
                      <p className="text-[var(--muted)]">GHS {line.unitPrice.toFixed(2)} / {line.unit}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(line.id, line.type, -1)}
                        className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                      ><Minus size={12} /></button>
                      <span className="w-6 text-center font-bold">{line.qty}</span>
                      <button
                        onClick={() => updateQty(line.id, line.type, 1)}
                        className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                      ><Plus size={12} /></button>
                    </div>
                    <button
                      onClick={() => updateQty(line.id, line.type, -line.qty)}
                      className="text-[var(--muted)] hover:text-red-500"
                    ><X size={14} /></button>
                  </div>
                ))}
              </div>
              {/* Total + CTA */}
              <div className="px-4 py-3 border-t border-[var(--border)]">
                <div className="flex justify-between text-sm font-semibold mb-3">
                  <span>Total estimate</span>
                  <span style={{ color: "var(--navy)" }}>GHS {total.toFixed(2)}</span>
                </div>
                <Link
                  href={bookUrl}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-sm"
                  style={{ background: "var(--gold)", color: "var(--navy)" }}
                >
                  Book Now <ArrowRight size={15} />
                </Link>
                <p className="text-center text-xs text-[var(--muted)] mt-2">
                  Final price confirmed by staff after submission
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm shadow-lg"
              style={{ background: "var(--navy)", color: "#fff" }}
            >
              <ShoppingCart size={16} />
              {cart.reduce((s, l) => s + l.qty, 0)} item{cart.reduce((s, l) => s + l.qty, 0) !== 1 ? "s" : ""}
              <span style={{ color: "var(--gold)" }}>• GHS {total.toFixed(2)}</span>
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
    <div
      className="rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5"
      style={{ background: "var(--white)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(10,22,40,0.05)" }}
    >
      {img ? (
        <img src={img} alt={item.name} className="w-full h-40 object-cover" />
      ) : (
        <div
          className="w-full h-40 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(10,22,40,0.05) 0%, rgba(200,163,90,0.08) 100%)" }}
        >
          <Package size={36} style={{ color: "var(--gold)" }} />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[var(--navy)] text-base leading-snug">{item.name}</h3>
          <span
            className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(200,163,90,0.12)", color: "var(--navy)", border: "1px solid rgba(200,163,90,0.3)" }}
          >
            {item.quantity} avail.
          </span>
        </div>
        {item.description && (
          <p className="text-sm text-[var(--slate)] leading-relaxed line-clamp-2">{item.description}</p>
        )}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {item.tags.slice(0, 3).map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--cream)", color: "var(--muted)" }}>
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
          <div>
            <span className="font-bold text-[var(--navy)] text-lg">GHS {Number(item.pricePerUnit).toFixed(2)}</span>
            <span className="text-xs text-[var(--muted)] ml-1">/ {item.unit}</span>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            style={{ background: "var(--navy)", color: "#fff" }}
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>
    </div>
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
    <div
      className="rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5"
      style={{ background: "var(--white)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(10,22,40,0.05)" }}
    >
      {img ? (
        <img src={img} alt={bundle.name} className="w-full h-44 object-cover" />
      ) : (
        <div
          className="w-full h-44 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(10,22,40,0.06) 0%, rgba(200,163,90,0.1) 100%)" }}
        >
          <Layers size={40} style={{ color: "var(--gold)" }} />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Badge */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(200,163,90,0.15)", color: "var(--navy)", border: "1px solid rgba(200,163,90,0.35)" }}
          >
            <Layers size={10} className="inline mr-1" />Package
          </span>
          {bundle.tags.slice(0, 2).map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--cream)", color: "var(--muted)" }}>
              {t}
            </span>
          ))}
        </div>

        <div>
          <h3 className="font-bold text-[var(--navy)] text-lg leading-snug">{bundle.name}</h3>
          {bundle.tagline && <p className="text-sm font-medium" style={{ color: "var(--gold)" }}>{bundle.tagline}</p>}
          {bundle.description && (
            <p className="text-sm text-[var(--slate)] mt-1 leading-relaxed">{bundle.description}</p>
          )}
        </div>

        {/* Components toggle */}
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: "var(--navy)" }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {bundle.components.length} item{bundle.components.length !== 1 ? "s" : ""} included
        </button>

        {expanded && (
          <ul className="space-y-1.5 text-sm pl-1">
            {bundle.components.map(c => (
              <li key={c.id} className="flex items-center gap-2" style={{ color: "var(--slate)" }}>
                <span
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0"
                  style={{ background: "var(--cream)", color: "var(--navy)" }}
                >
                  {c.quantity}
                </span>
                <span>{c.label ?? c.item.name}</span>
                <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>({c.item.unit})</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border)]">
          <div>
            <span className="font-bold text-[var(--navy)] text-xl">GHS {Number(bundle.price).toFixed(2)}</span>
            <span className="text-xs text-[var(--muted)] ml-1">flat rate</span>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            style={{ background: "var(--navy)", color: "#fff" }}
          >
            <ShoppingCart size={14} /> Select
          </button>
        </div>
      </div>
    </div>
  );
}
