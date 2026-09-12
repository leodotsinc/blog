import { cn } from "@/lib/utils";

export default function SectionLabel({
  index,
  children,
  className,
}: {
  index: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <span className="font-mono text-xs tabular-nums text-glow-1">{index}</span>
      <span className="h-px w-8 bg-gradient-to-r from-glow-1 to-transparent" />
      <span className="font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}
