"use client";

import { CheckCircle2 } from "lucide-react";

export default function StatusBar() {
  return (
    <footer className="flex items-center justify-between px-5 shrink-0 border-t border-border bg-sidebar h-7">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
          <CheckCircle2 className="size-3 text-otopark-success" />
          Ready
        </span>
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          10 modules available
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          OtoParking Test Center
        </span>
      </div>
    </footer>
  );
}
