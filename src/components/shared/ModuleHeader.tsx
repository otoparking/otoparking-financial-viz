"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ModuleMeta } from "@/types/modules";
import { useTheme } from "@/hooks/useTheme";

interface ModuleHeaderProps {
  module: ModuleMeta;
  activity?: string | null;
}

export default function ModuleHeader({ module, activity }: ModuleHeaderProps) {
  const T = useTheme();

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Module icon — 32×32 rounded square */}
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: T.accentBg,
          border: `1px solid ${T.borderActive.replace(/55$/, "")}66`,
          color: T.accent,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          {module.icon}
        </span>
      </div>

      {/* Name + subtitle + PRD chip */}
      <div className="min-w-0 flex flex-col" style={{ gap: 1 }}>
        {/* Module name */}
        <div className="flex items-center" style={{ gap: 6 }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: T.text,
              textTransform: "uppercase",
              lineHeight: 1.2,
            }}
          >
            {module.headerLabel}
          </span>

          {/* PRD chip */}
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              color: T.textDim,
              background: T.isDark
                ? "oklch(0.18 0.04 183)"
                : "oklch(0.93 0.01 185)",
              border: `1px solid ${T.borderSubtle}`,
              padding: "1px 7px",
              borderRadius: 99,
              letterSpacing: "0.04em",
              lineHeight: 1.6,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {module.prdRef}
          </span>
        </div>

        {/* Subtitle */}
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            color: T.textDim,
            lineHeight: 1.3,
          }}
          className="truncate"
        >
          {module.subtitle}
        </span>
      </div>

      {/* Activity badge — animated, shown when activity is truthy */}
      <AnimatePresence>
        {activity && (
          <motion.div
            key="activity-badge"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="shrink-0 flex items-center overflow-hidden"
            style={{
              maxWidth: 220,
              background: T.isDark
                ? "oklch(0.16 0.06 130 / 0.8)"
                : "oklch(0.88 0.06 150 / 0.5)",
              border: `1px solid ${T.borderActive}`,
              borderLeft: `3px solid ${T.accent}`,
              borderRadius: 5,
              padding: "3px 8px 3px 6px",
              gap: 5,
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* Pulsing dot */}
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: T.accent,
                flexShrink: 0,
              }}
            />
            {/* Activity text */}
            <span
              className="truncate"
              style={{
                fontFamily: "monospace",
                fontSize: 9,
                fontWeight: 600,
                color: T.accent,
                letterSpacing: "0.04em",
                lineHeight: 1.4,
              }}
            >
              {activity}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
