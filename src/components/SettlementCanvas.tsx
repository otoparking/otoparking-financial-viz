"use client";

import { memo, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MarkerType,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import NumberFlow from "@number-flow/react";
import {
  useReactFlowColorMode,
  useBackgroundDotColor,
} from "@/hooks/useColorMode";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";
import type { SettlementResult, SettlementStatus } from "@/types/settlement";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  BadgeCheck,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   Status config
───────────────────────────────────────────────────────────────────────────── */

type StatusConfig = {
  label: string;
  color: string;
  icon: React.ElementType;
};

const STATUS_CONFIG: Record<SettlementStatus, StatusConfig> = {
  PENDING: { label: "Pending", color: "#BA7517", icon: Clock },
  APPROVED: { label: "Approved", color: "#378ADD", icon: CheckCircle2 },
  PAYOUT_INITIATED: {
    label: "Payout Initiated",
    color: "#F59E0B",
    icon: ArrowRight,
  },
  PAID: { label: "Paid", color: "#1D9E75", icon: BadgeCheck },
  PAYOUT_FAILED: {
    label: "Payout Failed",
    color: "#EF4444",
    icon: AlertTriangle,
  },
  CARRY_FORWARD: { label: "Carry Forward", color: "#8B5CF6", icon: RotateCcw },
};

const STATUS_BADGE_LABELS: Record<SettlementStatus, string> = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PAYOUT_INITIATED: "INITIATING",
  PAID: "PAID",
  PAYOUT_FAILED: "FAILED",
  CARRY_FORWARD: "CARRIED FWD",
};

/* ─────────────────────────────────────────────────────────────────────────────
   Invisible handle style
───────────────────────────────────────────────────────────────────────────── */

const HS = { width: 1, height: 1, visibility: "hidden" as const };

/* ─────────────────────────────────────────────────────────────────────────────
   StateNode — calls useTheme() directly (ReactFlow node component)
───────────────────────────────────────────────────────────────────────────── */

type StateNodeData = {
  status: SettlementStatus;
  isActive: boolean;
};

const StateNode = memo(({ data }: NodeProps) => {
  const T = useTheme();
  const d = data as unknown as StateNodeData;
  const cfg = STATUS_CONFIG[d.status];
  const Icon = cfg.icon;
  const isActive = d.isActive;

  return (
    <>
      <Handle type="target" position={Position.Left} id="left" style={HS} />
      <Handle type="source" position={Position.Right} id="right" style={HS} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HS} />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={HS}
      />
      <Handle type="target" position={Position.Top} id="top" style={HS} />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={HS}
      />

      {/* Ripple rings */}
      <AnimatePresence>
        {isActive && (
          <>
            <motion.div
              key="ring1"
              initial={{ opacity: 0.55, scale: 1 }}
              animate={{ opacity: 0, scale: 1.55 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.7,
                ease: "easeOut",
                repeat: Infinity,
                repeatDelay: 0.6,
              }}
              style={{
                position: "absolute",
                inset: -5,
                borderRadius: 16,
                border: `2px solid ${cfg.color}55`,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
            <motion.div
              key="ring2"
              initial={{ opacity: 0.35, scale: 1 }}
              animate={{ opacity: 0, scale: 1.95 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.2,
                ease: "easeOut",
                delay: 0.35,
                repeat: Infinity,
                repeatDelay: 0.6,
              }}
              style={{
                position: "absolute",
                inset: -10,
                borderRadius: 21,
                border: `1.5px solid ${cfg.color}28`,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Card body */}
      <div
        style={{
          position: "relative",
          width: 170,
          height: 62,
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: isActive
            ? `oklch(from ${cfg.color} 0.17 0.04 h / 0.45)`
            : T.card,
          border: isActive ? `2px solid ${cfg.color}` : `1px solid ${T.border}`,
          boxShadow: isActive
            ? `0 0 20px ${cfg.color}40, 0 0 6px ${cfg.color}20, inset 0 1px 0 ${cfg.color}22`
            : "none",
          transition: "all 0.4s ease",
          zIndex: 1,
        }}
      >
        {/* Top color bar */}
        <div
          style={{
            height: 2,
            width: "100%",
            background: isActive ? cfg.color : `${cfg.color}18`,
            transition: "background 0.4s ease",
            flexShrink: 0,
          }}
        />

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingLeft: 12,
            paddingRight: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: 7,
              background: isActive ? `${cfg.color}22` : T.card,
              flexShrink: 0,
              transition: "all 0.4s ease",
            }}
          >
            <Icon
              style={{
                width: 13,
                height: 13,
                color: isActive ? cfg.color : T.textMuted,
                transition: "color 0.4s ease",
              }}
            />
          </div>
          <span
            style={{
              color: isActive ? cfg.color : T.textMuted,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              fontFamily: "monospace",
              transition: "color 0.4s ease",
            }}
          >
            {cfg.label}
          </span>
        </div>
      </div>
    </>
  );
});
StateNode.displayName = "StateNode";

/* ─────────────────────────────────────────────────────────────────────────────
   FlowEdge — calls useTheme() directly (ReactFlow edge component)
───────────────────────────────────────────────────────────────────────────── */

type FlowEdgeData = {
  isActive: boolean;
  label?: string;
};

const FlowEdge = memo(function FlowEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const T = useTheme();
  const d = (data as unknown as FlowEdgeData) ?? { isActive: false };
  const isActive = d.isActive;

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
      {/* Glow layer for active edges */}
      {isActive && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: T.accent,
            strokeWidth: 6,
            opacity: 0.15,
            filter: "blur(4px)",
            pointerEvents: "none",
          }}
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={isActive ? markerEnd : undefined}
        style={{
          stroke: isActive ? T.accent : T.border,
          strokeWidth: isActive ? 2.5 : 1,
          filter: isActive ? `drop-shadow(0 0 4px ${T.accent}99)` : "none",
          transition:
            "stroke 0.4s ease, stroke-width 0.4s ease, filter 0.4s ease",
          strokeDasharray: isActive ? "6 3" : undefined,
          animation: isActive ? "flowDash 0.6s linear infinite" : undefined,
        }}
      />

      {d.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: isActive ? T.accentBg : T.card,
                border: `1px solid ${isActive ? T.accent : T.border}`,
                borderRadius: 4,
                padding: "1px 5px",
                fontSize: 9,
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: isActive ? T.accent : T.textMuted,
                transition: "all 0.4s ease",
              }}
            >
              {d.label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   Node / edge types
───────────────────────────────────────────────────────────────────────────── */

const nodeTypes = { stateNode: StateNode };
const edgeTypes = { flowEdge: FlowEdge };

/* ─────────────────────────────────────────────────────────────────────────────
   Active edge map
───────────────────────────────────────────────────────────────────────────── */

const EDGE_ACTIVE_MAP: Record<string, SettlementStatus[]> = {
  "PENDING→APPROVED": ["APPROVED", "PAYOUT_INITIATED", "PAID", "PAYOUT_FAILED"],
  "APPROVED→PAYOUT_INITIATED": ["PAYOUT_INITIATED", "PAID", "PAYOUT_FAILED"],
  "PAYOUT_INITIATED→PAID": ["PAID"],
  "PAYOUT_INITIATED→PAYOUT_FAILED": ["PAYOUT_FAILED"],
  "PENDING→CARRY_FORWARD": ["CARRY_FORWARD"],
};

function isEdgeActive(key: string, status: SettlementStatus | null): boolean {
  if (!status) return false;
  return EDGE_ACTIVE_MAP[key]?.includes(status) ?? false;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Node / edge builders
───────────────────────────────────────────────────────────────────────────── */

const STATE_POSITIONS: { id: SettlementStatus; x: number; y: number }[] = [
  { id: "PENDING", x: 30, y: 20 },
  { id: "APPROVED", x: 230, y: 20 },
  { id: "PAYOUT_INITIATED", x: 430, y: 20 },
  { id: "PAID", x: 630, y: 20 },
  { id: "CARRY_FORWARD", x: 30, y: 150 },
  { id: "PAYOUT_FAILED", x: 430, y: 150 },
];

function buildNodes(status: SettlementStatus | null): Node[] {
  return STATE_POSITIONS.map((s) => ({
    id: s.id,
    type: "stateNode",
    position: { x: s.x, y: s.y },
    data: { status: s.id, isActive: status === s.id } as Record<
      string,
      unknown
    >,
    draggable: false,
  }));
}

interface EdgeDef {
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  label?: string;
}

const EDGE_DEFS: EdgeDef[] = [
  {
    source: "PENDING",
    target: "APPROVED",
    sourceHandle: "right",
    targetHandle: "left",
    label: "AUTO",
  },
  {
    source: "APPROVED",
    target: "PAYOUT_INITIATED",
    sourceHandle: "right",
    targetHandle: "left",
    label: "AUTO",
  },
  {
    source: "PAYOUT_INITIATED",
    target: "PAID",
    sourceHandle: "right",
    targetHandle: "left",
    label: "OK",
  },
  {
    source: "PAYOUT_INITIATED",
    target: "PAYOUT_FAILED",
    sourceHandle: "bottom",
    targetHandle: "top",
    label: "FAIL",
  },
  {
    source: "PENDING",
    target: "CARRY_FORWARD",
    sourceHandle: "bottom",
    targetHandle: "top",
    label: "C>B",
  },
];

function buildEdges(status: SettlementStatus | null): Edge[] {
  return EDGE_DEFS.map((def) => {
    const key = `${def.source}→${def.target}`;
    const active = isEdgeActive(key, status);

    return {
      id: `e-${def.source}-${def.target}`,
      source: def.source,
      target: def.target,
      sourceHandle: def.sourceHandle,
      targetHandle: def.targetHandle,
      type: "flowEdge",
      animated: false,
      data: { isActive: active, label: def.label } as Record<string, unknown>,
      markerEnd: active
        ? {
            type: MarkerType.ArrowClosed,
            color: "#CBFF00",
            width: 14,
            height: 14,
          }
        : undefined,
    };
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   NumberFlow helper
───────────────────────────────────────────────────────────────────────────── */

function AnimatedNumber({ value }: { value: number }) {
  return (
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
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Finance panel
───────────────────────────────────────────────────────────────────────────── */

function FinancePanel({ result }: { result: SettlementResult | null }) {
  const T = useTheme();
  const borderColor = result
    ? `${STATUS_CONFIG[result.status].color}55`
    : T.border;

  return (
    <div
      style={{
        height: 180,
        flexShrink: 0,
        background: T.header,
        borderTop: `1px solid ${borderColor}`,
        display: "flex",
        alignItems: "stretch",
        transition: "border-color 0.4s ease",
        fontFamily: "monospace",
      }}
    >
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key="finance-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ display: "flex", width: "100%", alignItems: "stretch" }}
          >
            {/* Left: Settlement Equation */}
            <div
              style={{
                flex: 1,
                borderRight: `1px solid ${T.borderSubtle}`,
                padding: "18px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: T.textMuted,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Settlement Equation
              </div>

              {/* Equation row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {/* Gross Revenue */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: T.textMuted,
                      letterSpacing: "0.06em",
                    }}
                  >
                    GROSS REVENUE
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: T.accent,
                      lineHeight: 1,
                    }}
                  >
                    <AnimatedNumber value={result.grossRevenue} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: T.textMuted,
                        marginLeft: 3,
                      }}
                    >
                      MAD
                    </span>
                  </span>
                </div>

                <span
                  style={{
                    fontSize: 20,
                    color: T.textDim,
                    paddingBottom: 2,
                    fontWeight: 300,
                  }}
                >
                  −
                </span>

                {/* Cash Owed */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: T.textMuted,
                      letterSpacing: "0.06em",
                    }}
                  >
                    CASH OWED
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: T.amber,
                      lineHeight: 1,
                    }}
                  >
                    <AnimatedNumber value={result.cashOwed} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: T.textMuted,
                        marginLeft: 3,
                      }}
                    >
                      MAD
                    </span>
                  </span>
                </div>

                <span
                  style={{
                    fontSize: 20,
                    color: T.textDim,
                    paddingBottom: 2,
                    fontWeight: 300,
                  }}
                >
                  =
                </span>

                {/* Net Wire */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: T.textMuted,
                      letterSpacing: "0.06em",
                    }}
                  >
                    NET WIRE
                  </span>
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: result.netWire >= 0 ? T.green : T.red,
                      lineHeight: 1,
                      transition: "color 0.4s ease",
                    }}
                  >
                    <AnimatedNumber value={result.netWire} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: T.textMuted,
                        marginLeft: 3,
                      }}
                    >
                      MAD
                    </span>
                  </span>
                </div>
              </div>

              {/* Carry forward badge */}
              <AnimatePresence>
                {result.carryForward > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: `${T.purple}1A`,
                      border: `1px solid ${T.purple}55`,
                      borderRadius: 6,
                      padding: "3px 9px",
                      width: "fit-content",
                    }}
                  >
                    <RotateCcw
                      style={{ width: 10, height: 10, color: T.purple }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        color: T.purple,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                      }}
                    >
                      <AnimatedNumber value={result.carryForward} /> MAD carried
                      forward
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Wallet Impact */}
            <div
              style={{
                width: 280,
                flexShrink: 0,
                padding: "18px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: T.textMuted,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Wallet Impact
              </div>

              {/* Lot Wallet row */}
              <WalletImpactRow
                icon={<Wallet style={{ width: 11, height: 11 }} />}
                label="Lot Wallet"
                iconColor={T.accent}
                after={result.lotWalletAfter}
              />

              {/* Commission row */}
              <WalletImpactRow
                icon={<TrendingDown style={{ width: 11, height: 11 }} />}
                label="Commission"
                iconColor={T.blue}
                after={result.commissionAfter}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="finance-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: T.textDim,
                letterSpacing: "0.04em",
                fontFamily: "monospace",
              }}
            >
              Run a scenario to see the settlement calculation
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WalletImpactRow({
  icon,
  label,
  iconColor,
  after,
}: {
  icon: React.ReactNode;
  label: string;
  iconColor: string;
  after: number;
}) {
  const T = useTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        background: T.card,
        borderRadius: 8,
        border: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 6,
          background: `${iconColor}18`,
          flexShrink: 0,
          color: iconColor,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: 10,
          color: T.textMuted,
          flex: 1,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <ArrowRightLeft style={{ width: 9, height: 9, color: T.textDim }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: T.text,
            fontFamily: "monospace",
          }}
        >
          <AnimatedNumber value={after} />
        </span>
        <span
          style={{
            fontSize: 9,
            color: T.textMuted,
            fontWeight: 500,
          }}
        >
          MAD
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */

interface SettlementCanvasProps {
  result: SettlementResult | null;
}

export default function SettlementCanvas({ result }: SettlementCanvasProps) {
  const T = useTheme();
  const colorMode = useReactFlowColorMode();
  const dotColor = useBackgroundDotColor();
  const status = result?.status ?? null;

  const initialNodes = useMemo(() => buildNodes(null), []);
  const initialEdges = useMemo(() => buildEdges(null), []);

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(buildNodes(status));
    setEdges(buildEdges(status));
  }, [status, setNodes, setEdges]);

  const activeStatusCfg = status ? STATUS_CONFIG[status] : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: T.bg,
        overflow: "hidden",
      }}
    >
      {/* ── Header bar (44px) ─────────────────────────────────────────────── */}
      <div
        style={{
          height: 44,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 16,
          paddingRight: 16,
          background: T.header,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* Left: title + indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 8,
              height: 8,
              background: T.accent,
              borderRadius: 2,
              boxShadow: `0 0 6px ${T.accent}AA`,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "monospace",
              letterSpacing: "0.06em",
              color: T.text,
              textTransform: "uppercase",
            }}
          >
            Settlement Engine
          </span>
        </div>

        {/* Right: status badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: activeStatusCfg ? `${activeStatusCfg.color}18` : T.card,
            border: `1px solid ${activeStatusCfg ? activeStatusCfg.color + "55" : T.border}`,
            borderRadius: 5,
            padding: "3px 9px",
            transition: "all 0.4s ease",
          }}
        >
          {activeStatusCfg && (
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: activeStatusCfg.color,
                boxShadow: `0 0 4px ${activeStatusCfg.color}`,
              }}
            />
          )}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "monospace",
              letterSpacing: "0.08em",
              color: activeStatusCfg ? activeStatusCfg.color : T.textDim,
              transition: "color 0.4s ease",
            }}
          >
            {status ? STATUS_BADGE_LABELS[status] : "IDLE"}
          </span>
        </div>
      </div>

      {/* ── ReactFlow section (flex-1) ─────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {/* CSS for animated dash */}
        <style>{`
          @keyframes flowDash {
            from { stroke-dashoffset: 18; }
            to   { stroke-dashoffset: 0;  }
          }
          .react-flow__edge-path {
            transition: stroke 0.4s ease, stroke-width 0.4s ease;
          }
        `}</style>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode={colorMode}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
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

      {/* ── Finance panel (180px) ─────────────────────────────────────────── */}
      <FinancePanel result={result} />
    </div>
  );
}
