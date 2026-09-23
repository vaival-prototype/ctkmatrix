import { cn } from "@/utils/cn";

export default function Stepper({ steps, current }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const active = index <= current;
        return (
          <div key={step} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                active
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {index + 1}
            </div>
            <span
              className={cn(
                "truncate text-xs",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
