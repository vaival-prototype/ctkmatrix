import { Sparkles } from "lucide-react";

// Dims/blurs wrapped content and centers a "Coming Soon" pill over it — content stays in
// the DOM (so layout/height is unaffected) but is non-interactive.
export default function ComingSoon({ children, className = "" }) {
  return (
    <div className="relative">
      <div className={`pointer-events-none select-none opacity-30 blur-[1.5px] ${className}`}>{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-warning/50 bg-background/95 px-4 py-1.5 text-sm font-semibold text-warning shadow-md">
          <Sparkles className="h-4 w-4" /> Coming Soon
        </div>
      </div>
    </div>
  );
}
