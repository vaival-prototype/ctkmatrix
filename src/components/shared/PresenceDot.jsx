import { cn } from "@/utils/cn";

export default function PresenceDot({ status }) {
  const color = {
    online: "bg-accent",
    away: "bg-warning",
    offline: "bg-muted-foreground/45",
  }[status];

  return (
    <span className="flex items-center gap-1">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      <span className="sr-only">{status}</span>
    </span>
  );
}
