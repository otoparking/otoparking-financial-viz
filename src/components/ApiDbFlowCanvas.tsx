"use client";

import {
  useMemo,
  useState,
  useContext,
  createContext,
  useRef,
  useCallback,
} from "react";
import {
  ReactFlow,
  Background,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
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
import { Database } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

type OpKind = "select" | "insert" | "update" | "lock" | "delete" | "upsert";

const OP_COLORS: Record<OpKind, string> = {
  select: "#3B82F6",
  insert: "#22C55E",
  update: "#F59E0B",
  lock: "#EF4444",
  delete: "#EC4899",
  upsert: "#8B5CF6",
};

const OP_LABELS: Record<OpKind, string> = {
  select: "SELECT",
  insert: "INSERT",
  update: "UPDATE",
  lock: "LOCK",
  delete: "DELETE",
  upsert: "UPSERT",
};

/* ── Route-highlight context ─────────────────────────────────────────── */

/** Shared canvas context — route tracing + scenario focus */
interface FocusState {
  scId: string; // the clicked scenario node id
  nodeIds: Set<string>; // all node ids that should stay bright
  apiIds: Set<string>; // api node ids (used to match edge apiId)
}
interface CanvasCtxValue {
  routeApiId: string | null;
  focus: FocusState | null;
}
const CanvasCtx = createContext<CanvasCtxValue>({
  routeApiId: null,
  focus: null,
});

/* ── Data ───────────────────────────────────────────────────────────── */

interface ApiDef {
  method: string;
  path: string;
  port: string;
  desc: string;
  ops: { table: string; ops: OpKind[]; desc: string }[];
}

const SCENARIO_DEFS: { label: string; color: string; apis: ApiDef[] }[] = [
  {
    label: "Auth",
    color: "#6366F1",
    apis: [
      {
        method: "POST",
        path: "/api/auth/login",
        port: "8080",
        desc: "Driver JWT",
        ops: [
          { table: "oto_users", ops: ["select"], desc: "Verify credentials" },
        ],
      },
      {
        method: "POST",
        path: "/api/admin/auth/login",
        port: "8082",
        desc: "Admin/Tenant JWT",
        ops: [
          { table: "admin_users", ops: ["select"], desc: "Verify credentials" },
        ],
      },
    ],
  },
  {
    label: "Top-Up",
    color: "#22C55E",
    apis: [
      {
        method: "POST",
        path: "/api/admin/financial/adjust",
        port: "8082",
        desc: "Credit driver 20 MAD",
        ops: [
          {
            table: "oto_wallets",
            ops: ["lock", "update"],
            desc: "balance += 20",
          },
          { table: "oto_transactions", ops: ["insert"], desc: "Credit tx" },
          { table: "oto_wallet_ledger", ops: ["insert"], desc: "Double-entry" },
        ],
      },
    ],
  },
  {
    label: "Booking",
    color: "#3B82F6",
    apis: [
      {
        method: "POST",
        path: "/api/pricing/preview",
        port: "8080",
        desc: "Compute fare + slot",
        ops: [
          { table: "parking_tariffs", ops: ["select"], desc: "Rate + grace" },
          {
            table: "oto_parking_floors_availability",
            ops: ["select"],
            desc: "Find slot",
          },
          {
            table: "oto_parking_booking_preview",
            ops: ["insert"],
            desc: "Preview",
          },
        ],
      },
      {
        method: "POST",
        path: "/api/booking/confirm",
        port: "8080",
        desc: "Debit + escrow",
        ops: [
          { table: "commission_rate", ops: ["select"], desc: "Lot rate" },
          { table: "oto_wallets", ops: ["lock", "update"], desc: "DEBIT -10" },
          {
            table: "oto_wallets_platform",
            ops: ["lock", "update"],
            desc: "CREDIT +1, block +9",
          },
          {
            table: "oto_parking_booking",
            ops: ["insert"],
            desc: "→ CONFIRMED",
          },
          { table: "oto_booking_payment", ops: ["insert"], desc: "10│1│9" },
          { table: "oto_escrow_records", ops: ["insert"], desc: "ESCROWED 9" },
          { table: "oto_wallet_transactions", ops: ["insert"], desc: "×3" },
          { table: "oto_wallet_ledger", ops: ["insert"], desc: "×2" },
        ],
      },
      {
        method: "POST",
        path: "/api/booking/list",
        port: "8080",
        desc: "Resolve booking_id",
        ops: [
          {
            table: "oto_parking_booking",
            ops: ["select"],
            desc: "Find by ref",
          },
        ],
      },
    ],
  },
  {
    label: "Completed",
    color: "#8B5CF6",
    apis: [
      {
        method: "POST",
        path: "/api/gate/sessions/start",
        port: "8080",
        desc: "Gate entry",
        ops: [
          { table: "oto_parking", ops: ["select"], desc: "Lot" },
          { table: "oto_vehicles", ops: ["select"], desc: "Ownership" },
          { table: "oto_parking_booking", ops: ["update"], desc: "→ ACTIVE" },
        ],
      },
      {
        method: "POST",
        path: "/api/gate/sessions/end",
        port: "8080",
        desc: "Exit → escrow release",
        ops: [
          { table: "parking_tariffs", ops: ["select"], desc: "Fare" },
          {
            table: "oto_escrow_records",
            ops: ["lock", "update"],
            desc: "→ RELEASED",
          },
          {
            table: "oto_parking_booking",
            ops: ["update"],
            desc: "→ COMPLETED",
          },
          {
            table: "oto_booking_payment",
            ops: ["lock", "update"],
            desc: "→ SETTLED",
          },
          {
            table: "oto_wallets_platform",
            ops: ["update"],
            desc: "DEBIT blocked -9",
          },
          {
            table: "oto_wallets_merchant",
            ops: ["lock", "update"],
            desc: "CREDIT +9",
          },
          {
            table: "oto_wallet_ledger",
            ops: ["insert"],
            desc: "ESCROW_RELEASE",
          },
        ],
      },
    ],
  },
  {
    label: "Gate Wallet",
    color: "#14B8A6",
    apis: [
      {
        method: "POST",
        path: "/api/gate/sessions/start",
        port: "8080",
        desc: "Walk-in entry",
        ops: [
          { table: "oto_parking", ops: ["select"], desc: "Lot" },
          { table: "oto_vehicles", ops: ["select"], desc: "Ownership" },
          {
            table: "oto_parking_booking",
            ops: ["insert"],
            desc: "GATE_ACCESS",
          },
        ],
      },
      {
        method: "POST",
        path: "/api/gate/sessions/end",
        port: "8080",
        desc: "Wallet payment",
        ops: [
          { table: "parking_tariffs", ops: ["select"], desc: "Fare" },
          {
            table: "oto_wallets",
            ops: ["lock", "update"],
            desc: "DEBIT driver",
          },
          {
            table: "oto_wallets_platform",
            ops: ["lock", "update"],
            desc: "CREDIT comm",
          },
          {
            table: "oto_wallets_merchant",
            ops: ["lock", "update"],
            desc: "CREDIT lot",
          },
          {
            table: "oto_gate_sessions",
            ops: ["insert"],
            desc: "CLOSED_WALLET",
          },
          { table: "oto_wallet_ledger", ops: ["insert"], desc: "×2" },
        ],
      },
    ],
  },
  {
    label: "Gate Cash",
    color: "#F59E0B",
    apis: [
      {
        method: "POST",
        path: "/api/admin/financial/adjust",
        port: "8082",
        desc: "Credit lot",
        ops: [
          {
            table: "oto_wallets_merchant",
            ops: ["lock", "update"],
            desc: "CREDIT +fare",
          },
        ],
      },
      {
        method: "POST",
        path: "/api/admin/test/cash-session",
        port: "8082",
        desc: "Record cash",
        ops: [
          {
            table: "oto_gate_sessions",
            ops: ["insert"],
            desc: "COMPLETED CASH",
          },
          {
            table: "oto_cash_commission_tracker",
            ops: ["upsert"],
            desc: "commission +=5",
          },
          { table: "oto_session_debts", ops: ["insert"], desc: "OPEN debt" },
          {
            table: "oto_cash_session_commissions",
            ops: ["insert"],
            desc: "Audit",
          },
        ],
      },
    ],
  },
  {
    label: "Cancel",
    color: "#EF4444",
    apis: [
      {
        method: "POST",
        path: "/api/booking/cancel/preview",
        port: "8080",
        desc: "Check eligibility",
        ops: [
          { table: "oto_parking_booking", ops: ["select"], desc: "Time check" },
        ],
      },
      {
        method: "POST",
        path: "/api/booking/cancel/confirm",
        port: "8080",
        desc: "Execute refund",
        ops: [
          {
            table: "oto_wallets",
            ops: ["lock", "update"],
            desc: "CREDIT refund",
          },
          {
            table: "oto_wallets_platform",
            ops: ["lock", "update"],
            desc: "Reverse",
          },
          {
            table: "oto_escrow_records",
            ops: ["lock", "update"],
            desc: "→ REVERSED",
          },
          {
            table: "oto_parking_booking",
            ops: ["update"],
            desc: "→ CANCELLED",
          },
          { table: "oto_wallet_ledger", ops: ["insert"], desc: "Reversals" },
        ],
      },
    ],
  },
  {
    label: "Overstay",
    color: "#EC4899",
    apis: [
      {
        method: "POST",
        path: "/api/booking/extension/preview",
        port: "8080",
        desc: "Compute cost",
        ops: [{ table: "parking_tariffs", ops: ["select"], desc: "Rate" }],
      },
      {
        method: "POST",
        path: "/api/booking/extension/confirm",
        port: "8080",
        desc: "Charge",
        ops: [
          { table: "oto_wallets", ops: ["lock", "update"], desc: "DEBIT ext" },
          {
            table: "oto_parking_booking",
            ops: ["update"],
            desc: "has_extension",
          },
          { table: "oto_escrow_records", ops: ["insert"], desc: "Ext escrow" },
        ],
      },
    ],
  },
  {
    label: "Hard Reset",
    color: "#78716C",
    apis: [
      {
        method: "POST",
        path: "/api/reset-test-data",
        port: "3002",
        desc: "Zero test data",
        ops: [
          { table: "oto_session_debts", ops: ["delete"], desc: "DELETE" },
          { table: "oto_escrow_records", ops: ["delete"], desc: "DELETE" },
          { table: "oto_booking_payment", ops: ["delete"], desc: "DELETE" },
          { table: "oto_parking_booking", ops: ["delete"], desc: "DELETE" },
          { table: "oto_wallets", ops: ["update"], desc: "→ 0" },
          { table: "oto_wallets_merchant", ops: ["update"], desc: "→ 0" },
          { table: "oto_transactions", ops: ["delete"], desc: "DELETE" },
          { table: "oto_wallet_ledger", ops: ["delete"], desc: "DELETE" },
        ],
      },
    ],
  },
];

/* ── Radial Tree (outward) ─────────────────────────────────────────── */

const CX = 900,
  CY = 680;
const SC_R = 230,
  API_R = 490,
  TBL_R = 790;

function buildGraph() {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const N = SCENARIO_DEFS.length;

  function polar(r: number, angle: number) {
    return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
  }

  // Root node
  nodes.push({
    id: "root",
    type: "rootNode",
    position: { x: CX, y: CY },
    data: { label: "Finance", count: N },
  });

  // Tables on outer ring
  const allTables = new Set<string>();
  for (const sc of SCENARIO_DEFS)
    for (const api of sc.apis) for (const o of api.ops) allTables.add(o.table);
  const tableList = [...allTables];
  const TT = tableList.length;
  for (let ti = 0; ti < TT; ti++) {
    const a = (ti / TT) * Math.PI * 2 - Math.PI / 2;
    const p = polar(TBL_R, a);
    const t = tableList[ti];
    nodes.push({
      id: `tbl-${t.replace(/[^a-z0-9]/gi, "-")}`,
      type: "dbTable",
      position: p,
      data: { label: t },
    });
  }

  for (let si = 0; si < N; si++) {
    const sc = SCENARIO_DEFS[si];
    const scId = `sc-${sc.label.toLowerCase().replace(/\s+/g, "-")}`;
    const scAngle = (si / N) * Math.PI * 2 - Math.PI / 2;
    const scPos = polar(SC_R, scAngle);
    nodes.push({
      id: scId,
      type: "scenarioGroup",
      position: scPos,
      data: { label: sc.label, color: sc.color, count: sc.apis.length },
    });
    // Pre-compute all apiIds for this scenario so the root→scenario
    // connector can light up when any of its children's route is active.
    const apiIds = Array.from(
      { length: sc.apis.length },
      (_, ai) => `${scId}-${ai}`,
    );
    edges.push({
      id: `root-${scId}`,
      source: "root",
      target: scId,
      type: "connectorEdge",
      data: { color: sc.color, apiIds },
    });

    const M = sc.apis.length;
    const sectorAngle = (2 * Math.PI) / N;
    for (let ai = 0; ai < M; ai++) {
      const api = sc.apis[ai];
      const aId = `${scId}-${ai}`;
      const spread = M === 1 ? 0 : (ai / (M - 1) - 0.5) * sectorAngle * 0.72;
      const apiPos = polar(API_R, scAngle + spread);
      nodes.push({
        id: aId,
        type: "apiEndpoint",
        position: apiPos,
        data: {
          method: api.method,
          path: `:${api.port}${api.path}`,
          color: sc.color,
        },
      });
      edges.push({
        id: `${scId}-${aId}`,
        source: scId,
        target: aId,
        type: "connectorEdge",
        data: { color: sc.color, apiId: aId },
      });

      const eCounts = new Map<string, number>();
      for (const o of api.ops) {
        const tId = `tbl-${o.table.replace(/[^a-z0-9]/gi, "-")}`;
        for (const op of o.ops) {
          const pk = `${aId}-${tId}`;
          const idx = eCounts.get(pk) ?? 0;
          eCounts.set(pk, idx + 1);
          edges.push({
            id: `${aId}-${tId}-${op}`,
            source: aId,
            target: tId,
            type: "opEdge",
            data: {
              op,
              desc: o.desc,
              color: sc.color,
              apiId: aId,
              labelOffset: idx,
            },
          });
        }
      }
    }
  }
  return { nodes, edges };
}

/* ── Custom Nodes ───────────────────────────────────────────────────── */

const ALL_POSITIONS = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
];

function RadialHandles() {
  return (
    <>
      {ALL_POSITIONS.map((p) => (
        <Handle
          key={`s-${p}`}
          type="source"
          position={p}
          id={`s-${p}`}
          style={{ visibility: "hidden" }}
        />
      ))}
      {ALL_POSITIONS.map((p) => (
        <Handle
          key={`t-${p}`}
          type="target"
          position={p}
          id={`t-${p}`}
          style={{ visibility: "hidden" }}
        />
      ))}
    </>
  );
}

function ScenarioGroupNode({ data, id }: NodeProps) {
  const d = data as unknown as { label: string; color: string; count: number };
  const { focus } = useContext(CanvasCtx);
  const inFocus = focus === null || focus.nodeIds.has(id);
  const isPrimary = focus?.scId === id;
  return (
    <div
      className="rounded-lg px-3.5 py-2 text-xs font-bold font-mono text-white shadow-lg flex items-center gap-2"
      style={{
        background: d.color,
        minWidth: 124,
        opacity: inFocus ? 1 : 0.07,
        boxShadow: isPrimary
          ? `0 0 0 2.5px white, 0 0 22px ${d.color}, 0 10px 36px rgba(0,0,0,0.35)`
          : undefined,
        transition: "opacity 0.25s ease, box-shadow 0.25s ease",
      }}
    >
      <RadialHandles />
      <span>{d.label}</span>
      <span className="ml-auto text-[10px] bg-white/25 rounded px-1.5 py-0.5">
        {d.count}
      </span>
    </div>
  );
}

function ApiEndpointNode({ data, id }: NodeProps) {
  const d = data as unknown as { method: string; path: string; color: string };
  const T = useTheme();
  const { focus } = useContext(CanvasCtx);
  const inFocus = focus === null || focus.nodeIds.has(id);
  return (
    <div
      className="rounded-md border px-2.5 py-1.5 font-mono shadow-sm"
      style={{
        background: T.card,
        borderColor: d.color + "40",
        borderLeftWidth: 3,
        borderLeftColor: d.color,
        maxWidth: 210,
        opacity: inFocus ? 1 : 0.07,
        transition: "opacity 0.25s ease",
      }}
    >
      <RadialHandles />
      <div className="flex items-center gap-1.5">
        <span
          className="font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0"
          style={{ background: d.color + "22", color: d.color }}
        >
          {d.method}
        </span>
        <span className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
          {d.path}
        </span>
      </div>
    </div>
  );
}

function DbTableNode({ data, id }: NodeProps) {
  const d = data as unknown as { label: string };
  const T = useTheme();
  const { focus } = useContext(CanvasCtx);
  const inFocus = focus === null || focus.nodeIds.has(id);
  return (
    <div
      className="rounded-md border px-2.5 py-1.5 text-[11px] font-mono shadow-sm flex items-center gap-1.5"
      style={{
        background: T.card,
        borderColor: T.border,
        minWidth: 130,
        opacity: inFocus ? 1 : 0.07,
        transition: "opacity 0.25s ease",
      }}
    >
      <RadialHandles />
      <Database className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
      <span className="text-zinc-700 dark:text-zinc-300 font-semibold">
        {d.label}
      </span>
    </div>
  );
}

function RootNode({ data }: NodeProps) {
  const d = data as unknown as { label: string; count: number };
  const { focus } = useContext(CanvasCtx);
  return (
    <div
      className="rounded-2xl px-6 py-3 font-bold text-white shadow-2xl"
      style={{
        background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
        boxShadow: "0 0 28px rgba(99,102,241,0.45)",
        textAlign: "center",
        minWidth: 108,
        opacity: focus !== null ? 0.25 : 1,
        transition: "opacity 0.25s ease",
      }}
    >
      <RadialHandles />
      <div className="text-sm tracking-wider">{d.label}</div>
      <div className="text-[10px] opacity-70 mt-0.5 font-normal">
        {d.count} flows
      </div>
    </div>
  );
}

/* ── Custom Edge ────────────────────────────────────────────────────── */

function ConnectorEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { routeApiId, focus } = useContext(CanvasCtx);
  const d = data as unknown as
    | { color: string; apiId?: string; apiIds?: string[] }
    | undefined;
  const color = d?.color ?? "#94a3b8";
  // root→scenario connector carries apiIds[], others carry apiId
  const routeActive =
    routeApiId !== null &&
    (d?.apiId === routeApiId || (d?.apiIds?.includes(routeApiId) ?? false));
  const active = hovered || !!selected || routeActive;
  const inFocus =
    focus === null ||
    (d?.apiId
      ? focus.apiIds.has(d.apiId)
      : (d?.apiIds?.some((x) => focus.apiIds.has(x)) ?? false));
  const baseOpacity = active ? 0.85 : 0.28;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.2,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: active ? 2.5 : 1.5,
          opacity: inFocus ? baseOpacity : 0.04,
          transition: "stroke-width 0.2s ease, opacity 0.2s ease",
        }}
      />
      {/* Wide transparent hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: "pointer" }}
      />
    </>
  );
}

function OpEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { routeApiId, focus } = useContext(CanvasCtx);
  const T = useTheme();
  const d = data as unknown as
    | { op: OpKind; desc: string; color: string; apiId?: string }
    | undefined;
  const op = d?.op ?? "select";
  const color = OP_COLORS[op];
  const routeActive = !!routeApiId && d?.apiId === routeApiId;
  const active = hovered || !!selected || routeActive;
  const inFocus =
    focus === null || (d?.apiId ? focus.apiIds.has(d.apiId) : false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.2,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: active ? 2.5 : 1.5,
          opacity: inFocus ? (active ? 1 : 0.45) : 0.04,
          strokeDasharray: op === "lock" ? "4 2" : undefined,
          filter: selected ? `drop-shadow(0 0 3px ${color})` : undefined,
          transition: "stroke-width 0.2s ease, opacity 0.2s ease",
        }}
      />
      {/* Wide transparent hit area for easier hover/click targeting */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: "pointer" }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "none",
            zIndex: active ? 20 : 10,
            fontFamily: "monospace",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 5,
              fontSize: active ? 11 : 10,
              color,
              background: T.card,
              border: `1.5px solid ${color}${active ? "90" : "30"}`,
              borderRadius: 4,
              padding: active ? "2px 7px" : "1px 4px",
              opacity: inFocus ? (active ? 1 : 0.72) : 0,
              boxShadow: active ? `0 0 10px ${color}30` : undefined,
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontWeight: 700 }}>{OP_LABELS[op]}</span>
            {active && d?.desc && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 400,
                  opacity: 0.7,
                  color: color + "99",
                }}
              >
                {d.desc}
              </span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = {
  scenarioGroup: ScenarioGroupNode,
  apiEndpoint: ApiEndpointNode,
  dbTable: DbTableNode,
  rootNode: RootNode,
};
const edgeTypes = { opEdge: OpEdge, connectorEdge: ConnectorEdge };

/* ── Main ────────────────────────────────────────────────────────────── */

export default function ApiDbFlowCanvas() {
  const T = useTheme();
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(),
    [],
  );
  const [nodes] = useNodesState(initialNodes);
  const [edges] = useEdgesState(initialEdges);

  /* ── Route highlight ── */
  const [hoverApiId, setHoverApiId] = useState<string | null>(null);
  const [lockedApiId, setLockedApiId] = useState<string | null>(null);
  const routeApiId = lockedApiId ?? hoverApiId;
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  /* ── Scenario focus ── */
  const [focusState, setFocusState] = useState<FocusState | null>(null);

  const handleNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_: any, node: Node) => {
      if (node.type !== "scenarioGroup") return;
      const scId = node.id;
      setFocusState((prev) => {
        if (prev?.scId === scId) return null; // toggle off
        // Collect api ids: scenario→api connectors have target = aId
        const apiIds = new Set(
          initialEdges
            .filter((e) => e.type === "connectorEdge" && e.source === scId)
            .map((e) => e.target),
        );
        // Collect table node ids: op edges whose source is one of our apis
        const nodeIds = new Set([scId, ...apiIds]);
        for (const edge of initialEdges) {
          if (edge.type === "opEdge" && apiIds.has(edge.source))
            nodeIds.add(edge.target);
        }
        return { scId, nodeIds, apiIds };
      });
      // Clear any locked route when switching focus
      setLockedApiId(null);
    },
    [initialEdges],
  );

  /** Return the API-node id that owns this edge, or null. */
  const getApiId = useCallback((edge: Edge): string | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (edge.data as any)?.apiId ?? null;
  }, []);

  const handleEdgeMouseEnter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_: any, edge: Edge) => {
      clearTimeout(clearTimer.current);
      setHoverApiId(getApiId(edge));
    },
    [getApiId],
  );

  const handleEdgeMouseLeave = useCallback(() => {
    clearTimer.current = setTimeout(() => setHoverApiId(null), 40);
  }, []);

  const handleEdgeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_: any, edge: Edge) => {
      const id = getApiId(edge);
      if (!id) return;
      // Toggle lock: clicking the same route unlocks it
      setLockedApiId((prev) => (prev === id ? null : id));
    },
    [getApiId],
  );

  const handlePaneClick = useCallback(() => {
    setLockedApiId(null);
    setFocusState(null);
  }, []);

  return (
    <CanvasCtx.Provider value={{ routeApiId, focus: focusState }}>
      <div className="w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.28 }}
          nodeOrigin={[0.5, 0.5]}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          minZoom={0.1}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          onEdgeMouseEnter={handleEdgeMouseEnter}
          onEdgeMouseLeave={handleEdgeMouseLeave}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onNodeClick={handleNodeClick}
        >
          <Background color={T.border} gap={24} size={1} />
        </ReactFlow>
        <div className="absolute bottom-3 right-3 z-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 px-3 py-2 shadow-sm">
          <div className="text-[9px] font-mono font-semibold text-zinc-500 mb-1.5">
            Operations
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(OP_COLORS) as [OpKind, string][]).map(
              ([op, color]) => (
                <span
                  key={op}
                  className="inline-flex items-center gap-1 text-[8px] font-mono font-semibold rounded px-1.5 py-0.5"
                  style={{
                    color,
                    background: color + "14",
                    border: `1px solid ${color}30`,
                  }}
                >
                  {OP_LABELS[op]}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </CanvasCtx.Provider>
  );
}
