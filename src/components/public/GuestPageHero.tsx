import { cn } from "@/lib/utils";

export default function GuestPageHero({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--r-lg)] border relative overflow-hidden p-6 md:p-7",
        "bg-gradient-to-br from-[var(--navy)] to-[var(--navy-mid)]",
        "dark:from-[rgba(15,26,43,0.65)] dark:to-[rgba(15,26,43,0.45)] dark:backdrop-blur-xl",
        "border-[rgba(255,66,102,0.34)] dark:border-[var(--border)] shadow-lg text-[#fff]",
        className
      )}
    >
      <p className="text-eyebrow text-[#fff]/65 mb-2">{eyebrow}</p>
      <h1 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1]">{title}</h1>
      <p className="text-body-sm text-[#fff]/75 mt-2 max-w-[700px]">{description}</p>
      {children && <div className="flex flex-wrap gap-2 mt-4">{children}</div>}
    </section>
  );
}
