import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Experience accents give orientation only — photography stays dominant. */
export type CategoryAccent = "host" | "stay" | "tours" | "celebrate";

const ACCENT_VAR: Record<CategoryAccent, string> = {
  host: "--accent-host",
  stay: "--accent-stay",
  tours: "--accent-tours",
  celebrate: "--accent-celebrate",
};

export type CategoryCardProps = {
  title: string;
  description: string;
  icon: React.ElementType;
  /** Omit to render a non-interactive "Coming soon" card. */
  href?: string;
  image?: string | null;
  imageAlt?: string;
  focalPoint?: string;
  accent?: CategoryAccent;
  /** Short count/meta shown over the image, e.g. "12 halls". */
  meta?: string;
  cta?: string;
};

export default function CategoryCard({
  title,
  description,
  icon: Icon,
  href,
  image,
  imageAlt,
  focalPoint,
  accent = "host",
  meta,
  cta = "Explore",
}: CategoryCardProps) {
  const accentVar = ACCENT_VAR[accent];

  const body = (
    <>
      <div className="relative flex h-44 items-center justify-center overflow-hidden bg-[var(--cream-dark)]">
        {image ? (
          <img
            src={image}
            alt={imageAlt ?? ""}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ objectPosition: focalPoint ?? "50% 50%" }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--cream-dark)] to-[var(--cream)]"
            aria-hidden
          >
            <Icon className="h-12 w-12 text-[var(--text-muted)] opacity-50" />
          </div>
        )}

        {meta && (
          <span className="absolute left-4 top-4 rounded-full bg-[rgba(0,0,0,0.6)] px-3 py-1 text-xs font-semibold text-[#fff] backdrop-blur-sm">
            {meta}
          </span>
        )}
        {!href && (
          <span className="absolute right-4 top-4 rounded-full bg-[rgba(0,0,0,0.78)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#fff]">
            Coming soon
          </span>
        )}
      </div>

      <div className="p-5">
        <div
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `hsl(var(${accentVar}) / 0.14)`,
            color: `hsl(var(${accentVar}))`,
          }}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 className="font-display text-lg font-bold text-[var(--navy)]">{title}</h3>
        {/* min-h keeps the CTA row on one baseline across the row of cards. */}
        <p className="mt-1.5 min-h-10 text-sm leading-relaxed text-[var(--text-muted)]">
          {description}
        </p>
        {href ? (
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--gold-muted)]">
            {cta}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </span>
        ) : (
          <span className="mt-5 inline-flex text-sm font-semibold text-[var(--text-muted)]">
            Coming soon
          </span>
        )}
      </div>
    </>
  );

  const shell =
    "overflow-hidden rounded-[var(--r-3xl)] border border-[var(--border)] bg-[var(--surface)] text-left shadow-[var(--shadow-sm)]";

  if (!href) {
    return (
      <article className={cn(shell, "opacity-80")} aria-label={`${title} — coming soon`}>
        {body}
      </article>
    );
  }

  return (
    <Link
      href={href}
      aria-label={`${title} — ${cta}`}
      className={cn(
        shell,
        "group block no-underline transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-[var(--border-dark)] hover:shadow-[var(--shadow-lg)]",
        "active:translate-y-0"
      )}
    >
      {body}
    </Link>
  );
}
