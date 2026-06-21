"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LambdaDef, ExternalService } from "@/types/infra";
import {
  API_LAMBDAS,
  JOB_LAMBDAS,
  GATE_LAMBDA,
  EXTERNAL_SERVICES,
} from "@/app/modules/infra/topology";
import {
  Zap,
  Clock,
  Database,
  Globe,
  CreditCard,
  Bell,
  Shield,
  Archive,
  X,
  Server,
} from "lucide-react";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";

/* ── Props ─────────────────────────────────────────────────────────────── */

interface InfraCanvasProps {
  selectedLambda: LambdaDef | null;
  onSelectLambda: (lambda: LambdaDef) => void;
  onDeselect: () => void;
}

/* ── Derived data ──────────────────────────────────────────────────────── */

const ALL_API_LAMBDAS = [...API_LAMBDAS, GATE_LAMBDA].sort((a, b) =>
  a.name.localeCompare(b.name),
);

const JOB_IDS = new Set(JOB_LAMBDAS.map((l) => l.id));

function isJobLambda(l: LambdaDef) {
  return JOB_IDS.has(l.id);
}

/* ── Service metadata ─────────────────────────────────────────────────── */

type ServiceMeta = { color: string; icon: React.ReactNode; category: string };

const SERVICE_META: Record<string, ServiceMeta> = {
  noscera: {
    color: "#8B5CF6",
    icon: <Shield className="size-3.5" />,
    category: "Auth",
  },
  corpopay: {
    color: "#F59E0B",
    icon: <CreditCard className="size-3.5" />,
    category: "Payment",
  },
  pushcaster: {
    color: "#378ADD",
    icon: <Bell className="size-3.5" />,
    category: "Notify",
  },
  rds: {
    color: "#378ADD",
    icon: <Database className="size-3.5" />,
    category: "Database",
  },
  s3: {
    color: "#BA7517",
    icon: <Archive className="size-3.5" />,
    category: "Storage",
  },
};

/* ── Section header ────────────────────────────────────────────────────── */

function SectionHeader({
  label,
  badge,
  count,
  badgeColor = "#1D9E75",
  theme: T,
}: {
  label: string;
  badge?: string;
  count: number;
  badgeColor?: string;
  theme: ThemeTokens;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span
        className="font-mono font-semibold uppercase tracking-widest flex-shrink-0"
        style={{ fontSize: 8, color: T.textDim, letterSpacing: "0.16em" }}
      >
        {label}
      </span>
      <div className="flex-1" style={{ height: 1, background: T.border }} />
      {badge && (
        <span
          className="font-mono font-semibold rounded-md px-2 py-0.5 flex-shrink-0"
          style={{
            fontSize: 7,
            color: badgeColor,
            background: `${badgeColor}15`,
            border: `1px solid ${badgeColor}28`,
          }}
        >
          {badge}
        </span>
      )}
      <span
        className="font-mono font-semibold rounded flex-shrink-0"
        style={{
          fontSize: 7,
          color: T.textDim,
          background: T.card,
          padding: "1px 5px",
        }}
      >
        {count}
      </span>
    </div>
  );
}

/* ── API Gateway card ──────────────────────────────────────────────────── */

function GatewayCard({ theme: T }: { theme: ThemeTokens }) {
  return (
    <div
      className="rounded-xl"
      style={{
        background: T.isDark
          ? "linear-gradient(135deg, oklch(0.20 0.06 178 / 0.8) 0%, oklch(0.16 0.04 180 / 0.9) 100%)"
          : "linear-gradient(135deg, oklch(0.96 0.018 185) 0%, oklch(0.98 0.010 185) 100%)",
        border: `1px solid ${T.accent}38`,
        boxShadow: T.isDark
          ? `0 0 40px ${T.accent}0d, 0 4px 24px rgba(0,0,0,0.4)`
          : `0 0 20px ${T.accent}14, 0 4px 16px rgba(0,0,0,0.08)`,
        padding: "14px 18px",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              width: 38,
              height: 38,
              background: `${T.accent}0f`,
              border: `1px solid ${T.accent}2e`,
              boxShadow: `0 0 12px ${T.accent}14`,
            }}
          >
            <Globe className="size-5" style={{ color: T.accent }} />
          </div>
          {/* Text */}
          <div>
            <div
              className="font-mono font-bold"
              style={{
                fontSize: 13,
                color: T.accent,
                letterSpacing: "0.04em",
              }}
            >
              Amazon API Gateway
            </div>
            <div style={{ fontSize: 9, color: T.textDim, marginTop: 2 }}>
              HTTP API · $default stage · CORS enabled ·{" "}
              {ALL_API_LAMBDAS.length} Lambda routes
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="font-mono font-semibold rounded-md px-2 py-0.5"
            style={{
              fontSize: 7,
              color: T.green,
              background: `${T.green}15`,
              border: `1px solid ${T.green}28`,
            }}
          >
            ACTIVE
          </span>
          <motion.div
            className="rounded-full"
            style={{
              width: 7,
              height: 7,
              background: T.green,
              boxShadow: `0 0 8px 2px ${T.green}66`,
            }}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Route chips */}
      <div className="flex flex-wrap gap-1 mt-3">
        {ALL_API_LAMBDAS.map((l) => (
          <span
            key={l.id}
            className="font-mono rounded"
            style={{
              fontSize: 7,
              color: T.textDim,
              background: `${T.accent}0a`,
              border: `1px solid ${T.accent}14`,
              padding: "1px 5px",
            }}
          >
            {l.routes[0].split("/*")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Gateway → Lambda connector ────────────────────────────────────────── */

function GatewayConnector({ theme: T }: { theme: ThemeTokens }) {
  return (
    <div className="relative" style={{ height: 24 }}>
      {/* Center vertical stem */}
      <div
        className="absolute"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          top: 0,
          width: 1,
          height: 12,
          background: `linear-gradient(180deg, ${T.accent}59 0%, ${T.accent}26 100%)`,
        }}
      />
      {/* Horizontal bus */}
      <div
        className="absolute"
        style={{
          left: "4%",
          right: "4%",
          top: 12,
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${T.accent}2e 15%, ${T.accent}2e 85%, transparent 100%)`,
        }}
      />
    </div>
  );
}

/* ── Lambda → Services connector ─────────────────────────────────────── */

function ServiceConnector({
  color,
  theme: T,
}: {
  color?: string;
  theme: ThemeTokens;
}) {
  return (
    <div className="relative" style={{ height: 20 }}>
      <div
        className="absolute inset-x-8"
        style={{ top: "50%", height: 1, background: color ?? `${T.accent}1f` }}
      />
    </div>
  );
}

/* ── Lambda card ──────────────────────────────────────────────────────── */

const LambdaCard = memo(function LambdaCard({
  lambda,
  isSelected,
  onClick,
  theme: T,
}: {
  lambda: LambdaDef;
  isSelected: boolean;
  onClick: () => void;
  theme: ThemeTokens;
}) {
  const job = isJobLambda(lambda);
  const accent = job ? T.amber : lambda.snapStart ? T.green : T.blue;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.025, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="relative rounded-xl cursor-pointer overflow-hidden"
      style={{
        background: isSelected
          ? T.isDark
            ? "oklch(0.22 0.06 178 / 0.95)"
            : T.cardHover
          : T.isDark
            ? "oklch(0.18 0.04 180 / 0.75)"
            : T.card,
        border: `1px solid ${isSelected ? accent + "66" : T.border}`,
        boxShadow: isSelected
          ? `0 0 22px 3px ${accent}1a, 0 4px 16px rgba(0,0,0,0.4)`
          : T.isDark
            ? "0 2px 10px rgba(0,0,0,0.3)"
            : "0 2px 8px rgba(0,0,0,0.08)",
        transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          height: 2,
          background: isSelected
            ? `linear-gradient(90deg, ${accent} 0%, ${accent}44 100%)`
            : `${accent}30`,
          transition: "background 0.2s",
        }}
      />

      <div style={{ padding: "9px 11px 10px" }}>
        {/* Name row */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {job ? (
            <Clock
              className="flex-shrink-0"
              style={{ width: 10, height: 10, color: accent }}
            />
          ) : (
            <Zap
              className="flex-shrink-0"
              style={{ width: 10, height: 10, color: accent }}
            />
          )}
          <span
            className="font-mono font-bold truncate"
            style={{
              fontSize: 10,
              color: isSelected ? T.text : T.textMuted,
              letterSpacing: "0.02em",
            }}
          >
            {lambda.name}
          </span>
          {lambda.snapStart && (
            <span
              className="flex-shrink-0 font-mono font-bold rounded"
              style={{
                fontSize: 6,
                color: T.green,
                background: `${T.green}20`,
                border: `1px solid ${T.green}30`,
                padding: "1px 3px",
                marginLeft: "auto",
              }}
            >
              SS
            </span>
          )}
        </div>

        {/* Handler */}
        <div
          className="font-mono truncate mb-2"
          style={{ fontSize: 7, color: T.textDim }}
        >
          {lambda.handler}
        </div>

        {/* Chips */}
        <div className="flex items-center gap-1">
          <span
            className="font-mono rounded"
            style={{
              fontSize: 7,
              color: T.textMuted,
              background: T.isDark ? "rgba(255,255,255,0.04)" : T.borderSubtle,
              padding: "1px 4px",
            }}
          >
            {lambda.memory}MB
          </span>
          <span
            className="font-mono rounded"
            style={{
              fontSize: 7,
              color: T.textMuted,
              background: T.isDark ? "rgba(255,255,255,0.04)" : T.borderSubtle,
              padding: "1px 4px",
            }}
          >
            {lambda.timeout}s
          </span>
          {job && (
            <span
              className="font-mono rounded ml-auto"
              style={{
                fontSize: 6,
                color: accent,
                background: `${accent}14`,
                border: `1px solid ${accent}25`,
                padding: "1px 4px",
                maxWidth: 70,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {lambda.routes[0]}
            </span>
          )}
        </div>
      </div>

      {/* Selection glow pulse */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ border: `1px solid ${accent}33` }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
});

/* ── Service card ──────────────────────────────────────────────────────── */

const ServiceCard = memo(function ServiceCard({
  service,
  theme: T,
}: {
  service: ExternalService;
  theme: ThemeTokens;
}) {
  const meta = SERVICE_META[service.id] ?? {
    color: "#6B7280",
    icon: <Server className="size-3.5" />,
    category: "Service",
  };

  return (
    <div
      className="rounded-xl"
      style={{
        background: T.card,
        border: `1px solid ${meta.color}30`,
        boxShadow: T.isDark
          ? "0 2px 10px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.07)",
        padding: "10px 11px",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 26,
            height: 26,
            background: `${meta.color}14`,
            border: `1px solid ${meta.color}30`,
            color: meta.color,
          }}
        >
          {meta.icon}
        </div>
        <div className="min-w-0">
          <div
            className="font-mono font-bold truncate"
            style={{ fontSize: 9, color: T.textMuted }}
          >
            {service.name}
          </div>
          <div className="font-mono" style={{ fontSize: 7, color: meta.color }}>
            {meta.category}
          </div>
        </div>
      </div>
      <div
        className="font-mono truncate rounded"
        style={{
          fontSize: 7,
          color: T.textDim,
          background: T.isDark ? "rgba(255,255,255,0.03)" : T.borderSubtle,
          padding: "2px 4px",
          border: `1px solid ${T.borderSubtle}`,
        }}
      >
        {service.envVar}
      </div>
    </div>
  );
});

/* ── Lambda detail panel ─────────────────────────────────────────────── */

function LambdaDetailPanel({
  lambda,
  onClose,
  theme: T,
}: {
  lambda: LambdaDef;
  onClose: () => void;
  theme: ThemeTokens;
}) {
  const job = isJobLambda(lambda);
  const accent = job ? T.amber : lambda.snapStart ? T.green : T.blue;

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-50"
      style={{
        background: T.header,
        borderTop: `1px solid ${accent}33`,
        backdropFilter: "blur(20px)",
        boxShadow: T.isDark
          ? `0 -8px 40px rgba(0,0,0,0.5), 0 0 0 1px ${accent}11`
          : `0 -4px 20px rgba(0,0,0,0.08), 0 0 0 1px ${accent}18`,
      }}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
    >
      <div style={{ padding: "16px 20px 20px" }}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{
              width: 46,
              height: 46,
              background: `${accent}14`,
              border: `1px solid ${accent}40`,
              boxShadow: `0 0 16px ${accent}22`,
              color: accent,
            }}
          >
            {job ? <Clock className="size-5" /> : <Zap className="size-5" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <span
                className="font-mono font-bold"
                style={{ fontSize: 14, color: accent, letterSpacing: "0.04em" }}
              >
                {lambda.name}
              </span>
              {lambda.snapStart && (
                <span
                  className="font-mono font-semibold rounded-md px-1.5 py-0.5"
                  style={{
                    fontSize: 7,
                    color: T.green,
                    background: `${T.green}18`,
                    border: `1px solid ${T.green}30`,
                  }}
                >
                  SnapStart
                </span>
              )}
              {job && (
                <span
                  className="font-mono font-semibold rounded-md px-1.5 py-0.5"
                  style={{
                    fontSize: 7,
                    color: T.amber,
                    background: `${T.amber}18`,
                    border: `1px solid ${T.amber}30`,
                  }}
                >
                  EventBridge
                </span>
              )}
            </div>

            <div
              className="font-mono mb-2"
              style={{ fontSize: 9, color: T.textDim }}
            >
              {lambda.handler}
            </div>

            <p
              style={{
                fontSize: 10,
                color: T.textMuted,
                lineHeight: 1.55,
                marginBottom: 12,
              }}
            >
              {lambda.description}
            </p>

            <div className="flex items-start gap-6">
              {/* Stats */}
              <div className="flex gap-4">
                <div>
                  <div
                    className="font-mono uppercase"
                    style={{
                      fontSize: 7,
                      color: T.textDim,
                      letterSpacing: "0.1em",
                      marginBottom: 2,
                    }}
                  >
                    Memory
                  </div>
                  <div
                    className="font-mono font-bold"
                    style={{ fontSize: 14, color: T.text }}
                  >
                    {lambda.memory}
                    <span
                      style={{ fontSize: 9, color: T.textMuted, marginLeft: 2 }}
                    >
                      MB
                    </span>
                  </div>
                </div>
                <div>
                  <div
                    className="font-mono uppercase"
                    style={{
                      fontSize: 7,
                      color: T.textDim,
                      letterSpacing: "0.1em",
                      marginBottom: 2,
                    }}
                  >
                    Timeout
                  </div>
                  <div
                    className="font-mono font-bold"
                    style={{ fontSize: 14, color: T.text }}
                  >
                    {lambda.timeout}
                    <span
                      style={{ fontSize: 9, color: T.textMuted, marginLeft: 2 }}
                    >
                      s
                    </span>
                  </div>
                </div>
              </div>

              {/* Routes */}
              <div className="flex-1 min-w-0">
                <div
                  className="font-mono uppercase mb-1.5"
                  style={{
                    fontSize: 7,
                    color: T.textDim,
                    letterSpacing: "0.1em",
                  }}
                >
                  Routes
                </div>
                <div className="flex flex-wrap gap-1">
                  {lambda.routes.map((r) => (
                    <span
                      key={r}
                      className="font-mono rounded-md"
                      style={{
                        fontSize: 8,
                        color: accent,
                        background: `${accent}10`,
                        border: `1px solid ${accent}22`,
                        padding: "2px 6px",
                      }}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              background: T.card,
              border: `1px solid ${T.border}`,
              color: T.textMuted,
              cursor: "pointer",
            }}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main InfraCanvas ─────────────────────────────────────────────────── */

export default function InfraCanvas({
  selectedLambda,
  onSelectLambda,
  onDeselect,
}: InfraCanvasProps) {
  const T = useTheme();

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: T.bg }}
    >
      {/* ── Top bar ── */}
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
            className="rounded-sm"
            style={{
              width: 8,
              height: 8,
              background: T.accent,
              boxShadow: `0 0 8px 2px ${T.accent}55`,
            }}
          />
          <span
            className="font-mono font-semibold uppercase tracking-widest"
            style={{
              fontSize: 9,
              color: T.textMuted,
              letterSpacing: "0.16em",
            }}
          >
            AWS Lambda Architecture
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className="font-mono"
            style={{ fontSize: 8, color: T.textMuted }}
          >
            {ALL_API_LAMBDAS.length} API · {JOB_LAMBDAS.length} Jobs ·{" "}
            {EXTERNAL_SERVICES.length} Services
          </span>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ padding: "16px 20px 20px", scrollbarWidth: "none" }}
      >
        {/* API Gateway */}
        <GatewayCard theme={T} />

        {/* Gateway → Lambda connector */}
        <GatewayConnector theme={T} />

        {/* API Lambdas */}
        <div className="mb-4">
          <SectionHeader
            label="API Lambdas"
            badge="API Gateway"
            count={ALL_API_LAMBDAS.length}
            badgeColor={T.accent}
            theme={T}
          />
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
            }}
          >
            {ALL_API_LAMBDAS.map((l) => (
              <LambdaCard
                key={l.id}
                lambda={l}
                isSelected={selectedLambda?.id === l.id}
                onClick={() => onSelectLambda(l)}
                theme={T}
              />
            ))}
          </div>
        </div>

        {/* Connector */}
        <ServiceConnector color={`${T.amber}1f`} theme={T} />

        {/* Job Lambdas */}
        <div className="mb-4">
          <SectionHeader
            label="Scheduled Jobs"
            badge="EventBridge"
            count={JOB_LAMBDAS.length}
            badgeColor={T.amber}
            theme={T}
          />
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            }}
          >
            {JOB_LAMBDAS.map((l) => (
              <LambdaCard
                key={l.id}
                lambda={l}
                isSelected={selectedLambda?.id === l.id}
                onClick={() => onSelectLambda(l)}
                theme={T}
              />
            ))}
          </div>
        </div>

        {/* Connector */}
        <ServiceConnector color={`${T.blue}1f`} theme={T} />

        {/* External Services */}
        <div>
          <SectionHeader
            label="External Services"
            count={EXTERNAL_SERVICES.length}
            badgeColor={T.purple}
            theme={T}
          />
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))",
            }}
          >
            {EXTERNAL_SERVICES.map((s) => (
              <ServiceCard key={s.id} service={s} theme={T} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Detail panel ── */}
      <AnimatePresence>
        {selectedLambda && (
          <LambdaDetailPanel
            lambda={selectedLambda}
            onClose={onDeselect}
            theme={T}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
