import {
  APP_VERSION,
  RELEASE_CHANNEL,
  COPYRIGHT_OWNER,
} from "@/constants/navigation";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/70 px-4 py-2 text-[11px] text-muted-foreground lg:px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span>
          &copy; 1997-2026 {COPYRIGHT_OWNER}. All rights reserved.
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/85">
          Claim Matrix {APP_VERSION} &middot; {RELEASE_CHANNEL}
        </span>
      </div>
    </footer>
  );
}
