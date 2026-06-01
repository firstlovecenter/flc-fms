import { cn } from "@/lib/utils";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "full";

const maxWidthClass: Record<MaxWidth, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

export default function PageContainer({
  children,
  className,
  maxWidth = "xl",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: MaxWidth;
  as?: "div" | "main" | "section";
}) {
  return (
    <Tag
      className={cn(
        "w-full mx-auto min-w-0 px-4 md:px-8",
        maxWidthClass[maxWidth],
        className
      )}
    >
      {children}
    </Tag>
  );
}
