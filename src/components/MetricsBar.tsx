"use client";

import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import type { MetricCard } from "@/types/financial";
import { TrendingUp, Wallet, ShieldCheck, Building2 } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";

interface MetricsBarProps {
  metrics: MetricCard[];
}

const ICONS: Record<string, React.ReactNode> = {
  circulation: <TrendingUp style={{ width: 12, height: 12 }} />,
  commission: <Wallet style={{ width: 12, height: 12 }} />,
  escrow: <ShieldCheck style={{ width: 12, height: 12 }} />,
  lotRevenue: <Building2 style={{ width: 12, height: 12 }} />,
};

function MetricCell({
  metric,
  delay,
  isLast,
}: {
  metric: MetricCard;
  delay: number;
  isLast: boolean;
}) {
  const T = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "10px 12px",
        borderRight: isLast ? "none" : `1px solid ${T.borderSubtle}`,
        background: hovered ? T.card : "transparent",
        transition: "background 0.18s ease",
      }}
    >
      {/* Icon */}
      <span
        style={{
          color: metric.color,
          display: "flex",
          marginBottom: 4,
        }}
      >
        {ICONS[metric.key]}
      </span>

      {/* Label */}
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 7,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.textMuted,
          marginBottom: 4,
          whiteSpace: "nowrap",
        }}
      >
        {metric.label}
      </div>

      {/* Value + unit */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "monospace",
            color: metric.color,
            lineHeight: 1,
          }}
        >
          <NumberFlow
            value={metric.value}
            format={{
              style: "decimal",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }}
            animated={true}
            respectMotionPreference={false}
          />
        </span>
        <span
          style={{
            fontSize: 8,
            fontFamily: "monospace",
            color: T.textDim,
            fontWeight: 600,
          }}
        >
          MAD
        </span>
      </div>
    </motion.div>
  );
}

export default function MetricsBar({ metrics }: MetricsBarProps) {
  const T = useTheme();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        padding: "0",
        flexShrink: 0,
        borderBottom: `1px solid ${T.borderSubtle}`,
      }}
    >
      {metrics.map((metric, i) => (
        <MetricCell
          key={metric.key}
          metric={metric}
          delay={i * 0.06}
          isLast={i === metrics.length - 1}
        />
      ))}
    </div>
  );
}
