"use client";

import { memo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import NumberFlow from "@number-flow/react";
import type { CancellationResult, RefundTier } from "@/types/cancellation";
import {
  useReactFlowColorMode,
  useBackgroundDotColor,
} from "@/hooks/useColorMode";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
  Clock,
  Wallet,
  Building2,
  TrendingUp,
  Circle,
} from "lucide-react";

/* ── Props ───────────────────────────────────────────────────────────── */

interface CancellationCanvasProps {
  result: CancellationResult | null;
  hoursUntilStart: number;
}

/* ── Tier metadata ───────────────────────────────────────────────────── */

const TIER_META: Record<
  RefundTier,
  {
    label: string;
    percent: string;
    color: string;
    bg: string;
    border: string;
    glow: string;
    icon: React.ReactNode;
  }
> = {
  FULL: {
    label: "Full Refund",
    percent: "100%",
    color: "#1D9E75",
    bg: "oklch(0.17 0.04 155 / 0.5)",
    border: "rgba(29,158,117,0.45)",
    glow: "rgba(29,158,117,0.15)",
    icon: <CheckCircle2 className="size-4" />,
  },
  PARTIAL: {
    label: "Partial Refund",
    percent: "50%",
    color: "#F59E0B",
    bg: "oklch(0.17 0.05 65 / 0.4)",
    border: "rgba(245,158,11,0.45)",
    glow: "rgba(245,158,11,0.15)",
    icon: <AlertTriangle className="size-4" />,
  },
  NONE: {
    label: "No Refund",
    percent: "0%",
    color: "#EF4444",
    bg: "oklch(0.17 0.04 30 / 0.4)",
    border: "rgba(239,68,68,0.45)",
    glow: "rgba(239,68,68,0.15)",
    icon: <XCircle className="size-4" />,
  },
  CANNOT_CANCEL: {
    label: "Cannot Cancel",
    percent: "—",
    color: "#6B7280",
    bg: "oklch(0.15 0.02 185 / 0.45)",
    border: "rgba(107,114,128,0.4)",
    glow: "rgba(107,114,128,0.1)",
    icon: <Ban className="size-4" />,
  },
};

/* ── Node data types ─────────────────────────────────────────────────── */

type RootData = { active: boolean };
type DecisionData = { text: string; active: boolean };
type OutcomeData = {
  tier: RefundTier;
  label: string;
  subLabel: string;
  active: boolean;
};
type TreeEdgeData = { label: string; active: boolean };

/* ── Invisible handle style ─────────────────────────────────────────── */

const HS: React.CSSProperties = {
  width: 6,
  height: 6,
  background: "transparent",
  border: "none",
};

/* ── RootNode — calls useTheme() directly ────────────────────────────── */

const RootNode = memo(({ data }: NodeProps) => {
  const T = useTheme();
  const d = data as unknown as RootData;
  return (
    <motion.div
      initial={{ scale: 0.88, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        padding: "11px 30px",
        borderRadius: 22,
        background: d.active ? "oklch(0.22 0.06 175 / 0.75)" : T.card,
        border: `1.5px solid ${d.active ? `${T.accent}80` : T.border}`,
        boxShadow: d.active
          ? `0 0 32px ${T.accent}24, inset 0 1px 0 ${T.border}`
          : `inset 0 1px 0 ${T.borderSubtle}`,
        textAlign: "center",
        transition: "border-color 0.35s, box-shadow 0.35s, background 0.35s",
      }}
    >
      <Handle type="source" position={Position.Bottom} style={HS} />
      <div
        style={{
          fontSize: 11,
          fontFamily: "monospace",
          fontWeight: 700,
          color: d.active ? T.accent : T.textMuted,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          transition: "color 0.35s",
        }}
      >
        Cancel Request
      </div>
      <div
        style={{
          fontSize: 8,
          fontFamily: "monospace",
          color: d.active ? `${T.accent}80` : T.textDim,
          letterSpacing: "0.05em",
          marginTop: 2,
          transition: "color 0.35s",
        }}
      >
        {d.active ? "Processing decision..." : "Awaiting input"}
      </div>
    </motion.div>
  );
});
RootNode.displayName = "RootNode";

/* ── DecisionNode — calls useTheme() directly ────────────────────────── */

const DecisionNode = memo(({ data }: NodeProps) => {
  const T = useTheme();
  const d = data as unknown as DecisionData;
  return (
    <div
      style={{
        padding: "9px 20px",
        borderRadius: 99,
        background: d.active ? "oklch(0.20 0.05 178 / 0.7)" : T.card,
        border: `1px solid ${d.active ? `${T.accent}61` : T.border}`,
        boxShadow: d.active ? `0 0 18px ${T.accent}1A` : "none",
        minWidth: 120,
        textAlign: "center",
        transition: "border-color 0.35s, box-shadow 0.35s, background 0.35s",
      }}
    >
      <Handle type="target" position={Position.Top} style={HS} />
      <div
        style={{
          fontSize: 9,
          fontFamily: "monospace",
          fontWeight: 600,
          color: d.active ? T.accent : T.textMuted,
          letterSpacing: "0.02em",
          transition: "color 0.35s",
          whiteSpace: "nowrap",
        }}
      >
        {d.text}
      </div>
      <Handle type="source" position={Position.Bottom} style={HS} />
    </div>
  );
});
DecisionNode.displayName = "DecisionNode";

/* ── OutcomeNode — calls useTheme() directly ─────────────────────────── */

const OutcomeNode = memo(({ data }: NodeProps) => {
  const T = useTheme();
  const d = data as unknown as OutcomeData;
  const meta = TIER_META[d.tier];
  return (
    <motion.div
      animate={d.active ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      style={{
        borderRadius: 12,
        overflow: "hidden",
        background: d.active ? meta.bg : T.card,
        border: `1.5px solid ${d.active ? meta.border : T.border}`,
        boxShadow: d.active
          ? `0 0 32px ${meta.glow}, inset 0 1px 0 ${T.borderSubtle}`
          : "none",
        minWidth: 130,
        transition: "border-color 0.35s, box-shadow 0.35s, background 0.35s",
      }}
    >
      <div
        style={{
          height: 2,
          background: d.active ? meta.color : `${meta.color}20`,
          transition: "background 0.35s",
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{ ...HS, left: "50%" }}
      />
      <div
        style={{
          padding: "9px 13px",
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <span
          style={{
            color: d.active ? meta.color : T.textDim,
            flexShrink: 0,
            transition: "color 0.35s",
            display: "flex",
          }}
        >
          {meta.icon}
        </span>
        <div>
          <div
            style={{
              fontSize: 9.5,
              fontFamily: "monospace",
              fontWeight: 700,
              color: d.active ? meta.color : T.textMuted,
              letterSpacing: "0.03em",
              transition: "color 0.35s",
            }}
          >
            {d.label}
          </div>
          <div
            style={{
              fontSize: 7.5,
              fontFamily: "monospace",
              color: d.active ? meta.color : T.textDim,
              opacity: d.active ? 0.72 : 0.55,
              transition: "color 0.35s, opacity 0.35s",
              marginTop: 1,
            }}
          >
            {d.subLabel}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
OutcomeNode.displayName = "OutcomeNode";

/* ── TreeEdge — calls useTheme() directly ────────────────────────────── */

function TreeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const T = useTheme();
  const d = data as TreeEdgeData | undefined;
  const active = d?.active ?? false;
  const label = d?.label ?? "";

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      {active && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: T.accent,
            strokeWidth: 8,
            opacity: 0.1,
            filter: "blur(4px)",
          }}
        />
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: active ? T.accent : T.border,
          strokeWidth: active ? 2 : 1,
          filter: active ? `drop-shadow(0 0 4px ${T.accent}8C)` : "none",
          transition: "stroke 0.35s, stroke-width 0.35s",
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            zIndex: 10,
          }}
          className="nodrag nopan"
        >
          <span
            style={{
              fontSize: 7.5,
              fontFamily: "monospace",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 5,
              color: active ? T.accent : T.textDim,
              background: active ? T.accentBg : T.card,
              border: `1px solid ${active ? `${T.accent}52` : T.borderSubtle}`,
              transition: "color 0.35s, background 0.35s, border-color 0.35s",
              display: "block",
            }}
          >
            {label}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

/* ── Node + edge type maps ───────────────────────────────────────────── */

const nodeTypes = {
  rootNode: RootNode,
  decisionNode: DecisionNode,
  outcomeNode: OutcomeNode,
};

const edgeTypes = { treeEdge: TreeEdge };

/* ── Active-path helpers ─────────────────────────────────────────────── */

function getFlags(tier: RefundTier | null) {
  const isCannot = tier === "CANNOT_CANCEL";
  const isFull = tier === "FULL";
  const isPartial = tier === "PARTIAL";
  const isNone = tier === "NONE";
  const rightSide = isFull || isPartial || isNone;
  const deeper = isPartial || isNone;
  return { isCannot, isFull, isPartial, isNone, rightSide, deeper };
}

/* ── Build nodes ─────────────────────────────────────────────────────── */

function buildNodes(tier: RefundTier | null): Node[] {
  const f = getFlags(tier);
  const any = tier !== null;

  const base: React.CSSProperties = {
    background: "transparent",
    border: "none",
    padding: 0,
  };

  return [
    {
      id: "root",
      type: "rootNode",
      position: { x: 255, y: 0 },
      data: { active: any } as Record<string, unknown>,
      style: base,
      draggable: false,
      selectable: false,
    },
    {
      id: "left-dec",
      type: "decisionNode",
      position: { x: 8, y: 82 },
      data: {
        text: "Completed / Gate / Cancelled?",
        active: f.isCannot,
      } as Record<string, unknown>,
      style: base,
      draggable: false,
      selectable: false,
    },
    {
      id: "right-dec",
      type: "decisionNode",
      position: { x: 425, y: 82 },
      data: { text: "Pre-booked & Confirmed", active: f.rightSide } as Record<
        string,
        unknown
      >,
      style: base,
      draggable: false,
      selectable: false,
    },
    {
      id: "cannot",
      type: "outcomeNode",
      position: { x: 18, y: 172 },
      data: {
        tier: "CANNOT_CANCEL",
        label: "Cannot Cancel",
        subLabel: "No refund possible",
        active: f.isCannot,
      } as Record<string, unknown>,
      style: base,
      draggable: false,
      selectable: false,
    },
    {
      id: "time-dec",
      type: "decisionNode",
      position: { x: 394, y: 172 },
      data: { text: "Time until start > 24h?", active: f.rightSide } as Record<
        string,
        unknown
      >,
      style: base,
      draggable: false,
      selectable: false,
    },
    {
      id: "full",
      type: "outcomeNode",
      position: { x: 522, y: 260 },
      data: {
        tier: "FULL",
        label: "Full Refund",
        subLabel: "100% back to driver",
        active: f.isFull,
      } as Record<string, unknown>,
      style: base,
      draggable: false,
      selectable: false,
    },
    {
      id: "p-dec",
      type: "decisionNode",
      position: { x: 308, y: 260 },
      data: { text: "Within 1h – 24h?", active: f.deeper } as Record<
        string,
        unknown
      >,
      style: base,
      draggable: false,
      selectable: false,
    },
    {
      id: "partial",
      type: "outcomeNode",
      position: { x: 234, y: 348 },
      data: {
        tier: "PARTIAL",
        label: "Partial Refund",
        subLabel: "50% back to driver",
        active: f.isPartial,
      } as Record<string, unknown>,
      style: base,
      draggable: false,
      selectable: false,
    },
    {
      id: "none",
      type: "outcomeNode",
      position: { x: 422, y: 348 },
      data: {
        tier: "NONE",
        label: "No Refund",
        subLabel: "0% — under 1h",
        active: f.isNone,
      } as Record<string, unknown>,
      style: base,
      draggable: false,
      selectable: false,
    },
  ];
}

/* ── Build edges ─────────────────────────────────────────────────────── */

function buildEdges(tier: RefundTier | null): Edge[] {
  const f = getFlags(tier);

  return [
    {
      id: "e1",
      source: "root",
      target: "left-dec",
      type: "treeEdge",
      animated: f.isCannot,
      data: { label: "YES", active: f.isCannot } as Record<string, unknown>,
    },
    {
      id: "e2",
      source: "root",
      target: "right-dec",
      type: "treeEdge",
      animated: f.rightSide,
      data: { label: "NO", active: f.rightSide } as Record<string, unknown>,
    },
    {
      id: "e3",
      source: "left-dec",
      target: "cannot",
      type: "treeEdge",
      animated: f.isCannot,
      data: { label: "YES", active: f.isCannot } as Record<string, unknown>,
    },
    {
      id: "e4",
      source: "right-dec",
      target: "time-dec",
      type: "treeEdge",
      animated: f.rightSide,
      data: { label: "YES", active: f.rightSide } as Record<string, unknown>,
    },
    {
      id: "e5",
      source: "time-dec",
      target: "full",
      type: "treeEdge",
      animated: f.isFull,
      data: { label: ">24h", active: f.isFull } as Record<string, unknown>,
    },
    {
      id: "e6",
      source: "time-dec",
      target: "p-dec",
      type: "treeEdge",
      animated: f.deeper,
      data: { label: "≤24h", active: f.deeper } as Record<string, unknown>,
    },
    {
      id: "e7",
      source: "p-dec",
      target: "partial",
      type: "treeEdge",
      animated: f.isPartial,
      data: { label: "YES", active: f.isPartial } as Record<string, unknown>,
    },
    {
      id: "e8",
      source: "p-dec",
      target: "none",
      type: "treeEdge",
      animated: f.isNone,
      data: { label: "<1h", active: f.isNone } as Record<string, unknown>,
    },
  ];
}

/* ── Breakdown chip ──────────────────────────────────────────────────── */

function BreakdownChip({
  icon,
  label,
  value,
  color,
  suffix,
  T,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  suffix: string;
  T: ThemeTokens;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "9px 10px",
        borderRadius: 10,
        background: T.card,
        border: `1px solid ${color}20`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
      }}
    >
      <span style={{ color, display: "flex" }}>{icon}</span>
      <div
        style={{
          fontSize: 7,
          fontFamily: "monospace",
          fontWeight: 700,
          color: T.textMuted,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 17,
          fontFamily: "monospace",
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}
      >
        <NumberFlow
          value={value}
          format={{
            style: "decimal",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }}
          animated
          respectMotionPreference={false}
        />
      </div>
      <div
        style={{
          fontSize: 7,
          fontFamily: "monospace",
          color,
          opacity: 0.5,
        }}
      >
        MAD {suffix}
      </div>
    </div>
  );
}

/* ── Tier badge (result panel) ───────────────────────────────────────── */

function TierBadgeMini({ tier }: { tier: RefundTier }) {
  const meta = TIER_META[tier];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "10px 14px",
        borderRadius: 12,
        background: meta.bg,
        border: `1.5px solid ${meta.border}`,
        boxShadow: `0 0 24px ${meta.glow}`,
        flexShrink: 0,
      }}
    >
      <span style={{ color: meta.color, display: "flex" }}>{meta.icon}</span>
      <div>
        <div
          style={{
            fontSize: 12,
            fontFamily: "monospace",
            fontWeight: 700,
            color: meta.color,
            letterSpacing: "0.03em",
          }}
        >
          {meta.label}
        </div>
        <div
          style={{
            fontSize: 8.5,
            fontFamily: "monospace",
            color: meta.color,
            opacity: 0.65,
            marginTop: 1,
          }}
        >
          {meta.percent} back to driver
        </div>
      </div>
    </div>
  );
}

/* ── Result panel ────────────────────────────────────────────────────── */

function ResultPanel({ result }: { result: CancellationResult }) {
  const T = useTheme();
  const meta = TIER_META[result.tier];
  return (
    <div
      style={{
        height: "100%",
        padding: "14px 20px 16px",
        background: T.header,
        borderTop: `1px solid ${meta.border}`,
        boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <TierBadgeMini tier={result.tier} />
        <p
          style={{
            fontSize: 10,
            fontFamily: "monospace",
            color: T.textMuted,
            lineHeight: 1.6,
            flex: 1,
            margin: 0,
          }}
        >
          {result.reason}
        </p>
      </div>
      {result.tier !== "CANNOT_CANCEL" && (
        <div style={{ display: "flex", gap: 8 }}>
          <BreakdownChip
            icon={<Wallet className="size-3.5" />}
            label="Driver"
            value={result.driverRecovers}
            color={T.blue}
            suffix="back"
            T={T}
          />
          <BreakdownChip
            icon={<TrendingUp className="size-3.5" />}
            label="Platform"
            value={result.platformKeeps}
            color={T.accent}
            suffix="kept"
            T={T}
          />
          <BreakdownChip
            icon={<Building2 className="size-3.5" />}
            label="Lot"
            value={result.lotReceives}
            color={T.green}
            suffix="receives"
            T={T}
          />
        </div>
      )}
    </div>
  );
}

/* ── Empty panel ─────────────────────────────────────────────────────── */

function EmptyPanel() {
  const T = useTheme();
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: T.header,
        borderTop: `1px solid ${T.borderSubtle}`,
      }}
    >
      <Circle className="size-4" style={{ color: T.textDim }} />
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 10,
          color: T.textDim,
          letterSpacing: "0.03em",
        }}
      >
        Select a scenario to see the cancellation decision
      </span>
    </div>
  );
}

/* ── CancellationCanvas ──────────────────────────────────────────────── */

export default function CancellationCanvas({
  result,
  hoursUntilStart,
}: CancellationCanvasProps) {
  const T = useTheme();
  const activeTier = result?.tier ?? null;
  const colorMode = useReactFlowColorMode();
  const dotColor = useBackgroundDotColor();

  const [nodes, setNodes, onNodesChange] = useNodesState(
    buildNodes(activeTier),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    buildEdges(activeTier),
  );

  useEffect(() => {
    setNodes(buildNodes(activeTier));
    setEdges(buildEdges(activeTier));
  }, [activeTier, setNodes, setEdges]);

  const timeLabel =
    hoursUntilStart > 0
      ? `${hoursUntilStart}h until start`
      : hoursUntilStart === 0
        ? "Not set"
        : "Booking started";

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: T.bg }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{
          height: 44,
          borderBottom: `1px solid ${T.border}`,
          background: T.header,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: T.red,
              boxShadow: `0 0 10px 2px ${T.red}8C`,
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              color: T.textMuted,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Cancellation Policy Engine
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3" style={{ color: T.textDim }} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 600,
              color: hoursUntilStart > 0 ? T.textMuted : `${T.red}A6`,
            }}
          >
            {timeLabel}
          </span>
        </div>
      </div>

      {/* ── ReactFlow (decision tree) ── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          colorMode={colorMode}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            color={dotColor}
            gap={24}
            size={1}
            variant={BackgroundVariant.Dots}
          />
        </ReactFlow>
      </div>

      {/* ── Result / empty panel (fixed 160px) ── */}
      <div style={{ height: 160, flexShrink: 0 }}>
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key={`result-${result.tier}`}
              style={{ height: "100%" }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <ResultPanel result={result} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              style={{ height: "100%" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EmptyPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
