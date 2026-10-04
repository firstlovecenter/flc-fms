import { cn } from "@/lib/utils";

type CommonProps = {
  title: string;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Actions rendered under the copy, centered. */
  children?: React.ReactNode;
  className?: string;
};

type PhotoProps = CommonProps & {
  variant: "photo";
  image: string;
  /** CSS object-position, e.g. "50% 35%", to keep the subject in frame. */
  focalPoint?: string;
};

type PlainProps = CommonProps & {
  variant?: "plain";
  image?: never;
  focalPoint?: never;
};

export type VisitorHeroProps = PhotoProps | PlainProps;

/**
 * Visitor-facing page hero. `photo` is the full-bleed landing treatment —
 * photography carries the page and a dark scrim keeps the type legible at any
 * crop. `plain` is the quieter interior-page treatment: white panel, pill
 * eyebrow, charcoal type.
 */
export default function VisitorHero(props: VisitorHeroProps) {
  const { title, subtitle, eyebrow, children, className } = props;

  if (props.variant === "photo") {
    return (
      <section
        className={cn(
          // Fills the viewport below the sticky header so the photography
          // carries the first screen, as on anagkazo-campus.com.
          "relative flex min-h-[86dvh] items-center overflow-hidden border-b border-[var(--border)]",
          className
        )}
      >
        <div className="absolute inset-0">
          <img
            src={props.image}
            alt=""
            aria-hidden
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: props.focalPoint ?? "50% 50%" }}
          />
          {/* Scrim is strongest at the bottom where the copy sits. */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20"
            aria-hidden
          />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-5 py-24 text-center">
          {eyebrow && (
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--gold-bright)] drop-shadow">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display mx-auto max-w-3xl text-4xl font-bold leading-tight text-[#fff] drop-shadow-lg sm:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[rgba(255,255,255,0.9)] drop-shadow-sm sm:text-lg">
              {subtitle}
            </p>
          )}
          {children && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {children}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "border-b border-[var(--border)] bg-[var(--surface)]",
        className
      )}
    >
      <div className="mx-auto max-w-5xl px-5 py-12 text-center sm:py-16">
        {eyebrow && (
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--gold-hsl)/0.1)] px-3 py-1.5 text-xs font-semibold text-[var(--gold-muted)]">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl font-bold text-[var(--navy)] sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-[var(--text-muted)]">
            {subtitle}
          </p>
        )}
        {children && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
