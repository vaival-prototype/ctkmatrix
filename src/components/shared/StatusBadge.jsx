import { cn } from "@/utils/cn";

const variantMap = {
  default: "bg-primary/10 text-primary",
  success: "bg-accent/15 text-accent",
  warning: "bg-warning/20 text-warning-foreground",
  info: "bg-info/15 text-info",
  danger: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

const dotMap = {
  default: "bg-primary",
  success: "bg-accent",
  warning: "bg-warning",
  info: "bg-info",
  danger: "bg-destructive",
  muted: "bg-muted-foreground",
};

export default function StatusBadge({ variant = "default", children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantMap[variant]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotMap[variant])} />
      {children}
    </span>
  );
}
