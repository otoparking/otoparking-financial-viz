"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Layers, Info } from "lucide-react";
import type { ApiEndpoint } from "@/types/api-tester";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";

// ─── Method colors (structural, not palette) ─────────────────────────────────

const METHOD_COLORS: Record<
  string,
  {
    bg: string;
    textDark: string;
    textLight: string;
    glow: string;
    border: string;
  }
> = {
  GET: {
    bg: "#1D9E75",
    textDark: "#E5F7F1",
    textLight: "#ffffff",
    glow: "rgba(29,158,117,0.50)",
    border: "rgba(29,158,117,0.35)",
  },
  POST: {
    bg: "#378ADD",
    textDark: "#E3F0FC",
    textLight: "#ffffff",
    glow: "rgba(55,138,221,0.50)",
    border: "rgba(55,138,221,0.35)",
  },
  PUT: {
    bg: "#F59E0B",
    textDark: "#FFF8EB",
    textLight: "#1a1200",
    glow: "rgba(245,158,11,0.50)",
    border: "rgba(245,158,11,0.35)",
  },
  DELETE: {
    bg: "#EF4444",
    textDark: "#FEEBEB",
    textLight: "#ffffff",
    glow: "rgba(239,68,68,0.50)",
    border: "rgba(239,68,68,0.35)",
  },
};

// ─── JSON Viewer ──────────────────────────────────────────────────────────────

interface JsonCodeProps {
  data: Record<string, unknown>;
  leftBorder?: string;
  theme: ThemeTokens;
}

const JsonCode = memo(function JsonCode({
  data,
  leftBorder,
  theme: T,
}: JsonCodeProps) {
  const lines = useMemo(() => {
    return JSON.stringify(data, null, 2)
      .split("\n")
      .map((line: string, i: number) => {
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : "";
        const rest = line.slice(indent.length);

        const keyMatch = rest.match(/^"([^"]+)"(\s*:.*)$/);
        if (keyMatch) {
          const valueRaw = keyMatch[2];
          const colonIdx = valueRaw.indexOf(":");
          const colon = valueRaw.slice(0, colonIdx + 1);
          const value = valueRaw.slice(colonIdx + 1);
          return (
            <div key={i} style={{ display: "flex", minHeight: "1.5rem" }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 28,
                  textAlign: "right",
                  paddingRight: 10,
                  userSelect: "none",
                  fontSize: 10,
                  color: T.textDim,
                  fontFamily: "monospace",
                  lineHeight: "1.6",
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 13,
                  lineHeight: "1.6",
                  whiteSpace: "pre",
                }}
              >
                {indent}
                <span style={{ color: T.accent }}>
                  &quot;{keyMatch[1]}&quot;
                </span>
                <span style={{ color: T.textMuted }}>{colon}</span>
                <span
                  style={{
                    color: T.isDark
                      ? "oklch(0.82 0.04 145)"
                      : "oklch(0.35 0.10 145)",
                  }}
                >
                  {value}
                </span>
              </span>
            </div>
          );
        }

        const cPunct = T.isDark
          ? "oklch(0.40 0.03 175)"
          : "oklch(0.30 0.04 175)";
        const cBool = T.isDark ? "oklch(0.72 0.12 60)" : "oklch(0.48 0.14 55)";
        const cNum = T.isDark ? "oklch(0.78 0.09 220)" : "oklch(0.38 0.14 230)";
        const colored = rest
          .replace(/([{}[\],])/g, `<span style="color:${cPunct}">$1</span>`)
          .replace(
            /(true|false|null)/g,
            `<span style="color:${cBool}">$1</span>`,
          )
          .replace(/(-?\d+\.?\d*)/g, `<span style="color:${cNum}">$1</span>`);

        return (
          <div key={i} style={{ display: "flex", minHeight: "1.5rem" }}>
            <span
              style={{
                flexShrink: 0,
                width: 28,
                textAlign: "right",
                paddingRight: 10,
                userSelect: "none",
                fontSize: 10,
                color: T.textDim,
                fontFamily: "monospace",
                lineHeight: "1.6",
              }}
            >
              {i + 1}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                lineHeight: "1.6",
                whiteSpace: "pre",
                color: T.textMuted,
              }}
              dangerouslySetInnerHTML={{ __html: indent + colored }}
            />
          </div>
        );
      });
  }, [data, T]);

  return (
    <div
      style={{
        background: T.bg,
        borderLeft: leftBorder ? `2px solid ${leftBorder}` : undefined,
        borderRadius: leftBorder ? "0 8px 8px 0" : 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 12px 10px 4px",
          overflowY: "auto",
          maxHeight: 280,
        }}
      >
        {lines}
      </div>
    </div>
  );
});

// ─── Idle Architecture Diagram ────────────────────────────────────────────────

function IdleArchitectureDiagram({ theme: T }: { theme: ThemeTokens }) {
  const VW = 800;
  const VH = 320;

  // Node center x positions
  const nodeXs = [80, 220, 360, 500, 680];
  const yMid = 160;

  // Build paths between each adjacent pair
  const segPaths = [
    // CLIENT → GATEWAY
    `M ${nodeXs[0] + 44} ${yMid} C ${nodeXs[0] + 100} ${yMid}, ${nodeXs[1] - 55} ${yMid}, ${nodeXs[1] - 40} ${yMid}`,
    // GATEWAY → AUTH
    `M ${nodeXs[1] + 40} ${yMid} C ${nodeXs[1] + 80} ${yMid}, ${nodeXs[2] - 50} ${yMid}, ${nodeXs[2] - 32} ${yMid}`,
    // AUTH → LAMBDA
    `M ${nodeXs[2] + 32} ${yMid} C ${nodeXs[2] + 80} ${yMid}, ${nodeXs[3] - 55} ${yMid}, ${nodeXs[3] - 44} ${yMid}`,
    // LAMBDA → DATABASE
    `M ${nodeXs[3] + 44} ${yMid} C ${nodeXs[3] + 90} ${yMid}, ${nodeXs[4] - 55} ${yMid}, ${nodeXs[4] - 38} ${yMid}`,
  ];

  // Ghost method pills below diagram
  const methodBadges = [
    { method: "GET", x: 150, y: 268 },
    { method: "POST", x: 270, y: 268 },
    { method: "PUT", x: 390, y: 268 },
    { method: "DELETE", x: 530, y: 268 },
  ];

  // Hexagon points helper for GATEWAY node
  const hexPts = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 180) * (60 * k - 30);
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 24,
      }}
    >
      {/* Headline text */}
      <motion.div
        style={{ textAlign: "center" }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48 }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            color: T.textDim,
            marginBottom: 5,
            textTransform: "uppercase",
          }}
        >
          API Tester
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: T.text,
          }}
        >
          Select an Endpoint
        </div>
        <div style={{ fontSize: 13, color: T.textMuted, marginTop: 5 }}>
          Pick any endpoint from the catalog on the left to inspect its contract
        </div>
      </motion.div>

      {/* SVG Architecture Diagram */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.14 }}
        style={{ width: VW, maxWidth: "100%", overflow: "hidden" }}
      >
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          style={{ overflow: "visible" }}
        >
          <defs>
            <filter id="glow-a" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Connection paths ── */}
          {segPaths.map((d, i) => (
            <path
              key={`seg-${i}`}
              d={d}
              fill="none"
              stroke={T.border}
              strokeWidth="1"
              strokeDasharray="5 4"
              opacity="0.65"
            />
          ))}

          {/* ── Particles: CLIENT→GATEWAY and GATEWAY→AUTH use T.accent ── */}
          {[0, 1].map((segIdx) =>
            [0, 0.6, 1.2].map((delay, pIdx) => (
              <motion.circle
                key={`pa-${segIdx}-${pIdx}`}
                r={3}
                fill={T.accent}
                filter="url(#glow-a)"
                style={
                  {
                    offsetPath: `path("${segPaths[segIdx]}")`,
                    offsetDistance: "0%",
                  } as React.CSSProperties
                }
                animate={
                  {
                    offsetDistance: ["0%", "100%"],
                    opacity: [0, 1, 1, 0],
                  } as Parameters<typeof motion.circle>[0]["animate"]
                }
                transition={{
                  duration: 2.2,
                  delay: delay + segIdx * 0.22,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )),
          )}

          {/* ── Particles: AUTH→LAMBDA and LAMBDA→DB use T.green ── */}
          {[2, 3].map((segIdx) =>
            [0, 0.6, 1.2].map((delay, pIdx) => (
              <motion.circle
                key={`pg-${segIdx}-${pIdx}`}
                r={3}
                fill={T.green}
                filter="url(#glow-a)"
                style={
                  {
                    offsetPath: `path("${segPaths[segIdx]}")`,
                    offsetDistance: "0%",
                  } as React.CSSProperties
                }
                animate={
                  {
                    offsetDistance: ["0%", "100%"],
                    opacity: [0, 1, 1, 0],
                  } as Parameters<typeof motion.circle>[0]["animate"]
                }
                transition={{
                  duration: 2.2,
                  delay: delay + (segIdx - 2) * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )),
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ── NODE 0: CLIENT — rounded rect 88×56 ── */}
          <motion.g
            animate={{ scale: [1, 1.025, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${nodeXs[0]}px ${yMid}px` }}
          >
            <rect
              x={nodeXs[0] - 44}
              y={yMid - 28}
              width={88}
              height={56}
              rx="10"
              fill={T.card}
              stroke={T.border}
              strokeWidth="1"
            />
            <motion.rect
              x={nodeXs[0] - 44}
              y={yMid - 28}
              width={88}
              height={56}
              rx="10"
              fill="none"
              stroke={T.accent}
              strokeWidth="1"
              animate={{ opacity: [0.08, 0.35, 0.08] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0 }}
            />
            <text
              x={nodeXs[0]}
              y={yMid - 7}
              textAnchor="middle"
              fill={T.text}
              fontSize="10.5"
              fontFamily="monospace"
              fontWeight="700"
              letterSpacing="0.08em"
            >
              CLIENT
            </text>
            <text
              x={nodeXs[0]}
              y={yMid + 10}
              textAnchor="middle"
              fill={T.textDim}
              fontSize="8.5"
              fontFamily="monospace"
            >
              browser / app
            </text>
          </motion.g>

          {/* ── NODE 1: API GATEWAY — hexagon r=40 ── */}
          {(() => {
            const cx = nodeXs[1];
            const cy = yMid;
            const r = 40;
            const pts = hexPts(cx, cy, r);
            return (
              <motion.g
                animate={{ scale: [1, 1.025, 1] }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              >
                <polygon
                  points={pts}
                  fill={T.card}
                  stroke={T.border}
                  strokeWidth="1.2"
                />
                <motion.polygon
                  points={pts}
                  fill="none"
                  stroke={T.accent}
                  strokeWidth="1"
                  animate={{ opacity: [0.08, 0.35, 0.08] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.4 }}
                />
                <text
                  x={cx}
                  y={cy + 4}
                  textAnchor="middle"
                  fill={T.text}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="700"
                  letterSpacing="0.07em"
                >
                  GATEWAY
                </text>
              </motion.g>
            );
          })()}

          {/* ── NODE 2: AUTH — circle r=32 ── */}
          {(() => {
            const cx = nodeXs[2];
            const cy = yMid;
            const r = 32;
            return (
              <motion.g
                animate={{ scale: [1, 1.025, 1] }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.0,
                }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={T.card}
                  stroke={T.border}
                  strokeWidth="1.2"
                />
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={T.accent}
                  strokeWidth="1"
                  animate={{ opacity: [0.08, 0.35, 0.08] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
                />
                <text
                  x={cx}
                  y={cy - 5}
                  textAnchor="middle"
                  fill={T.text}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="700"
                  letterSpacing="0.08em"
                >
                  AUTH
                </text>
                <text
                  x={cx}
                  y={cy + 10}
                  textAnchor="middle"
                  fill={T.textDim}
                  fontSize="8"
                  fontFamily="monospace"
                >
                  Noscera
                </text>
              </motion.g>
            );
          })()}

          {/* ── NODE 3: LAMBDA — server rack ── */}
          {(() => {
            const cx = nodeXs[3];
            const cy = yMid;
            return (
              <motion.g
                animate={{ scale: [1, 1.025, 1] }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.5,
                }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              >
                {/* Outer rack */}
                <rect
                  x={cx - 44}
                  y={cy - 30}
                  width={88}
                  height={60}
                  rx="8"
                  fill={T.card}
                  stroke={T.border}
                  strokeWidth="1"
                />
                {/* Slot 1 */}
                <rect
                  x={cx - 36}
                  y={cy - 21}
                  width={60}
                  height={14}
                  rx="3"
                  fill={T.bg}
                />
                {/* Slot 2 */}
                <rect
                  x={cx - 36}
                  y={cy - 3}
                  width={60}
                  height={14}
                  rx="3"
                  fill={T.bg}
                />
                {/* LED dots */}
                <circle
                  cx={cx + 30}
                  cy={cy - 14}
                  r="3"
                  fill={T.accent}
                  opacity="0.8"
                />
                <circle
                  cx={cx + 30}
                  cy={cy + 4}
                  r="3"
                  fill={T.green}
                  opacity="0.8"
                />
                {/* Label below */}
                <text
                  x={cx}
                  y={cy + 44}
                  textAnchor="middle"
                  fill={T.textDim}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  LAMBDA
                </text>
                {/* Pulse ring */}
                <motion.rect
                  x={cx - 44}
                  y={cy - 30}
                  width={88}
                  height={60}
                  rx="8"
                  fill="none"
                  stroke={T.accent}
                  strokeWidth="1"
                  animate={{ opacity: [0.08, 0.35, 0.08] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 1.2 }}
                />
              </motion.g>
            );
          })()}

          {/* ── NODE 4: DATABASE — cylinder ── */}
          {(() => {
            const cx = nodeXs[4];
            const cy = yMid;
            const w = 70;
            const h = 52;
            const ry = 10;
            return (
              <motion.g
                animate={{ scale: [1, 1.025, 1] }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2.0,
                }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              >
                {/* Cylinder body */}
                <rect
                  x={cx - w / 2}
                  y={cy - h / 2 + ry / 2}
                  width={w}
                  height={h - ry}
                  fill={T.card}
                  stroke={T.border}
                  strokeWidth="1"
                />
                {/* Bottom ellipse */}
                <ellipse
                  cx={cx}
                  cy={cy + h / 2 - ry / 2}
                  rx={w / 2}
                  ry={ry / 2}
                  fill={T.card}
                  stroke={T.border}
                  strokeWidth="1"
                />
                {/* Top ellipse (cap) */}
                <ellipse
                  cx={cx}
                  cy={cy - h / 2 + ry / 2}
                  rx={w / 2}
                  ry={ry / 2}
                  fill={T.cardHover}
                  stroke={T.border}
                  strokeWidth="1"
                />
                {/* Pulse ring on top ellipse */}
                <motion.ellipse
                  cx={cx}
                  cy={cy - h / 2 + ry / 2}
                  rx={w / 2}
                  ry={ry / 2}
                  fill="none"
                  stroke={T.accent}
                  strokeWidth="1"
                  animate={{ opacity: [0.08, 0.35, 0.08] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 1.6 }}
                />
                <text
                  x={cx}
                  y={cy + 5}
                  textAnchor="middle"
                  fill={T.text}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="700"
                  letterSpacing="0.07em"
                >
                  DATABASE
                </text>
              </motion.g>
            );
          })()}

          {/* ── Floating ghost method badges ── */}
          {methodBadges.map(({ method, x, y }, idx) => {
            const mc = METHOD_COLORS[method];
            return (
              <motion.g
                key={method}
                initial={{ opacity: 0, y: y + 8 }}
                animate={{ opacity: 1, y: [y, y - 5, y] }}
                transition={{
                  duration: 0.45,
                  delay: 0.25 + idx * 0.12,
                  repeat: Infinity,
                  repeatDelay: 1.8,
                  repeatType: "loop",
                  times: [0, 0.5, 1],
                }}
              >
                <rect
                  x={x - 28}
                  y={y - 12}
                  width={56}
                  height={24}
                  rx="12"
                  fill={mc.bg}
                  opacity="0.15"
                />
                <rect
                  x={x - 28}
                  y={y - 12}
                  width={56}
                  height={24}
                  rx="12"
                  fill="none"
                  stroke={mc.bg}
                  strokeWidth="0.75"
                  opacity="0.5"
                />
                <text
                  x={x}
                  y={y + 5}
                  textAnchor="middle"
                  fill={T.isDark ? mc.textDark : mc.textLight}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="700"
                  letterSpacing="0.10em"
                  opacity="0.55"
                >
                  {method}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </motion.div>
    </div>
  );
}

// ─── Network Flow Diagram — 5-node pipeline ───────────────────────────────────

function NetworkFlowDiagram({
  endpoint,
  theme: T,
}: {
  endpoint: ApiEndpoint;
  theme: ThemeTokens;
}) {
  const mc = METHOD_COLORS[endpoint.method] ?? METHOD_COLORS.GET;
  const W = 620;
  const H = 110;
  const yMid = 55;

  // Five node x-positions
  const nxs = [40, 155, 270, 385, 550];
  const nodeW = 52;
  const nodeH = 28;

  // Forward path from CLIENT(0) to DB(4)
  const fwdPath = `M ${nxs[0] + nodeW / 2} ${yMid} C ${nxs[0] + 120} ${yMid - 28}, ${nxs[4] - 120} ${yMid - 28}, ${nxs[4]} ${yMid}`;
  // Return path from DB(4) to CLIENT(0)
  const retPath = `M ${nxs[4]} ${yMid} C ${nxs[4] - 120} ${yMid + 28}, ${nxs[0] + 120} ${yMid + 28}, ${nxs[0] + nodeW / 2} ${yMid}`;

  const nodeLabels = ["CLIENT", "GATEWAY", "AUTH", "LAMBDA", "DB"];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
      <defs>
        <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track lines */}
      <path
        d={fwdPath}
        fill="none"
        stroke={mc.bg}
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.35"
      />
      <path
        d={retPath}
        fill="none"
        stroke={T.green}
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.35"
      />

      {/* Five nodes */}
      {nxs.map((nx, i) => (
        <g key={i}>
          <rect
            x={nx - nodeW / 2}
            y={yMid - nodeH / 2}
            width={nodeW}
            height={nodeH}
            rx="6"
            fill={T.card}
            stroke={T.border}
            strokeWidth="1"
          />
          <text
            x={nx}
            y={yMid + 4}
            textAnchor="middle"
            fill={T.text}
            fontSize="9"
            fontFamily="monospace"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            {nodeLabels[i]}
          </text>
          {/* Accent corner dot */}
          <rect
            x={nx + nodeW / 2 - 6}
            y={yMid - nodeH / 2}
            width={4}
            height={4}
            rx="2"
            fill={T.accent}
            opacity="0.6"
          />
        </g>
      ))}

      {/* Traveling method pill — forward */}
      <motion.g
        style={
          {
            offsetPath: `path("${fwdPath}")`,
            offsetDistance: "0%",
          } as React.CSSProperties
        }
        animate={
          {
            offsetDistance: ["5%", "95%"],
            opacity: [0, 1, 1, 0],
          } as Parameters<typeof motion.g>[0]["animate"]
        }
        transition={{
          duration: 2.2,
          repeat: Infinity,
          repeatDelay: 0.3,
          ease: "easeInOut",
        }}
      >
        <rect
          x="-22"
          y="-10"
          width="44"
          height="20"
          rx="10"
          fill={mc.bg}
          opacity="0.95"
        />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fill={T.isDark ? mc.textDark : mc.textLight}
          fontSize="8.5"
          fontFamily="monospace"
          fontWeight="700"
          letterSpacing="0.08em"
        >
          {endpoint.method}
        </text>
      </motion.g>

      {/* Traveling 200 pill — return */}
      <motion.g
        style={
          {
            offsetPath: `path("${retPath}")`,
            offsetDistance: "0%",
          } as React.CSSProperties
        }
        animate={
          {
            offsetDistance: ["5%", "95%"],
            opacity: [0, 1, 1, 0],
          } as Parameters<typeof motion.g>[0]["animate"]
        }
        transition={{
          duration: 2.2,
          delay: 1.1,
          repeat: Infinity,
          repeatDelay: 0.3,
          ease: "easeInOut",
        }}
      >
        <rect
          x="-18"
          y="-10"
          width="36"
          height="20"
          rx="10"
          fill={T.green}
          opacity="0.95"
        />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fill={T.isDark ? "#E5F7F1" : "#ffffff"}
          fontSize="8.5"
          fontFamily="monospace"
          fontWeight="700"
          letterSpacing="0.04em"
        >
          200
        </text>
      </motion.g>
    </svg>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({
  children,
  delay = 0,
  style = {},
  theme: T,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  theme: ThemeTokens;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        overflow: "hidden",
        backdropFilter: "blur(8px)",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Card section label ────────────────────────────────────────────────────

function SectionLabel({
  label,
  accent,
  theme: T,
}: {
  label: string;
  accent?: string;
  theme: ThemeTokens;
}) {
  return (
    <div
      style={{
        padding: "9px 16px 9px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: accent ?? T.accent,
          boxShadow: `0 0 6px ${accent ?? T.accent}`,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 10,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: accent ?? T.accent,
          fontWeight: 700,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Endpoint Detail View ─────────────────────────────────────────────────────

function EndpointDetail({
  endpoint,
  theme: T,
}: {
  endpoint: ApiEndpoint;
  theme: ThemeTokens;
}) {
  const mc = METHOD_COLORS[endpoint.method] ?? METHOD_COLORS.GET;

  return (
    <motion.div
      key={endpoint.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "16px 16px 8px",
      }}
    >
      {/* Card 1 — Request header */}
      <Card delay={0.03} theme={T}>
        <SectionLabel label="Request" accent={mc.bg} theme={T} />
        <div style={{ padding: "14px 16px 16px" }}>
          {/* Method + path row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 14px",
                borderRadius: 99,
                background: mc.bg,
                color: T.isDark ? mc.textDark : mc.textLight,
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.12em",
                boxShadow: `0 0 18px ${mc.glow}, 0 0 6px ${mc.glow}`,
                flexShrink: 0,
              }}
            >
              {endpoint.method}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 15,
                fontWeight: 600,
                color: T.text,
                letterSpacing: "-0.01em",
                overflowWrap: "anywhere",
              }}
            >
              {endpoint.path}
            </span>
          </div>

          {/* Module chip */}
          <div style={{ marginBottom: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px 3px 8px",
                borderRadius: 6,
                background: T.accentBg,
                border: `0.5px solid ${T.borderActive}`,
                color: T.accent,
                fontFamily: "monospace",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                fontWeight: 600,
              }}
            >
              <Layers size={9} strokeWidth={2.5} />
              {endpoint.module}
            </span>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: 13,
              color: T.textMuted,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {endpoint.description}
          </p>
        </div>
      </Card>

      {/* Card 2 — Network flow */}
      <Card delay={0.08} theme={T}>
        <SectionLabel label="Network Flow" theme={T} />
        <div style={{ padding: "10px 16px 14px" }}>
          <NetworkFlowDiagram endpoint={endpoint} theme={T} />
        </div>
      </Card>

      {/* Card 3 — Request body (conditional) */}
      {endpoint.requestBody && (
        <Card delay={0.13} theme={T}>
          <SectionLabel label="Request Body" accent={mc.bg} theme={T} />
          <div style={{ padding: "10px 12px 12px" }}>
            <JsonCode data={endpoint.requestBody} theme={T} />
          </div>
        </Card>
      )}

      {/* Card 4 — Response */}
      <Card delay={endpoint.requestBody ? 0.18 : 0.13} theme={T}>
        <div
          style={{
            padding: "9px 16px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: T.green,
              boxShadow: `0 0 6px ${T.green}`,
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              letterSpacing: "0.10em",
              textTransform: "uppercase" as const,
              color: T.green,
              fontWeight: 700,
            }}
          >
            Response
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 700,
              color: T.green,
              letterSpacing: "0.04em",
              background: `${T.green}1f`,
              padding: "2px 10px",
              borderRadius: 99,
              border: `0.5px solid ${T.green}4d`,
            }}
          >
            200 OK
          </span>
        </div>
        <div style={{ padding: "10px 12px 12px" }}>
          <JsonCode
            data={endpoint.responseExample}
            leftBorder={T.green}
            theme={T}
          />
        </div>
      </Card>

      {/* Notes row */}
      {endpoint.notes && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22 }}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 10,
            background: T.accentBg,
            border: `0.5px solid ${T.borderActive}`,
          }}
        >
          <Info
            size={12}
            strokeWidth={2}
            color={T.accent}
            style={{ marginTop: 1, flexShrink: 0, opacity: 0.6 }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: T.textDim,
              lineHeight: 1.6,
            }}
          >
            {endpoint.notes}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Result Console ───────────────────────────────────────────────────────────

function ResultConsole({
  endpoint,
  theme: T,
}: {
  endpoint: ApiEndpoint | null;
  theme: ThemeTokens;
}) {
  const mc = endpoint
    ? (METHOD_COLORS[endpoint.method] ?? METHOD_COLORS.GET)
    : null;

  const timingRows: { label: string; value: number; max: number }[] = [
    { label: "DNS", value: 8, max: 50 },
    { label: "Connect", value: 12, max: 50 },
    { label: "TTFB", value: 22, max: 50 },
    { label: "Transfer", value: 0, max: 50 },
  ];

  const headerRows = [
    { key: "content-type", value: "application/json" },
    { key: "x-request-id", value: "req_9f3a2b" },
    { key: "x-module", value: endpoint?.module ?? "-" },
    { key: "cache-control", value: "no-cache" },
  ];

  return (
    <div
      style={{
        height: 220,
        flexShrink: 0,
        borderTop: `1px solid ${T.border}`,
        background: T.header,
        display: "flex",
        alignItems: "stretch",
      }}
    >
      <AnimatePresence mode="wait">
        {!endpoint ? (
          /* ── Idle state ── */
          <motion.div
            key="awaiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <motion.div
                animate={{ opacity: [0.25, 0.9, 0.25], scale: [1, 1.25, 1] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: T.textDim,
                  boxShadow: `0 0 10px ${T.textDim}`,
                }}
              />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 13,
                  color: T.textDim,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Awaiting request...
              </span>
            </div>
          </motion.div>
        ) : (
          /* ── Result state: 3 columns ── */
          <motion.div
            key={endpoint.id + "-result"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            style={{ flex: 1, display: "flex", overflow: "hidden" }}
          >
            {/* ── Column 1: Status (25%) ── */}
            <div
              style={{
                width: "25%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRight: `1px solid ${T.border}`,
                gap: 5,
                padding: "0 16px",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 48,
                    fontWeight: 800,
                    color: T.green,
                    letterSpacing: "-0.04em",
                    textShadow: `0 0 32px ${T.green}99, 0 0 10px ${T.green}55`,
                    lineHeight: 1,
                  }}
                >
                  200
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 18,
                    fontWeight: 700,
                    color: T.green,
                    opacity: 0.75,
                    letterSpacing: "0.06em",
                  }}
                >
                  OK
                </span>
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  color: T.green,
                  background: `${T.green}1a`,
                  border: `0.5px solid ${T.green}44`,
                  padding: "2px 12px",
                  borderRadius: 99,
                  letterSpacing: "0.08em",
                  marginTop: 2,
                }}
              >
                42ms
              </div>
            </div>

            {/* ── Column 2: Timing (35%) ── */}
            <div
              style={{
                width: "35%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                borderRight: `1px solid ${T.border}`,
                padding: "12px 18px",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: T.textDim,
                  fontWeight: 700,
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Activity size={10} strokeWidth={2} color={T.textDim} />
                Timing
              </div>
              {timingRows.map(({ label, value, max }, idx) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 9,
                      color: T.textDim,
                      width: 46,
                      flexShrink: 0,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {label}
                  </span>
                  {/* Progress bar track */}
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background: T.borderSubtle,
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(value / max) * 100}%` }}
                      transition={{
                        duration: 0.6,
                        delay: 0.1 + idx * 0.08,
                        ease: "easeOut",
                      }}
                      style={{
                        height: "100%",
                        borderRadius: 2,
                        background: idx < 2 ? mc!.bg : T.green,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 9,
                      color: T.textMuted,
                      width: 28,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {value}ms
                  </span>
                </div>
              ))}
            </div>

            {/* ── Column 3: Response Headers (40%) ── */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "12px 18px",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: T.textDim,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Response Headers
              </div>
              {headerRows.map(({ key, value }) => (
                <div
                  key={key}
                  style={{ display: "flex", alignItems: "baseline", gap: 6 }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 9,
                      color: T.textDim,
                      flexShrink: 0,
                      width: 90,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {key}
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 9,
                      color: T.textMuted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ApiTesterCanvas({
  selectedEndpoint,
}: {
  selectedEndpoint: ApiEndpoint | null;
}) {
  const T = useTheme();
  const mc = selectedEndpoint
    ? (METHOD_COLORS[selectedEndpoint.method] ?? METHOD_COLORS.GET)
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: T.bg,
        overflow: "hidden",
      }}
    >
      {/* ── Header bar (44px) ── */}
      <div
        style={{
          height: 44,
          flexShrink: 0,
          background: T.header,
          borderBottom: `1px solid ${T.border}`,
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
      >
        {/* Left: accent square + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <motion.div
            animate={
              selectedEndpoint
                ? {
                    boxShadow: [
                      `0 0 6px ${T.accentBg}`,
                      `0 0 16px ${T.accentBg}`,
                      `0 0 6px ${T.accentBg}`,
                    ],
                  }
                : { boxShadow: "0 0 0px transparent" }
            }
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 8,
              height: 8,
              background: T.accent,
              borderRadius: 2,
              boxShadow: selectedEndpoint ? `0 0 10px ${T.accentBg}` : "none",
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: T.text,
            }}
          >
            API Tester
          </span>
        </div>

        {/* Right: AnimatePresence between status badges */}
        <AnimatePresence mode="wait">
          {!selectedEndpoint ? (
            <motion.span
              key="no-sel"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: T.textDim,
                background: T.card,
                border: `1px solid ${T.border}`,
                padding: "3px 10px",
                borderRadius: 99,
              }}
            >
              Select Endpoint
            </motion.span>
          ) : (
            <motion.div
              key={selectedEndpoint.id + "-badge"}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  background: mc!.bg,
                  color: T.isDark ? mc!.textDark : mc!.textLight,
                  padding: "3px 9px",
                  borderRadius: 99,
                  boxShadow: `0 0 8px ${mc!.glow}`,
                }}
              >
                {selectedEndpoint.method}
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  color: T.accent,
                  background: T.accentBg,
                  border: `0.5px solid ${T.borderActive}`,
                  padding: "3px 9px",
                  borderRadius: 99,
                  textTransform: "uppercase" as const,
                  opacity: 0.9,
                }}
              >
                {selectedEndpoint.module}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main visualization area (flex-1, scrollable) ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          {!selectedEndpoint ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ height: "100%", minHeight: 380, padding: "0 16px" }}
            >
              <IdleArchitectureDiagram theme={T} />
            </motion.div>
          ) : (
            <motion.div
              key={selectedEndpoint.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <EndpointDetail endpoint={selectedEndpoint} theme={T} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Result console (220px) ── */}
      <ResultConsole endpoint={selectedEndpoint} theme={T} />
    </div>
  );
}
