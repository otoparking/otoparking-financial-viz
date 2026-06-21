"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import type { GateEventType, GateSession, CarAnimData } from "@/types/gate";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";

/* ── Event color / label ─────────────────────────────────────────────── */

function EVENT_COLOR(T: ThemeTokens): Record<GateEventType, string> {
  return {
    "entry-scan": T.blue,
    "entry-granted": T.green,
    "entry-denied": T.red,
    "exit-scan": T.escrow,
    "exit-granted": T.green,
    "exit-denied": T.red,
    "session-switch": T.purple,
    "ticket-digitalize": T.blue,
    "cash-payment": T.amber,
    "orphan-detected": T.red,
    info: "#6B7280",
  };
}

const EVENT_LABEL: Record<GateEventType, string> = {
  "entry-scan": "Scanning plate at entry",
  "entry-granted": "Entry granted — barrier open",
  "entry-denied": "Entry denied",
  "exit-scan": "Scanning plate at exit",
  "exit-granted": "Exit granted — barrier open",
  "exit-denied": "Exit denied — insufficient funds",
  "session-switch": "Session switch",
  "ticket-digitalize": "Ticket digitalized",
  "cash-payment": "Cash payment collected",
  "orphan-detected": "Orphan session detected",
  info: "Processing",
};

/* ── Props ───────────────────────────────────────────────────────────── */

interface GateCanvasProps {
  sessions: GateSession[];
  activeEvent: GateEventType | null;
  currentStep: string;
  cars: CarAnimData[];
  running: boolean;
}

/* ── Layout fractions ────────────────────────────────────────────────── */

const ENTRY_X_FRAC = 0.22;
const EXIT_X_FRAC = 0.78;
const LOT_X_FRAC = 0.5;
const ROAD_TOP_FRAC = 0.55;
const ROAD_H_FRAC = 0.27;
const CAR_W = 52;
const CAR_H = 30;

/* ── Traffic light ───────────────────────────────────────────────────── */

function TrafficLight({
  state,
  theme,
}: {
  state: "red" | "green" | "idle";
  theme: ThemeTokens;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 rounded-lg"
      style={{
        width: 22,
        height: 52,
        background: theme.asphalt,
        border: `1.5px solid ${theme.border}`,
        padding: "6px 0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      }}
    >
      {(["red", "green"] as const).map((c) => (
        <div
          key={c}
          className="rounded-full"
          style={{
            width: 10,
            height: 10,
            background:
              state === c ? (c === "red" ? theme.red : theme.green) : "#1a1a1a",
            boxShadow:
              state === c
                ? `0 0 10px 3px ${c === "red" ? `${theme.red}66` : `${theme.green}66`}`
                : "none",
            transition: "background 0.3s, box-shadow 0.3s",
          }}
        />
      ))}
    </div>
  );
}

/* ── Camera on pole ──────────────────────────────────────────────────── */

function Camera({
  scanning,
  color,
  poleH,
  theme,
}: {
  scanning: boolean;
  color: string;
  poleH: number;
  theme: ThemeTokens;
}) {
  return (
    <div className="relative flex flex-col items-center">
      <div
        style={{
          width: 4,
          height: poleH,
          background: "linear-gradient(180deg, #9ca3af 0%, #374151 100%)",
          flexShrink: 0,
        }}
      />
      <div
        className="absolute flex items-center justify-center rounded-md"
        style={{
          width: 28,
          height: 18,
          background: theme.asphalt,
          border: `1.5px solid ${scanning ? color : theme.border}`,
          boxShadow: scanning ? `0 0 14px 4px ${color}55` : "none",
          transition: "border-color 0.3s, box-shadow 0.3s",
          top: 6,
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: 10,
            height: 10,
            background: scanning ? color : theme.concrete,
            boxShadow: scanning ? `0 0 8px 3px ${color}88` : "none",
            transition: "background 0.3s, box-shadow 0.3s",
          }}
        />
      </div>
      <AnimatePresence>
        {scanning && (
          <motion.div
            className="absolute rounded-md pointer-events-none"
            style={{
              top: 6,
              width: 28,
              height: 18,
              border: `2px solid ${color}`,
            }}
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 2.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "loop" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── QR Terminal ─────────────────────────────────────────────────────── */

function QRTerminal({
  active,
  color,
  theme,
}: {
  active: boolean;
  color: string;
  theme: ThemeTokens;
}) {
  return (
    <div
      className="relative rounded-lg flex flex-col items-center justify-center gap-0.5"
      style={{
        width: 28,
        height: 36,
        padding: "5px",
        background: active ? `${color}12` : theme.asphalt,
        border: `1.5px solid ${active ? color : theme.border}`,
        boxShadow: active ? `0 0 14px 3px ${color}44` : "none",
        transition: "border-color 0.3s, box-shadow 0.3s, background 0.3s",
      }}
    >
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex gap-0.5">
          {[0, 1, 2, 3].map((col) => (
            <div
              key={col}
              className="rounded-sm"
              style={{
                width: 4,
                height: 4,
                background: active
                  ? (row < 2 && col < 2) || (row >= 2 && col >= 2)
                    ? color
                    : `${color}55`
                  : theme.concrete,
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Barrier arm ─────────────────────────────────────────────────────── */

function Barrier({
  open,
  color,
  armLength,
  theme,
}: {
  open: boolean;
  color: string;
  armLength: number;
  theme: ThemeTokens;
}) {
  return (
    <div className="relative flex flex-col items-center">
      <div
        style={{
          width: 10,
          height: 36,
          background: "linear-gradient(180deg, #9ca3af 0%, #6b7280 100%)",
          borderRadius: "3px 3px 0 0",
          boxShadow:
            "inset -1px 0 0 rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.4)",
          flexShrink: 0,
          zIndex: 2,
          position: "relative",
        }}
      />
      <div
        className="absolute"
        style={{
          top: 4,
          left: "50%",
          marginLeft: -5,
          transformOrigin: "5px 5px",
        }}
      >
        <motion.div
          animate={{ rotate: open ? -90 : 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          style={{
            transformOrigin: "5px 5px",
            width: armLength + 10,
            height: 10,
          }}
        >
          <div
            className="absolute rounded-full overflow-hidden"
            style={{
              left: 5,
              top: 0,
              width: armLength,
              height: 10,
              background: open
                ? theme.green
                : `repeating-linear-gradient(90deg, ${color} 0px, ${color} 12px, ${theme.asphalt} 12px, ${theme.asphalt} 20px)`,
              boxShadow: open
                ? `0 0 16px 4px ${color}66`
                : `0 0 8px 2px ${color}33`,
              transition: "background 0.4s, box-shadow 0.4s",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              right: 0,
              top: 1,
              width: 8,
              height: 8,
              background: open ? theme.green : color,
              boxShadow: `0 0 6px 2px ${open ? theme.green : color}88`,
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

/* ── Gate Lane assembly ──────────────────────────────────────────────── */

const GateLane = memo(function GateLane({
  lane,
  activeEvent,
  height,
  theme,
}: {
  lane: "entry" | "exit";
  activeEvent: GateEventType | null;
  height: number;
  theme: ThemeTokens;
}) {
  const isEntry = lane === "entry";
  const laneColor = isEntry ? theme.blue : theme.escrow;
  const scanning = isEntry
    ? activeEvent === "entry-scan"
    : activeEvent === "exit-scan";
  const granted = isEntry
    ? activeEvent === "entry-granted"
    : activeEvent === "exit-granted";
  const denied = isEntry
    ? activeEvent === "entry-denied"
    : activeEvent === "exit-denied";
  const qrActive = scanning || activeEvent === "ticket-digitalize";
  const lightState: "red" | "green" | "idle" = granted
    ? "green"
    : denied
      ? "red"
      : "idle";
  const poleH = Math.max(40, height - 90);

  return (
    <div className="flex flex-col items-center" style={{ height }}>
      <div
        className="font-mono font-bold uppercase tracking-widest mb-2"
        style={{ fontSize: 9, color: laneColor, letterSpacing: "0.15em" }}
      >
        {isEntry ? "Entry" : "Exit"}
      </div>

      <div className="flex items-end gap-2.5 flex-1">
        <TrafficLight state={lightState} theme={theme} />
        <Camera
          scanning={scanning}
          color={laneColor}
          poleH={poleH}
          theme={theme}
        />
        <Barrier
          open={granted}
          color={laneColor}
          armLength={88}
          theme={theme}
        />
        <QRTerminal active={qrActive} color={laneColor} theme={theme} />
      </div>

      <motion.div
        className="font-mono font-semibold uppercase tracking-widest mt-2"
        style={{ fontSize: 8 }}
        animate={{
          color: granted
            ? theme.green
            : denied
              ? theme.red
              : scanning
                ? laneColor
                : theme.textDim,
        }}
        transition={{ duration: 0.3 }}
      >
        {granted
          ? "Open"
          : denied
            ? "Denied"
            : scanning
              ? "Scanning"
              : "Closed"}
      </motion.div>

      <motion.div
        className="rounded-full mt-1"
        style={{ width: 80, height: 6 }}
        animate={{
          background: granted
            ? `radial-gradient(ellipse, ${theme.green}55 0%, transparent 70%)`
            : denied
              ? `radial-gradient(ellipse, ${theme.red}33 0%, transparent 70%)`
              : scanning
                ? `radial-gradient(ellipse, ${laneColor}33 0%, transparent 70%)`
                : "radial-gradient(ellipse, rgba(0,0,0,0) 0%, transparent 70%)",
        }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
});

/* ── Parking lot building ────────────────────────────────────────────── */

function FloorRow({
  floor,
  litCount,
  theme,
}: {
  floor: number;
  litCount: number;
  theme: ThemeTokens;
}) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1"
      style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}
    >
      <span
        className="font-mono font-bold flex-shrink-0"
        style={{ fontSize: 6, color: theme.textDim, width: 10 }}
      >
        F{floor}
      </span>
      <div className="flex gap-1 flex-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: 10,
              background: i < litCount ? `${theme.amber}20` : theme.bg,
              border: `1px solid ${i < litCount ? `${theme.amber}44` : theme.borderSubtle}`,
              boxShadow: i < litCount ? `0 0 4px ${theme.amber}22` : "none",
              transition: "all 0.8s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ParkingLot({
  sessions,
  theme,
}: {
  sessions: GateSession[];
  theme: ThemeTokens;
}) {
  const active = sessions.filter(
    (s) => s.status === "active" || s.status === "exiting",
  ).length;
  const total = 12;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        width: 120,
        background: `linear-gradient(180deg, ${theme.concrete} 0%, ${theme.asphalt} 100%)`,
        border: `1px solid ${theme.border}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${theme.border}`,
      }}
    >
      {/* Roof detail */}
      <div
        style={{
          height: 6,
          background: `linear-gradient(180deg, ${theme.concrete} 0%, ${theme.asphalt} 100%)`,
          borderBottom: `1px solid ${theme.border}`,
        }}
      />

      {/* Floors */}
      <FloorRow floor={3} litCount={Math.max(0, active - 8)} theme={theme} />
      <FloorRow
        floor={2}
        litCount={Math.min(4, Math.max(0, active - 4))}
        theme={theme}
      />
      <FloorRow floor={1} litCount={Math.min(4, active)} theme={theme} />

      {/* Ground floor entrance */}
      <div
        className="flex items-center justify-between px-2 py-1"
        style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}
      >
        <div
          className="rounded-sm"
          style={{
            width: 22,
            height: 14,
            background: theme.bg,
            border: `1px solid ${theme.border}`,
          }}
        />
        <div
          className="rounded-sm"
          style={{
            width: 22,
            height: 14,
            background: theme.bg,
            border: `1px solid ${theme.border}`,
          }}
        />
      </div>

      {/* Sign bar */}
      <div
        className="flex items-center justify-between px-2 py-1"
        style={{ background: theme.bg }}
      >
        <span
          className="font-mono font-bold uppercase tracking-widest"
          style={{ fontSize: 6, color: theme.green }}
        >
          Parking
        </span>
        <span
          className="font-mono font-semibold rounded px-1"
          style={{
            fontSize: 6,
            color: active > 0 ? theme.amber : theme.textDim,
            background: active > 0 ? `${theme.amber}15` : "transparent",
          }}
        >
          {active}/{total}
        </span>
      </div>
    </div>
  );
}

/* ── Animated car SVG ────────────────────────────────────────────────── */

function GateCarSVG({
  color,
  plate,
  braking,
  theme,
}: {
  color: string;
  plate: string;
  braking: boolean;
  theme: ThemeTokens;
}) {
  const tlOpacity = braking ? 1.0 : 0.7;
  const tlGlow = braking ? `0 0 10px 4px ${theme.red}88` : "none";

  return (
    <div className="flex flex-col items-center">
      <svg width={CAR_W} height={CAR_H} viewBox="0 0 52 30" fill="none">
        {/* Body shadow */}
        <ellipse cx="26" cy="27" rx="20" ry="3" fill="rgba(0,0,0,0.4)" />
        {/* Body */}
        <rect x="2" y="7" width="48" height="14" rx="4" fill={color} />
        {/* Roof */}
        <rect x="12" y="4" width="26" height="13" rx="3" fill={color} />
        <rect
          x="12"
          y="4"
          width="26"
          height="13"
          rx="3"
          fill="rgba(0,0,0,0.25)"
        />
        {/* Windshields */}
        <rect
          x="32"
          y="5.5"
          width="8"
          height="8"
          rx="1.5"
          fill="#0d1f1c"
          opacity="0.85"
        />
        <rect
          x="13"
          y="5.5"
          width="8"
          height="8"
          rx="1.5"
          fill="#0d1f1c"
          opacity="0.85"
        />
        {/* Wheels */}
        <rect x="36" y="5" width="8" height="6" rx="2" fill={theme.asphalt} />
        <rect x="36" y="19" width="8" height="6" rx="2" fill={theme.asphalt} />
        <rect x="8" y="5" width="8" height="6" rx="2" fill={theme.asphalt} />
        <rect x="8" y="19" width="8" height="6" rx="2" fill={theme.asphalt} />
        {/* Rims */}
        <rect x="38" y="6.5" width="4" height="3" rx="1" fill="#374151" />
        <rect x="38" y="20.5" width="4" height="3" rx="1" fill="#374151" />
        <rect x="10" y="6.5" width="4" height="3" rx="1" fill="#374151" />
        <rect x="10" y="20.5" width="4" height="3" rx="1" fill="#374151" />
        {/* Headlights */}
        <rect
          x="46"
          y="9"
          width="4"
          height="3.5"
          rx="1"
          fill="#FBBF24"
          opacity="0.95"
        />
        <rect
          x="46"
          y="17.5"
          width="4"
          height="3.5"
          rx="1"
          fill="#FBBF24"
          opacity="0.95"
        />
        {/* Taillights — brighter when braking */}
        <rect
          x="2"
          y="9"
          width="4"
          height="3.5"
          rx="1"
          fill={theme.red}
          opacity={tlOpacity}
          style={{
            filter: braking ? `drop-shadow(0 0 4px ${theme.red})` : "none",
            transition: "opacity 0.3s",
          }}
        />
        <rect
          x="2"
          y="17.5"
          width="4"
          height="3.5"
          rx="1"
          fill={theme.red}
          opacity={tlOpacity}
          style={{
            filter: braking ? `drop-shadow(0 0 4px ${theme.red})` : "none",
            transition: "opacity 0.3s",
          }}
        />
        {/* Brake light bloom */}
        {braking && (
          <ellipse cx="2" cy="13" rx="7" ry="6" fill={`${theme.red}22`} />
        )}
        {/* Body shine */}
        <rect
          x="14"
          y="8"
          width="22"
          height="3"
          rx="1.5"
          fill="rgba(255,255,255,0.12)"
        />
      </svg>
      <div
        className="font-mono font-bold rounded-sm"
        style={{
          fontSize: 7,
          color: theme.text,
          background: "rgba(0,0,0,0.7)",
          padding: "1px 4px",
          marginTop: 2,
          letterSpacing: "0.06em",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {plate}
      </div>
    </div>
  );
}

/* ── Road scene ──────────────────────────────────────────────────────── */

function RoadScene({
  activeEvent,
  sessions,
  cars,
  theme,
}: {
  activeEvent: GateEventType | null;
  sessions: GateSession[];
  cars: CarAnimData[];
  theme: ThemeTokens;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 360 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w: W, h: H } = dims;

  // Layout
  const roadTop = H * ROAD_TOP_FRAC;
  const roadH = H * ROAD_H_FRAC;
  const roadCenterY = roadTop + roadH / 2;
  const gateStructH = roadTop - H * 0.1;
  const entryX = W * ENTRY_X_FRAC;
  const exitX = W * EXIT_X_FRAC;
  const lotX = W * LOT_X_FRAC;
  const carY = roadCenterY - CAR_H / 2 - 2;

  // Car info from page
  const latestCar = cars[cars.length - 1];
  const carPlate = latestCar?.plate ?? "";
  const carColor = latestCar?.color ?? theme.blue;

  // Car animation
  const carX = useMotionValue(-CAR_W - 20);
  const carOpacity = useMotionValue(0);
  const [carBraking, setCarBraking] = useState(false);

  // Derived glow positions
  const headlightRoadX = useTransform(carX, (x) => x + CAR_W - 4);
  const taillightRoadX = useTransform(carX, (x) => x - 36);

  useEffect(() => {
    if (activeEvent === "entry-scan") {
      carX.jump(-CAR_W - 20);
      carOpacity.jump(0);
      setCarBraking(false);
      animate(carOpacity, 1, { duration: 0.3 });
      animate(carX, entryX - CAR_W - 6, {
        duration: 1.5,
        ease: "easeInOut",
      }).then(() => setCarBraking(true));
    } else if (activeEvent === "entry-granted") {
      setCarBraking(false);
      animate(carX, lotX - CAR_W / 2, {
        duration: 1.2,
        ease: "easeInOut",
        delay: 0.35,
      });
    } else if (activeEvent === "entry-denied") {
      const x = carX.get();
      animate(carX, x + 13, { duration: 0.07 })
        .then(() => animate(carX, x - 11, { duration: 0.07 }))
        .then(() => animate(carX, x + 9, { duration: 0.07 }))
        .then(() => animate(carX, x - 7, { duration: 0.07 }))
        .then(() => animate(carX, x + 5, { duration: 0.07 }))
        .then(() => animate(carX, x - 3, { duration: 0.07 }))
        .then(() => animate(carX, x, { duration: 0.1 }));
    } else if (activeEvent === "exit-scan") {
      carX.jump(lotX - CAR_W / 2);
      carOpacity.jump(0);
      setCarBraking(false);
      animate(carOpacity, 1, { duration: 0.3 });
      animate(carX, exitX - CAR_W - 6, {
        duration: 1.5,
        ease: "easeInOut",
      }).then(() => setCarBraking(true));
    } else if (activeEvent === "exit-granted") {
      setCarBraking(false);
      animate(carX, W + CAR_W + 20, {
        duration: 1.2,
        ease: "easeInOut",
        delay: 0.35,
      });
    } else if (activeEvent === "exit-denied") {
      const x = carX.get();
      animate(carX, x + 13, { duration: 0.07 })
        .then(() => animate(carX, x - 11, { duration: 0.07 }))
        .then(() => animate(carX, x + 9, { duration: 0.07 }))
        .then(() => animate(carX, x - 7, { duration: 0.07 }))
        .then(() => animate(carX, x + 5, { duration: 0.07 }))
        .then(() => animate(carX, x - 3, { duration: 0.07 }))
        .then(() => animate(carX, x, { duration: 0.1 }));
    } else if (!activeEvent) {
      setCarBraking(false);
      animate(carOpacity, 0, { duration: 0.4 });
    }
  }, [activeEvent, entryX, exitX, lotX, W]);

  const stopLineOffset = 68;
  const scanColor = activeEvent === "entry-scan" ? theme.blue : theme.escrow;
  const isScanning =
    activeEvent === "entry-scan" || activeEvent === "exit-scan";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${theme.sky} 0%, ${theme.bg} 40%, ${theme.roadSurface} 70%, ${theme.grass} 100%)`,
      }}
    >
      {/* ── Moon ── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          right: "7%",
          top: H * 0.06,
          width: 22,
          height: 22,
          background:
            "radial-gradient(circle at 35% 35%, #e2e8f0 0%, #c8d5e0 55%, transparent 100%)",
          boxShadow: "0 0 24px 10px rgba(200,213,224,0.07)",
        }}
      />

      {/* ── City horizon glow ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: "25%",
          width: "50%",
          bottom: H - roadTop + 10,
          height: 50,
          background: `radial-gradient(ellipse, ${theme.blue}0f 0%, transparent 70%)`,
        }}
      />

      {/* ── Stars ── */}
      {[
        [8, 8],
        [14, 22],
        [24, 5],
        [34, 18],
        [44, 10],
        [54, 26],
        [62, 8],
        [71, 20],
        [80, 6],
        [87, 16],
        [93, 28],
        [5, 36],
        [17, 42],
        [29, 31],
        [47, 39],
        [64, 30],
        [77, 44],
        [84, 35],
        [95, 12],
        [41, 27],
        [58, 14],
        [10, 48],
        [33, 44],
        [70, 38],
      ].map(([px, py], i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${px}%`,
            top: `${(py / 100) * roadTop * 0.92}px`,
            width: i % 4 === 0 ? 2 : 1,
            height: i % 4 === 0 ? 2 : 1,
            background: "white",
          }}
          animate={{
            opacity: [
              0.1 + (i % 5) * 0.06,
              0.4 + (i % 3) * 0.1,
              0.1 + (i % 5) * 0.06,
            ],
          }}
          transition={{
            duration: 2 + (i % 5),
            repeat: Infinity,
            delay: i * 0.22,
          }}
        />
      ))}

      {/* ── Road surface ── */}
      <div
        className="absolute inset-x-0"
        style={{
          top: roadTop,
          height: roadH,
          background: `linear-gradient(180deg, ${theme.roadSurface} 0%, ${theme.asphalt} 45%, ${theme.roadSurface} 100%)`,
          borderTop: `2px solid ${theme.border}`,
          borderBottom: `2px solid ${theme.border}`,
        }}
      >
        {/* Subtle tarmac grain */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 18px, #ffffff05 18px, #ffffff05 19px)",
          }}
        />

        {/* Wet road sheen — horizontal gloss band */}
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            top: "42%",
            height: 5,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.05) 80%, transparent 100%)",
          }}
        />

        {/* Gate light reflections on wet road */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: entryX - 3,
            top: 6,
            width: 6,
            height: roadH - 12,
            background: `linear-gradient(180deg, ${theme.blue}1f 0%, transparent 100%)`,
            borderRadius: 3,
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            left: exitX - 3,
            top: 6,
            width: 6,
            height: roadH - 12,
            background: `linear-gradient(180deg, ${theme.escrow}1f 0%, transparent 100%)`,
            borderRadius: 3,
          }}
        />

        {/* Center lane dashes */}
        <div
          className="absolute inset-x-0 flex"
          style={{ top: "50%", transform: "translateY(-50%)" }}
        >
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0,
                width: 30,
                height: 4,
                background: `${theme.roadLine}44`,
                marginLeft: i === 0 ? 0 : 18,
                borderRadius: 2,
              }}
            />
          ))}
        </div>

        {/* Stop lines */}
        {[entryX, exitX].map((gx, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: gx - stopLineOffset,
              top: 0,
              width: 4,
              height: roadH,
              background:
                "repeating-linear-gradient(180deg, #ffffffbb 0px, #ffffffbb 8px, transparent 8px, transparent 14px)",
              opacity: 0.45,
            }}
          />
        ))}

        {/* Road edge curbs */}
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: 4, background: theme.concrete }}
        />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: 4, background: theme.concrete }}
        />
      </div>

      {/* ── Pavement below road ── */}
      <div
        className="absolute inset-x-0"
        style={{
          top: roadTop + roadH,
          bottom: 0,
          background: `linear-gradient(180deg, ${theme.asphalt} 0%, ${theme.bg} 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 40px, #ffffff03 40px, #ffffff03 41px)",
          }}
        />
      </div>

      {/* ── Horizon fog ── */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{
          top: roadTop - 28,
          height: 32,
          background: `linear-gradient(180deg, transparent 0%, ${theme.bg}8c 100%)`,
        }}
      />

      {/* ── Camera spotlight cones during scan ── */}
      <AnimatePresence>
        {activeEvent === "entry-scan" && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: entryX - 22,
              top: H * 0.12 + 20,
              width: 44,
              height: roadTop - H * 0.12 - 20,
              background: `linear-gradient(180deg, ${theme.blue}00 0%, ${theme.blue}1a 65%, ${theme.blue}07 100%)`,
              clipPath: "polygon(28% 0%, 72% 0%, 100% 100%, 0% 100%)",
              zIndex: 5,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        )}
        {activeEvent === "exit-scan" && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: exitX - 22,
              top: H * 0.12 + 20,
              width: 44,
              height: roadTop - H * 0.12 - 20,
              background: `linear-gradient(180deg, ${theme.escrow}00 0%, ${theme.escrow}1a 65%, ${theme.escrow}07 100%)`,
              clipPath: "polygon(28% 0%, 72% 0%, 100% 100%, 0% 100%)",
              zIndex: 5,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      {/* ── Gate structures ── */}
      {(
        [
          ["entry", entryX],
          ["exit", exitX],
        ] as const
      ).map(([lane, gx]) => (
        <div
          key={lane}
          className="absolute"
          style={{
            left: gx,
            top: H * 0.1,
            transform: "translateX(-50%)",
            height: gateStructH,
          }}
        >
          <GateLane
            lane={lane}
            activeEvent={activeEvent}
            height={gateStructH}
            theme={theme}
          />
        </div>
      ))}

      {/* ── Parking lot ── */}
      <div
        className="absolute"
        style={{ left: lotX, top: H * 0.12, transform: "translateX(-50%)" }}
      >
        <ParkingLot sessions={sessions} theme={theme} />
      </div>

      {/* ── Ground shadow under gates ── */}
      {[entryX, exitX].map((gx, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: gx - 60,
            top: roadTop + roadH - 8,
            width: 120,
            height: 16,
            background:
              "radial-gradient(ellipse, rgba(0,0,0,0.7) 0%, transparent 70%)",
          }}
        />
      ))}

      {/* ── Active lane road highlight ── */}
      <AnimatePresence>
        {(activeEvent === "entry-scan" ||
          activeEvent === "entry-granted" ||
          activeEvent === "entry-denied") && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: 0,
              width: entryX + 50,
              top: roadTop,
              height: roadH,
              background: `linear-gradient(90deg, transparent 0%, ${theme.blue}0c 100%)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
        {(activeEvent === "exit-scan" ||
          activeEvent === "exit-granted" ||
          activeEvent === "exit-denied") && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              right: 0,
              width: W - exitX + 90,
              top: roadTop,
              height: roadH,
              background: `linear-gradient(270deg, transparent 0%, ${theme.escrow}0c 100%)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* ── Taillight road glow (behind car) ── */}
      {carPlate && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            x: taillightRoadX,
            top: carY + CAR_H - 4,
            width: 44,
            height: 14,
            background: `radial-gradient(ellipse, ${theme.red}2e 0%, transparent 70%)`,
            opacity: carOpacity,
            zIndex: 18,
          }}
        />
      )}

      {/* ── Headlight road glow (ahead of car) ── */}
      {carPlate && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            x: headlightRoadX,
            top: carY + 4,
            width: 80,
            height: 20,
            background:
              "radial-gradient(ellipse at left, rgba(251,191,36,0.18) 0%, transparent 70%)",
            opacity: carOpacity,
            zIndex: 18,
          }}
        />
      )}

      {/* ── Car ── */}
      {carPlate && (
        <motion.div
          className="absolute pointer-events-none"
          style={{ top: carY, x: carX, opacity: carOpacity, zIndex: 20 }}
        >
          {/* Headlight forward beam */}
          <div
            style={{
              position: "absolute",
              left: CAR_W,
              top: 5,
              width: 96,
              height: CAR_H - 10,
              background:
                "linear-gradient(90deg, rgba(251,191,36,0.28) 0%, rgba(251,191,36,0.06) 55%, transparent 100%)",
              clipPath: "polygon(0 20%, 100% 0%, 100% 100%, 0 80%)",
              pointerEvents: "none",
            }}
          />

          {/* Scan sweep line — sweeps vertically across car during scan */}
          <AnimatePresence>
            {isScanning && (
              <motion.div
                style={{
                  position: "absolute",
                  left: -2,
                  width: CAR_W + 4,
                  height: 2,
                  background: `linear-gradient(90deg, transparent 0%, ${scanColor}cc 30%, ${scanColor} 50%, ${scanColor}cc 70%, transparent 100%)`,
                  boxShadow: `0 0 8px 2px ${scanColor}88`,
                  pointerEvents: "none",
                  zIndex: 2,
                }}
                initial={{ top: -4, opacity: 0 }}
                animate={{ top: CAR_H + 4, opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
              />
            )}
          </AnimatePresence>

          <GateCarSVG
            color={carColor}
            plate={carPlate}
            braking={carBraking}
            theme={theme}
          />
        </motion.div>
      )}
    </div>
  );
}

/* ── Session card ────────────────────────────────────────────────────── */

function STATUS_COLOR(T: ThemeTokens): Record<string, string> {
  return {
    active: T.green,
    pending: T.amber,
    exiting: T.blue,
    completed: T.textDim,
    orphan: T.red,
  };
}

function SessionCard({
  session,
  theme,
}: {
  session: GateSession;
  theme: ThemeTokens;
}) {
  const statusColors = STATUS_COLOR(theme);
  const color = statusColors[session.status] ?? theme.textDim;
  const isOrphan = session.status === "orphan";
  const isCompleted = session.status === "completed";

  // Live ticking timer
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (isCompleted) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isCompleted]);

  const durationMs = session.entryTime ? now - session.entryTime : 0;
  const durationMin = Math.floor(durationMs / 60000);
  const durationLabel =
    durationMin < 1
      ? "< 1m"
      : durationMin < 60
        ? `${durationMin}m`
        : `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative rounded-xl overflow-hidden flex-shrink-0"
      style={{
        width: 168,
        background: isCompleted ? `${theme.bg}99` : theme.card,
        border: `1px solid ${isOrphan ? `${theme.red}44` : isCompleted ? theme.borderSubtle : theme.border}`,
        boxShadow: isOrphan
          ? `0 0 20px 3px ${theme.red}20`
          : "0 4px 16px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${color} 0%, ${color}44 100%)`,
          opacity: isCompleted ? 0.4 : 0.9,
        }}
      />

      <div className="p-3 pb-2.5">
        <div
          className="font-mono font-bold tracking-wider"
          style={{
            fontSize: 13,
            color: isCompleted ? theme.textDim : theme.text,
            letterSpacing: "0.05em",
          }}
        >
          {session.plate}
        </div>

        <div
          className="flex items-center gap-1.5 mt-1"
          style={{ fontSize: 8, color: theme.textDim, fontFamily: "monospace" }}
        >
          <span>{session.vehicleType}</span>
          <span style={{ color: theme.textDim }}>·</span>
          <span>{session.hasBooking ? "Booked" : "Walk-in"}</span>
          {session.paymentMethod && (
            <>
              <span style={{ color: theme.textDim }}>·</span>
              <span style={{ color: theme.amber }}>
                {session.paymentMethod.toUpperCase()}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1">
            <motion.div
              className="rounded-full"
              style={{
                width: 5,
                height: 5,
                background: isCompleted ? theme.textDim : color,
                boxShadow: isCompleted ? "none" : `0 0 5px 1px ${color}88`,
              }}
              animate={isCompleted ? {} : { opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span
              className="font-mono"
              style={{ fontSize: 9, color: theme.textDim }}
            >
              {isCompleted ? "Done" : durationLabel}
            </span>
          </div>
          {session.fare > 0 && (
            <span
              className="font-mono font-bold"
              style={{ fontSize: 11, color }}
            >
              {session.fare} MAD
            </span>
          )}
        </div>

        <div
          className="mt-2 rounded-md px-2 py-0.5 text-center font-mono font-semibold uppercase"
          style={{
            fontSize: 7,
            letterSpacing: "0.12em",
            background: `${color}14`,
            color,
            border: `1px solid ${color}22`,
          }}
        >
          {isOrphan ? "Orphan — Review needed" : session.status}
        </div>
      </div>

      {isOrphan && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ border: `1px solid ${theme.red}44` }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

/* ── Event pill ──────────────────────────────────────────────────────── */

function EventPill({
  activeEvent,
  currentStep,
  theme,
}: {
  activeEvent: GateEventType | null;
  currentStep: string;
  theme: ThemeTokens;
}) {
  const eventColors = EVENT_COLOR(theme);
  return (
    <AnimatePresence mode="wait">
      {activeEvent && (
        <motion.div
          key={currentStep}
          className="flex items-center gap-3 rounded-full pointer-events-none"
          style={{
            paddingLeft: 20,
            paddingRight: 20,
            paddingTop: 9,
            paddingBottom: 9,
            background: theme.card,
            border: `1px solid ${eventColors[activeEvent]}44`,
            color: eventColors[activeEvent],
            boxShadow: `0 0 32px 6px ${eventColors[activeEvent]}1a, 0 4px 20px rgba(0,0,0,0.5)`,
            backdropFilter: "blur(16px)",
          }}
          initial={{ opacity: 0, y: -12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            className="rounded-full flex-shrink-0"
            style={{
              width: 7,
              height: 7,
              background: eventColors[activeEvent],
              boxShadow: `0 0 8px 2px ${eventColors[activeEvent]}88`,
            }}
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span
            className="font-mono font-semibold"
            style={{ fontSize: 12, letterSpacing: "0.04em" }}
          >
            {EVENT_LABEL[activeEvent]}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Main GateCanvas ─────────────────────────────────────────────────── */

export default function GateCanvas({
  sessions,
  activeEvent,
  currentStep: _currentStep,
  cars,
  running,
}: GateCanvasProps) {
  const T = useTheme();
  const eventColors = EVENT_COLOR(T);

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: T.bg }}
    >
      {/* Top bar */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <motion.div
            animate={{
              background: running ? T.accent : T.textMuted,
              boxShadow: running ? `0 0 10px 2px ${T.accent}8c` : "none",
            }}
            transition={{ duration: 0.3 }}
            style={{ width: 8, height: 8, borderRadius: 2 }}
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
            OtoGate — Physical Gate Simulation
          </span>
        </div>

        <AnimatePresence mode="wait">
          {activeEvent ? (
            <motion.div
              key={activeEvent}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                borderRadius: 6,
                background: `${eventColors[activeEvent]}12`,
                border: `1px solid ${eventColors[activeEvent]}35`,
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: eventColors[activeEvent],
                  boxShadow: `0 0 6px 2px ${eventColors[activeEvent]}88`,
                }}
              />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  fontWeight: 700,
                  color: eventColors[activeEvent],
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {EVENT_LABEL[activeEvent]}
              </span>
            </motion.div>
          ) : running ? (
            <motion.div
              key="running"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "monospace",
                fontSize: 8,
                fontWeight: 700,
                color: T.accent,
                letterSpacing: "0.14em",
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: T.accent,
                  boxShadow: `0 0 6px 2px ${T.accent}8c`,
                }}
              />
              RUNNING
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Road scene */}
      <div className="flex-1 min-h-0 px-4 pb-2">
        <div
          className="w-full h-full rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${T.border}` }}
        >
          <RoadScene
            activeEvent={activeEvent}
            sessions={sessions}
            cars={cars}
            theme={T}
          />
        </div>
      </div>

      {/* Sessions strip */}
      <div className="flex-shrink-0 px-4 pb-4" style={{ paddingTop: 10 }}>
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="font-mono font-semibold uppercase tracking-widest"
            style={{
              fontSize: 8,
              color: T.textMuted,
              letterSpacing: "0.16em",
            }}
          >
            Active Sessions
          </span>
          <div
            className="rounded-full px-1.5 py-0.5 font-mono font-bold"
            style={{
              fontSize: 7,
              background: sessions.length > 0 ? `${T.green}18` : "transparent",
              color: sessions.length > 0 ? T.green : T.textDim,
              border: `1px solid ${sessions.length > 0 ? `${T.green}30` : "transparent"}`,
            }}
          >
            {sessions.length}
          </div>
        </div>

        {sessions.length === 0 && !running ? (
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              height: 60,
              border: `1px dashed ${T.border}`,
            }}
          >
            <span
              className="font-mono"
              style={{ fontSize: 10, color: T.textMuted }}
            >
              No active sessions — run a scenario to begin
            </span>
          </div>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            <AnimatePresence>
              {sessions.map((s) => (
                <SessionCard key={s.id} session={s} theme={T} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
