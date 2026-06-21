"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Landmark, ShieldCheck, AlertTriangle } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export interface LedgerData {
  /** Accumulated cash commissions from gate cash sessions (oto_cash_tally) */
  cashTally: number;
  /** Active escrow amount still held (oto_escrow where status=ESCROWED) */
  escrowActive: number;
  /** Number of completed escrow releases */
  escrowReleased: number;
  /** Open debts from unreconciled cash sessions (oto_debts) */
  openDebts: number;
}

interface LedgerPanelProps {
  data: LedgerData;
}

export default function LedgerPanel({ data }: LedgerPanelProps) {
  const T = useTheme();
  return (
    <div
      className="absolute top-3 left-3 z-40 pointer-events-none"
      style={{ width: 232 }}
    >
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          backdropFilter: "blur(16px)",
          overflow: "hidden",
          boxShadow: "0 4px 24px oklch(0 0 0 / 0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 12px 7px",
            borderBottom: `1px solid ${T.borderSubtle}`,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: 1,
              background: T.accent,
              boxShadow: "0 0 6px 1px rgba(203,255,0,0.45)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: T.textMuted,
            }}
          >
            Ledger Tables
          </span>
        </div>

        {/* Rows */}
        <div style={{ padding: "4px 0 4px" }}>
          <LedgerRow
            icon={<Landmark style={{ width: 12, height: 12 }} />}
            label="Cash Tally"
            value={data.cashTally}
            color={T.green}
            textMuted={T.textMuted}
            textDim={T.textDim}
            subtitle="oto_cash_tally"
          />
          <LedgerRow
            icon={<ShieldCheck style={{ width: 12, height: 12 }} />}
            label="Escrow Active"
            value={data.escrowActive}
            color={T.escrow}
            textMuted={T.textMuted}
            textDim={T.textDim}
            subtitle={`oto_escrow · ${data.escrowReleased} released`}
          />
          <LedgerRow
            icon={<AlertTriangle style={{ width: 12, height: 12 }} />}
            label="Open Debts"
            value={data.openDebts}
            color={T.red}
            textMuted={T.textMuted}
            textDim={T.textDim}
            subtitle="oto_debts"
          />
        </div>
      </div>
    </div>
  );
}

function LedgerRow({
  icon,
  label,
  value,
  color,
  textMuted,
  textDim,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  textMuted: string;
  textDim: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 12px",
      }}
    >
      <span
        style={{
          color: value > 0 ? color : textDim,
          flexShrink: 0,
          display: "flex",
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: textMuted,
            }}
          >
            {label}
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={value}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.25 }}
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "monospace",
                color: value > 0 ? color : textDim,
                marginLeft: "auto",
                flexShrink: 0,
              }}
            >
              {value.toFixed(1)} MAD
            </motion.span>
          </AnimatePresence>
        </div>
        <div
          style={{
            fontSize: 7.5,
            fontFamily: "monospace",
            color: textDim,
            letterSpacing: "0.04em",
            marginTop: 1,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
