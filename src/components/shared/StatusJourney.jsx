import { cn } from "@/utils/cn";

export default function StatusJourney({ steps, current }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-center">
        {steps.map((step, index) => {
          const active = index <= current;
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                    active
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>
                <div
                  className={cn(
                    "w-24 text-center text-[11px]",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mb-6 h-px w-10",
                    index < current ? "bg-accent" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
