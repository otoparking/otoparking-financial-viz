"use client";

import { memo, useEffect, useMemo } from "react";
import { Zap } from "lucide-react";
import {
  ReactFlow,
  Background,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import type { WalletState, WalletType, PRDScenario } from "@/types/financial";
import WalletNodeContent from "./WalletNodeContent";
import LedgerPanel, { type LedgerData } from "./LedgerPanel";
import LiveBadge from "./LiveBadge";
import type { LiveData } from "@/lib/api";
import {
  useReactFlowColorMode,
  useBackgroundDotColor,
} from "@/hooks/useColorMode";
import { useTheme } from "@/hooks/useTheme";

/* ── Node ────────────────────────────────────────────────────────────── */

type WalletNodeData = {
  wallet: WalletState;
  isActive: boolean;
  formatMAD: (n: number) => string;
};

const WalletCardNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as WalletNodeData;
  return (
    <WalletNodeContent
      wallet={d.wallet}
      isActive={d.isActive}
      formatMAD={d.formatMAD}
    />
  );
});
WalletCardNode.displayName = "WalletCardNode";

/* ── Custom edge ─────────────────────────────────────────────────────── */

type ScenarioEdgeData = {
  isActive: boolean;
  isPreview: boolean;
  stepNumber: number | null;
};

/**
 * React Flow custom edge that renders a styled bezier path via BaseEdge
 * and a step-number badge via EdgeLabelRenderer — the canonical RF approach.
 */
function ScenarioEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
  markerEnd,
  style,
}: EdgeProps) {
  const T = useTheme();
  const d = data as ScenarioEdgeData | undefined;
  const isActive = d?.isActive ?? false;
  const isPreview = d?.isPreview ?? false;
  const stepNum = d?.stepNumber ?? null;
  const visible = isActive || isPreview;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: (style as Record<string, number>)?.__curvature ?? 0.25,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={visible ? markerEnd : undefined}
        style={{
          stroke: T.accent,
          strokeWidth: isActive ? 2.5 : 1.5,
          strokeDasharray: isPreview ? "5 4" : undefined,
          opacity: isActive ? 1 : isPreview ? 0.55 : 0,
          filter: isActive
            ? `drop-shadow(0 0 8px rgba(203,255,0,0.65))`
            : "none",
          transition:
            "opacity 0.3s ease, stroke-width 0.3s ease, filter 0.3s ease",
        }}
      />

      {visible && stepNum != null && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "monospace",
                background: isActive ? T.accent : `${T.accent}1e`,
                color: isActive ? T.bg : T.accent,
                border: isActive ? "none" : `1px solid ${T.accent}72`,
                boxShadow: isActive ? `0 0 8px ${T.accent}99` : "none",
              }}
            >
              {stepNum}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { scenarioEdge: ScenarioEdge };
const nodeTypes = { walletCard: WalletCardNode };

/* ── Edge definitions ────────────────────────────────────────────────── */

const WALLET_NAMES: Record<string, string> = {
  driver: "Driver Wallet",
  commission: "Commission",
  settlement: "Settlement",
  lot: "Lot Revenue",
};

/**
 * Each entry defines:
 *  - source / target node IDs
 *  - which handle to use on each end (controls exit/entry direction)
 *  - curvature: higher values make the bezier arc wider, useful for
 *    skip-level edges so they sweep around intermediate nodes
 */
const EDGES = [
  // Driver → Commission (down-left: booking commission flow)
  {
    id: "e-driver-commission",
    source: "driver",
    target: "commission",
    sourceHandle: "b-out",
    targetHandle: "t-in",
    curvature: 0.25,
  },
  // Driver → Settlement (down-right: booking escrow flow)
  {
    id: "e-driver-settlement",
    source: "driver",
    target: "settlement",
    sourceHandle: "b-out",
    targetHandle: "t-in",
    curvature: 0.25,
  },
  // Settlement → Lot (downward: escrow release)
  {
    id: "e-settlement-lot-down",
    source: "settlement",
    target: "lot",
    sourceHandle: "b-out",
    targetHandle: "t-in",
    curvature: 0.25,
  },
  // Driver → Lot (skip-level left: gate wallet direct)
  {
    id: "e-driver-lot",
    source: "driver",
    target: "lot",
    sourceHandle: "l-out",
    targetHandle: "t-in",
    curvature: 0.5,
  },
  // Commission → Driver (upward: refund reversal)
  {
    id: "e-commission-driver",
    source: "commission",
    target: "driver",
    sourceHandle: "t-out",
    targetHandle: "b-in",
    curvature: 0.25,
  },
  // Settlement → Driver (upward: escrow refund)
  {
    id: "e-settlement-driver",
    source: "settlement",
    target: "driver",
    sourceHandle: "t-out",
    targetHandle: "b-in",
    curvature: 0.25,
  },
  // Settlement → Lot (right-to-down: cancel no-refund)
  {
    id: "e-settlement-lot-cancel",
    source: "settlement",
    target: "lot",
    sourceHandle: "r",
    targetHandle: "l",
    curvature: 0.35,
  },
];

function buildStepMap(scenario: PRDScenario | null): Map<string, number> {
  const map = new Map<string, number>();
  if (!scenario) return map;
  scenario.flows.forEach((flow, idx) => {
    if (flow.from !== flow.to) map.set(`${flow.from}→${flow.to}`, idx + 1);
  });
  return map;
}

function buildEdges(
  activeFlowPairs: Set<string>,
  hoveredFlowPairs: Set<string>,
  activeStepMap: Map<string, number>,
  previewStepMap: Map<string, number>,
): Edge[] {
  return EDGES.map((pair) => {
    const key = `${pair.source}→${pair.target}`;
    const active = activeFlowPairs.has(key);
    const preview = !active && hoveredFlowPairs.has(key);
    const stepNum = active
      ? (activeStepMap.get(key) ?? null)
      : (previewStepMap.get(key) ?? null);

    return {
      id: (pair as { id?: string }).id ?? `e-${pair.source}-${pair.target}`,
      source: pair.source,
      target: pair.target,
      sourceHandle: pair.sourceHandle,
      targetHandle: pair.targetHandle,
      type: "scenarioEdge",
      animated: active, // React Flow adds .animated class → CSS dash animation
      data: {
        isActive: active,
        isPreview: preview,
        stepNumber: stepNum,
      } satisfies ScenarioEdgeData,
      // __curvature is picked up inside ScenarioEdge via the style prop
      style: { __curvature: pair.curvature } as React.CSSProperties,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#CBFF00",
        width: active ? 16 : 12,
        height: active ? 16 : 12,
      },
    };
  });
}

/* ── Scenario info panel ─────────────────────────────────────────────── */

function ScenarioInfoPanel({ scenario }: { scenario: PRDScenario }) {
  const T = useTheme();
  return (
    <motion.div
      key={scenario.id}
      className="absolute top-3 right-3 z-50 pointer-events-none"
      style={{ width: 272 }}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.accent}38`,
          borderRadius: 10,
          backdropFilter: "blur(14px)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 12px 7px",
            borderBottom: `1px solid ${T.accent}1a`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                background: T.accent,
                color: T.bg,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "monospace",
                padding: "1px 6px",
                borderRadius: 5,
                letterSpacing: "0.04em",
              }}
            >
              #{String(scenario.number).padStart(2, "0")}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: T.text,
              }}
            >
              {scenario.name}
            </span>
          </div>
          <span
            style={{
              fontSize: 9,
              fontFamily: "monospace",
              color: `${T.accent}80`,
              letterSpacing: "0.05em",
            }}
          >
            {scenario.prdSection}
          </span>
        </div>

        {/* Timing badge */}
        <div style={{ padding: "6px 12px 4px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
              fontFamily: "monospace",
              letterSpacing: "0.06em",
              color: scenario.concurrent ? `${T.accent}b3` : `${T.escrow}e6`,
              background: scenario.concurrent
                ? `${T.accent}14`
                : `${T.escrow}1e`,
              padding: "2px 7px",
              borderRadius: 4,
              border: scenario.concurrent
                ? `0.5px solid ${T.accent}33`
                : `0.5px solid ${T.escrow}4d`,
            }}
          >
            {scenario.concurrent ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Zap style={{ width: 9, height: 9, color: T.accent }} />
                All steps execute simultaneously
              </span>
            ) : (
              "Steps execute in order"
            )}
          </span>
        </div>

        {/* Steps */}
        <div style={{ padding: "4px 0 6px" }}>
          {scenario.flows.map((flow, idx) => {
            const isSelfLoop = flow.from === flow.to;
            return (
              <div
                key={flow.id}
                style={{
                  padding: "5px 12px",
                  borderTop: idx > 0 ? `1px solid ${T.accent}0f` : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: `${T.accent}1e`,
                      border: `0.5px solid ${T.accent}4d`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color: T.accent,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  {isSelfLoop ? (
                    <span
                      style={{
                        fontSize: 10,
                        color: `${T.accent}a6`,
                        fontFamily: "monospace",
                      }}
                    >
                      {WALLET_NAMES[flow.from]}
                    </span>
                  ) : (
                    <>
                      <span
                        style={{
                          fontSize: 10,
                          color: `${T.accent}a6`,
                          fontFamily: "monospace",
                        }}
                      >
                        {WALLET_NAMES[flow.from]}
                      </span>
                      <span style={{ fontSize: 9, color: `${T.accent}4d` }}>
                        →
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: `${T.accent}a6`,
                          fontFamily: "monospace",
                        }}
                      >
                        {WALLET_NAMES[flow.to]}
                      </span>
                    </>
                  )}
                  {flow.amount > 0 && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        fontWeight: 600,
                        fontFamily: "monospace",
                        color: `${T.accent}d9`,
                        flexShrink: 0,
                      }}
                    >
                      {flow.amount} MAD
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10.5,
                    lineHeight: 1.5,
                    color: T.textMuted,
                    paddingLeft: 21,
                  }}
                >
                  {flow.stepDescription}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */

interface FlowCanvasProps {
  wallets: WalletState[];
  ledger: LedgerData;
  liveData: LiveData | null;
  lastSynced: Date | null;
  activeBooking: { bookingRef: string; escrowAmount: number } | null;
  activeWallets: Set<WalletType>;
  activeFlowPairs: Set<string>;
  hoveredFlowPairs: Set<string>;
  hoveredScenario: PRDScenario | null;
  runningScenario: PRDScenario | null;
  simStep: number;
  simTotalSteps: number;
  formatMAD: (n: number) => string;
}

export default function FlowCanvas({
  wallets,
  ledger,
  liveData,
  lastSynced,
  activeBooking,
  activeWallets,
  activeFlowPairs,
  hoveredFlowPairs,
  hoveredScenario,
  runningScenario,
  simStep,
  simTotalSteps,
  formatMAD,
}: FlowCanvasProps) {
  const colorMode = useReactFlowColorMode();
  const dotColor = useBackgroundDotColor();
  const T = useTheme();

  const activeStepMap = useMemo(
    () => buildStepMap(runningScenario),
    [runningScenario],
  );
  const previewStepMap = useMemo(
    () => buildStepMap(hoveredScenario),
    [hoveredScenario],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    wallets.map((w) => ({
      id: w.id,
      type: "walletCard",
      position: { x: w.x * 8, y: w.y * 7 },
      data: { wallet: w, isActive: activeWallets.has(w.id), formatMAD },
      draggable: true,
    })),
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    buildEdges(
      activeFlowPairs,
      hoveredFlowPairs,
      activeStepMap,
      previewStepMap,
    ),
  );

  useEffect(() => {
    setNodes((prev) =>
      prev.map((node) => {
        const wallet = wallets.find((w) => w.id === node.id);
        if (!wallet) return node;
        return {
          ...node,
          data: {
            wallet,
            isActive: activeWallets.has(wallet.id as WalletType),
            formatMAD,
          },
        };
      }),
    );
  }, [wallets, activeWallets, formatMAD, setNodes]);

  useEffect(() => {
    setEdges(
      buildEdges(
        activeFlowPairs,
        hoveredFlowPairs,
        activeStepMap,
        previewStepMap,
      ),
    );
  }, [
    activeFlowPairs,
    hoveredFlowPairs,
    activeStepMap,
    previewStepMap,
    setEdges,
  ]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          height: 44,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: `1px solid ${T.border}`,
          background: T.header,
        }}
      >
        {/* Left: lime indicator + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: runningScenario ? T.accent : T.textMuted,
              boxShadow: runningScenario
                ? `0 0 10px 2px ${T.accent}8c`
                : "none",
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
            Financial Flow
          </span>
        </div>
        {/* Right: live badge + step progress + scenario name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {liveData?.connected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                borderRadius: 6,
                background: `${T.green}1e`,
                border: `1px solid ${T.green}40`,
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: T.green,
                }}
              />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  fontWeight: 700,
                  color: T.green,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Live
              </span>
            </div>
          )}
          <AnimatePresence mode="wait">
            {runningScenario && simTotalSteps > 0 && (
              <motion.div
                key={runningScenario.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: `${T.accent}12`,
                  border: `1px solid ${T.accent}2e`,
                }}
              >
                {/* Step dots */}
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {Array.from({ length: simTotalSteps }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        background: i < simStep ? T.accent : `${T.accent}2e`,
                        boxShadow:
                          i < simStep ? `0 0 5px 1px ${T.accent}80` : "none",
                        scale: i === simStep - 1 ? [1, 1.4, 1] : 1,
                      }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: i < simStep ? T.accent : `${T.accent}2e`,
                      }}
                    />
                  ))}
                </div>
                {/* Step counter */}
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 8,
                    fontWeight: 700,
                    color: T.textMuted,
                    letterSpacing: "0.06em",
                  }}
                >
                  {simStep < simTotalSteps
                    ? `STEP ${simStep} / ${simTotalSteps}`
                    : `COMPLETE`}
                </span>
                {/* Scenario name */}
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 8,
                    fontWeight: 700,
                    color: T.accent,
                    letterSpacing: "0.06em",
                    maxWidth: 140,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  #{String(runningScenario.number).padStart(2, "0")}{" "}
                  {runningScenario.name}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ReactFlow takes remaining height */}
      <div className="relative flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          nodesDraggable
          nodesConnectable={false}
          colorMode={colorMode}
          proOptions={{ hideAttribution: true }}
        >
          <Background color={dotColor} gap={20} />
        </ReactFlow>

        <AnimatePresence>
          {hoveredScenario && <ScenarioInfoPanel scenario={hoveredScenario} />}
        </AnimatePresence>

        <LedgerPanel data={ledger} />

        {activeBooking && (
          <div
            className="absolute bottom-3 left-3 z-40 pointer-events-none"
            style={{
              background: T.card,
              border: `1px solid ${T.amber}4d`,
              borderRadius: 8,
              padding: "6px 10px",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: T.amber,
                boxShadow: `0 0 6px rgba(245,158,11,0.5)`,
                animation: "live-pulse 2s ease-in-out infinite",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                color: T.amber,
                fontWeight: 600,
              }}
            >
              ACTIVE
            </span>
            <span style={{ fontSize: 9, color: T.textMuted }}>
              {activeBooking.bookingRef}
            </span>
            <span
              style={{
                fontSize: 9,
                fontFamily: "monospace",
                color: T.escrow,
                fontWeight: 600,
              }}
            >
              {activeBooking.escrowAmount.toFixed(1)} MAD
            </span>
          </div>
        )}

        <LiveBadge
          connected={liveData?.connected ?? false}
          lastSynced={lastSynced}
        />
      </div>
    </div>
  );
}
