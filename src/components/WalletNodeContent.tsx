"use client";

import { motion, AnimatePresence } from "framer-motion";
import NumberFlow from "@number-flow/react";
import {
  User,
  Percent,
  Lock,
  Store,
  Receipt,
  Banknote,
  UserCheck,
} from "lucide-react";
import { Handle, Position } from "@xyflow/react";
import type { WalletState } from "@/types/financial";
import { useTheme } from "@/hooks/useTheme";

interface WalletNodeContentProps {
  wallet: WalletState;
  isActive: boolean;
  formatMAD: (n: number) => string;
}

/* ── Per-wallet identity ────────────────────────────────────────────────── */

const WALLET_META: Record<
  string,
  { Icon: React.ElementType; role: string; description: string }
> = {
  driver: {
    Icon: User,
    role: "Spendable",
    description: "Driver pre-paid credits",
  },
  commission: {
    Icon: Percent,
    role: "Earned",
    description: "Platform fee share",
  },
  settlement: {
    Icon: Lock,
    role: "Escrowed",
    description: "Held until session ends",
  },
  lot: {
    Icon: Store,
    role: "Revenue",
    description: "Merchant payout account",
  },
  "cash-tracker": {
    Icon: Receipt,
    role: "Cash Owed",
    description: "Agent cash commissions — netted at month-end",
  },
  "agent-cash": {
    Icon: Banknote,
    role: "In Hand",
    description: "Physical cash held by agents during shift",
  },
  "manager-cash": {
    Icon: UserCheck,
    role: "Collected",
    description: "Cash transferred from agents to manager",
  },
};

/* ── Hidden handle style (ReactFlow edge routing) ──────────────────────── */

const hiddenHandle = {
  visibility: "hidden" as const,
  width: 1,
  height: 1,
  top: "50%",
  background: "transparent",
  border: "none",
};

/* ── Component ─────────────────────────────────────────────────────────── */

export default function WalletNodeContent({
  wallet,
  isActive,
  formatMAD,
}: WalletNodeContentProps) {
  const T = useTheme();
  const isSettlement = wallet.id === "settlement";
  const displayBalance = isSettlement ? wallet.blocked : wallet.balance;
  const prevDisplayBalance = isSettlement
    ? wallet.previousBlocked
    : wallet.previousBalance;
  const changed = displayBalance !== prevDisplayBalance;
  const delta = displayBalance - prevDisplayBalance;
  const deltaSign = delta > 0 ? "+" : "";
  const deltaColor = delta > 0 ? T.green : delta < 0 ? T.red : "transparent";

  /* Use a readable color for the very-dark lot wallet */
  const accentColor = wallet.id === "lot" ? "#1D9E75" : wallet.color;

  const meta = WALLET_META[wallet.id] ?? {
    Icon: User,
    role: "Wallet",
    description: "",
  };
  const { Icon, role, description } = meta;

  return (
    <div
      style={{
        position: "relative",
        width: 240,
        background: isActive ? T.cardHover : T.card,
        border: `1px solid ${isActive ? accentColor + "55" : T.border}`,
        borderRadius: 16,
        overflow: "hidden",
        padding: "16px 18px 14px",
        cursor: "default",
        boxShadow: isActive
          ? `inset 0 1px 0 oklch(0.55 0.06 178 / 0.25), 0 0 0 1px ${accentColor}18, 0 8px 32px oklch(0 0 0 / 0.65), 0 2px 8px oklch(0 0 0 / 0.4)`
          : `inset 0 1px 0 oklch(0.45 0.05 178 / 0.18), 0 8px 32px oklch(0 0 0 / 0.6), 0 2px 8px oklch(0 0 0 / 0.35)`,
        transition:
          "border-color 350ms ease, box-shadow 350ms ease, background 350ms ease",
      }}
    >
      {/* ReactFlow edge handles — hidden but required */}
      <Handle
        type="source"
        position={Position.Top}
        id="t-out"
        style={hiddenHandle}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="t-in"
        style={hiddenHandle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b-out"
        style={hiddenHandle}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="b-in"
        style={hiddenHandle}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="l-out"
        style={hiddenHandle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="l"
        style={hiddenHandle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="r"
        style={hiddenHandle}
      />

      {/* Active shimmer sweep */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="shimmer"
            initial={{ x: "-110%" }}
            animate={{ x: "110%" }}
            transition={{
              duration: 1.1,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 3.2,
            }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 16,
              pointerEvents: "none",
              background: `linear-gradient(105deg, transparent 25%, ${accentColor}20 50%, transparent 75%)`,
              zIndex: 1,
            }}
          />
        )}
      </AnimatePresence>

      {/* Delta floating badge */}
      <AnimatePresence mode="wait">
        {changed && delta !== 0 && (
          <motion.div
            className="wallet-node-delta"
            style={{
              color: deltaColor,
              borderColor: deltaColor + "30",
              background: T.bg,
            }}
            initial={{ opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            {deltaSign}
            {formatMAD(Math.abs(delta))} MAD
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header row: icon + role badge ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        {/* Icon circle */}
        <motion.div
          animate={{
            background: isActive ? accentColor + "22" : T.card,
            borderColor: isActive ? accentColor + "50" : T.border,
          }}
          transition={{ duration: 0.35 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            border: "1px solid",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon
            style={{
              width: 17,
              height: 17,
              color: isActive ? accentColor : T.textMuted,
              transition: "color 350ms ease",
            }}
          />
        </motion.div>

        {/* Role badge */}
        <span
          style={{
            fontSize: 7.5,
            fontFamily: "monospace",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: isActive ? accentColor : T.textMuted,
            background: isActive ? accentColor + "14" : T.card,
            border: `1px solid ${isActive ? accentColor + "30" : T.border}`,
            padding: "2px 7px",
            borderRadius: 20,
            transition: "all 350ms ease",
          }}
        >
          {role}
        </span>
      </div>

      {/* ── Wallet name ── */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: isActive ? T.text : T.textMuted,
          letterSpacing: "0.01em",
          marginBottom: 3,
          transition: "color 350ms ease",
        }}
      >
        {wallet.label}
      </div>

      {/* ── Description / role context ── */}
      <div
        style={{
          fontSize: 9,
          color: T.textMuted,
          marginBottom: 12,
          lineHeight: 1.4,
        }}
      >
        {description}
      </div>

      {/* ── Divider ── */}
      <div
        style={{
          height: 1,
          background: isActive
            ? `linear-gradient(90deg, ${accentColor}30, transparent)`
            : T.border,
          marginBottom: 10,
          transition: "background 350ms ease",
        }}
      />

      {/* ── Balance row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        {/* Label */}
        <span
          style={{
            fontSize: 8,
            fontFamily: "monospace",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: isSettlement ? T.escrow : T.textMuted,
          }}
        >
          {isSettlement ? "Blocked" : "Available"}
        </span>

        {/* Animated amount */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 26,
            fontWeight: 700,
            color: accentColor,
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          <NumberFlow
            value={displayBalance}
            format={{
              style: "decimal",
              minimumFractionDigits: 1,
              maximumFractionDigits: 2,
            }}
            suffix=" MAD"
            animated={true}
            respectMotionPreference={false}
          />
        </div>
      </div>

      {/* ── DB table name ── */}
      {wallet.subtitle && (
        <div
          style={{
            fontSize: 7.5,
            fontFamily: "monospace",
            color: T.textDim,
            letterSpacing: "0.05em",
            marginTop: 5,
            textAlign: "right",
          }}
        >
          {wallet.subtitle.split("·")[1]?.trim() ?? wallet.subtitle}
        </div>
      )}
    </div>
  );
}
