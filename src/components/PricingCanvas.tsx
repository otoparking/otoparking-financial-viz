"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NumberFlow from "@number-flow/react";
import type {
  PricingResult,
  TariffBracket,
  PricingStep,
} from "@/types/pricing";
import {
  CheckCircle2,
  Clock,
  Clock3,
  TrendingUp,
  Hash,
  Car,
} from "lucide-react";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";

interface PricingCanvasProps {
  result: PricingResult | null;
  brackets: TariffBracket[];
}

// ─── Step Badge ──────────────────────────────────────────────────────────────

function StepBadge({
  index,
  status,
  theme: T,
}: {
  index: number;
  status: PricingStep["status"];
  theme: ThemeTokens;
}) {
  const isDone = status === "done";
  const isActive = status === "active";
  const isSkipped = status === "skipped";

  const bg = isDone
    ? "rgba(29,158,117,0.15)"
    : isActive
      ? "rgba(203,255,0,0.12)"
      : T.card;
  const border = isDone
    ? `1px solid rgba(29,158,117,0.4)`
    : isActive
      ? `1px solid ${T.accent}`
      : isSkipped
        ? `1px solid ${T.border}`
        : `1px solid ${T.border}`;
  const textColor = isDone ? T.green : isActive ? T.accent : T.textDim;

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {/* ripple rings — active only */}
      {isActive && (
        <>
          <motion.div
            style={{
              position: "absolute",
              inset: -5,
              borderRadius: "50%",
              border: `1.5px solid ${T.accent}72`,
              pointerEvents: "none",
            }}
            animate={{ opacity: [0.6, 0], scale: [1, 1.55] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            style={{
              position: "absolute",
              inset: -5,
              borderRadius: "50%",
              border: `1.5px solid ${T.accent}4D`,
              pointerEvents: "none",
            }}
            animate={{ opacity: [0.4, 0], scale: [1, 1.8] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.5,
            }}
          />
        </>
      )}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: bg,
          border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: textColor,
          boxShadow: isActive
            ? `0 0 12px ${T.accent}33, 0 0 4px ${T.accent}1A`
            : isDone
              ? `0 0 10px ${T.green}26`
              : "none",
        }}
      >
        {isDone ? (
          <CheckCircle2 size={14} />
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          >
            {index + 1}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline Step Card ───────────────────────────────────────────────────────

function PipelineStepCard({
  step,
  index,
  isLast,
  theme: T,
}: {
  step: PricingStep;
  index: number;
  isLast: boolean;
  theme: ThemeTokens;
}) {
  const isActive = step.status === "active";
  const isDone = step.status === "done";
  const isSkipped = step.status === "skipped";

  const cardBg = isActive
    ? "oklch(0.20 0.04 180 / 0.55)"
    : isDone
      ? "oklch(0.17 0.03 183 / 0.45)"
      : T.card;

  const cardBorder = isActive
    ? `1px solid ${T.accent}52`
    : isDone
      ? `1px solid ${T.green}38`
      : `1px solid ${T.borderSubtle}`;

  const labelColor = isActive
    ? T.accent
    : isDone
      ? T.green
      : isSkipped
        ? T.textDim
        : T.textDim;

  const detailColor = isSkipped ? T.textDim : T.textMuted;

  const tagBg = isActive ? `${T.accent}1F` : isDone ? `${T.green}1F` : T.card;
  const tagColor = isActive ? T.accent : isDone ? T.green : T.textDim;
  const tagBorder = isActive
    ? `1px solid ${T.accent}40`
    : isDone
      ? `1px solid ${T.green}33`
      : `1px solid ${T.borderSubtle}`;
  const tagLabel = isActive
    ? "ACTIVE"
    : isDone
      ? "DONE"
      : isSkipped
        ? "SKIP"
        : "WAIT";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: isSkipped ? 0.45 : 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3, ease: "easeOut" }}
      style={{ position: "relative" }}
    >
      {/* connector line to next step */}
      {!isLast && (
        <div
          style={{
            position: "absolute",
            left: 35,
            top: "100%",
            width: 1,
            height: 4,
            background: isDone ? `${T.green}33` : T.borderSubtle,
            zIndex: 0,
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "13px 16px",
          borderRadius: 10,
          background: cardBg,
          border: cardBorder,
          boxShadow: isActive
            ? `0 2px 20px ${T.accent}0F, inset 0 1px 0 ${T.accent}0F`
            : isDone
              ? `0 1px 12px ${T.green}0D`
              : "none",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* active shimmer stripe */}
        {isActive && (
          <motion.div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: `linear-gradient(180deg, transparent, ${T.accent}, transparent)`,
              borderRadius: "10px 0 0 10px",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <StepBadge index={index} status={step.status} theme={T} />

        {/* content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: labelColor,
              marginBottom: 3,
              letterSpacing: "0.01em",
            }}
          >
            {step.label}
          </div>
          <div
            style={{
              fontSize: 9.5,
              lineHeight: 1.45,
              color: detailColor,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              letterSpacing: "0.01em",
            }}
          >
            {step.detail}
          </div>
        </div>

        {/* status pill */}
        <div
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            fontSize: 8.5,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            padding: "3px 7px",
            borderRadius: 5,
            background: tagBg,
            color: tagColor,
            border: tagBorder,
            letterSpacing: "0.05em",
          }}
        >
          {tagLabel}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Tariff Timeline ──────────────────────────────────────────────────────────

function TariffTimeline({
  brackets,
  activeBracket,
  theme: T,
}: {
  brackets: TariffBracket[];
  activeBracket: TariffBracket | null;
  theme: ThemeTokens;
}) {
  const totalSpan = useMemo(
    () => brackets.reduce((s, b) => s + b.span, 0),
    [brackets],
  );

  return (
    <div>
      {/* section label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Car size={10} color={T.textDim} />
        <span
          style={{
            fontSize: 9,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontWeight: 600,
            color: T.textDim,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
          }}
        >
          TARIFF BRACKETS — OULFA · CAR
        </span>
      </div>

      {/* bracket bar */}
      <div
        style={{
          display: "flex",
          height: 56,
          borderRadius: 10,
          overflow: "hidden",
          border: `1px solid ${T.borderSubtle}`,
          background: T.bg,
        }}
      >
        {brackets.map((bracket, i) => {
          const pct = (bracket.span / totalSpan) * 100;
          const isActive =
            activeBracket !== null &&
            activeBracket.hourStart === bracket.hourStart &&
            activeBracket.hourEnd === bracket.hourEnd;
          const isNarrow = bracket.type === "Narrow";

          const segBg = isActive
            ? "oklch(0.25 0.08 178 / 0.75)"
            : isNarrow
              ? "oklch(0.22 0.06 170 / 0.55)"
              : "oklch(0.20 0.06 120 / 0.4)";

          return (
            <div
              key={i}
              style={{
                width: `${pct}%`,
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                justifyContent: "center",
                background: segBg,
                borderRight:
                  i < brackets.length - 1 ? `1px solid ${T.border}` : "none",
                position: "relative" as const,
                cursor: "default",
                transition: "background 0.3s ease",
                gap: 4,
              }}
            >
              {/* active glow overlay */}
              {isActive && (
                <motion.div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(ellipse at 50% 50%, ${T.accent}1F 0%, transparent 70%)`,
                    pointerEvents: "none",
                  }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}

              {/* top border glow when active */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: T.accent,
                    boxShadow: `0 0 8px ${T.accent}CC`,
                  }}
                />
              )}

              {/* price */}
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: isActive ? T.accent : isNarrow ? "#7DDBB8" : "#A8D8A0",
                  lineHeight: 1,
                  position: "relative" as const,
                  textShadow: isActive ? `0 0 12px ${T.accent}80` : "none",
                  transition: "color 0.3s, text-shadow 0.3s",
                }}
              >
                {bracket.price}
              </span>
              {/* currency + type label */}
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontWeight: 600,
                  color: isActive ? `${T.accent}B3` : T.textDim,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  position: "relative" as const,
                }}
              >
                MAD
              </span>
            </div>
          );
        })}
      </div>

      {/* hour labels */}
      <div style={{ display: "flex", marginTop: 6 }}>
        {brackets.map((bracket, i) => {
          const pct = (bracket.span / totalSpan) * 100;
          const isActive =
            activeBracket !== null &&
            activeBracket.hourStart === bracket.hourStart &&
            activeBracket.hourEnd === bracket.hourEnd;

          return (
            <div
              key={i}
              style={{
                width: `${pct}%`,
                textAlign: "center" as const,
              }}
            >
              <span
                style={{
                  fontSize: 8.5,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? `${T.accent}BF` : T.textDim,
                  letterSpacing: "0.03em",
                }}
              >
                {bracket.hourStart}h–{bracket.hourEnd}h
              </span>
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 8,
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: "oklch(0.22 0.06 170 / 0.8)",
              border: "1px solid rgba(125,219,184,0.3)",
            }}
          />
          <span
            style={{
              fontSize: 8.5,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              color: T.textDim,
              letterSpacing: "0.04em",
            }}
          >
            Narrow (flat)
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: "oklch(0.20 0.06 120 / 0.8)",
              border: "1px solid rgba(168,216,160,0.3)",
            }}
          />
          <span
            style={{
              fontSize: 8.5,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              color: T.textDim,
              letterSpacing: "0.04em",
            }}
          >
            Wide (per-overflow-hr)
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Fare Result Panel ────────────────────────────────────────────────────────

function FareResultPanel({
  result,
  theme: T,
}: {
  result: PricingResult | null;
  theme: ThemeTokens;
}) {
  const hasResult = result !== null;

  const durationHours = hasResult
    ? Math.floor(result!.durationMinutes / 60)
    : 0;
  const durationMins = hasResult ? result!.durationMinutes % 60 : 0;
  const ceilHours = hasResult ? Math.ceil(result!.durationMinutes / 60) : 0;

  return (
    <div
      style={{
        flexShrink: 0,
        height: 150,
        background: T.header,
        borderTop: `1px solid ${hasResult ? `${T.accent}47` : T.borderSubtle}`,
        backdropFilter: "blur(20px)",
        padding: "14px 20px 16px",
        display: "flex",
        alignItems: "stretch",
        gap: 20,
        position: "relative" as const,
        overflow: "hidden",
      }}
    >
      {/* subtle grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 23px, ${T.borderSubtle} 24px)`,
          pointerEvents: "none",
        }}
      />

      <AnimatePresence mode="wait">
        {hasResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{
              display: "flex",
              gap: 20,
              width: "100%",
              position: "relative" as const,
            }}
          >
            {/* left — fare display */}
            <div
              style={{
                flex: "0 0 55%",
                display: "flex",
                flexDirection: "column" as const,
                justifyContent: "center",
              }}
            >
              {result!.withinGrace ? (
                <>
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontWeight: 600,
                      color: `${T.green}BF`,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase" as const,
                      marginBottom: 4,
                    }}
                  >
                    Grace period — 0 MAD
                  </div>
                  <div
                    style={{
                      fontSize: 38,
                      fontWeight: 800,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      color: T.green,
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                      textShadow: `0 0 24px ${T.green}66`,
                    }}
                  >
                    FREE
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontWeight: 600,
                      color: `${T.accent}80`,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase" as const,
                      marginBottom: 4,
                    }}
                  >
                    TOTAL FARE
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 6,
                      lineHeight: 1,
                    }}
                  >
                    <NumberFlow
                      value={result!.totalFare}
                      format={{
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }}
                      style={{
                        fontSize: 42,
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        color: T.accent,
                        letterSpacing: "-0.02em",
                        textShadow: `0 0 28px ${T.accent}59`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        color: `${T.accent}99`,
                        letterSpacing: "0.04em",
                      }}
                    >
                      MAD
                    </span>
                  </div>
                </>
              )}

              {/* chips row */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 9,
                  flexWrap: "wrap" as const,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: T.card,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  <Clock size={9} color={T.textDim} />
                  <span
                    style={{
                      fontSize: 9.5,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontWeight: 600,
                      color: T.textMuted,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {durationHours > 0 ? `${durationHours}h ` : ""}
                    {durationMins}m
                  </span>
                </div>
                {result!.bracketUsed && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: `${T.accent}0F`,
                      border: `1px solid ${T.accent}26`,
                    }}
                  >
                    <Hash size={9} color={`${T.accent}80`} />
                    <span
                      style={{
                        fontSize: 9.5,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        fontWeight: 600,
                        color: `${T.accent}99`,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {result!.bracketUsed.hourStart}h–
                      {result!.bracketUsed.hourEnd}h
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* divider */}
            <div
              style={{
                width: 1,
                background: T.borderSubtle,
                flexShrink: 0,
                margin: "4px 0",
              }}
            />

            {/* right — computation summary */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column" as const,
                justifyContent: "center",
                gap: 9,
              }}
            >
              {/* duration row */}
              <div>
                <div
                  style={{
                    fontSize: 7.5,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontWeight: 700,
                    color: T.textDim,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    marginBottom: 2,
                  }}
                >
                  Duration
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontWeight: 600,
                    color: T.textMuted,
                    letterSpacing: "0.02em",
                  }}
                >
                  {durationHours > 0 ? `${durationHours}h ` : ""}
                  {durationMins}m ({result!.durationMinutes} min)
                </div>
              </div>

              {/* ceiling row */}
              <div>
                <div
                  style={{
                    fontSize: 7.5,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontWeight: 700,
                    color: T.textDim,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    marginBottom: 2,
                  }}
                >
                  Ceiling
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontWeight: 600,
                    color: T.textMuted,
                    letterSpacing: "0.02em",
                  }}
                >
                  ⌈{result!.durationMinutes}/60⌉ = {ceilHours}h
                </div>
              </div>

              {/* bracket row */}
              <div>
                <div
                  style={{
                    fontSize: 7.5,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontWeight: 700,
                    color: T.textDim,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    marginBottom: 2,
                  }}
                >
                  Bracket
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontWeight: 600,
                    color: result!.withinGrace ? T.green : T.accent,
                    letterSpacing: "0.02em",
                  }}
                >
                  {result!.withinGrace
                    ? "Grace — free"
                    : result!.bracketUsed
                      ? `[${result!.bracketUsed.hourStart}h–${result!.bracketUsed.hourEnd}h] · ${result!.bracketUsed.price} MAD`
                      : "—"}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              position: "relative" as const,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: T.card,
                border: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={16} color={T.textDim} />
            </div>
            <span
              style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                color: T.textDim,
                letterSpacing: "0.04em",
              }}
            >
              Select a scenario to compute the fare
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PricingCanvas({
  result,
  brackets,
}: PricingCanvasProps) {
  const T = useTheme();
  const hasResult = result !== null;

  // header result chip
  const resultChip = useMemo(() => {
    if (!hasResult) return null;
    if (result!.withinGrace)
      return {
        label: "FREE",
        color: T.green,
        bg: `${T.green}1F`,
        border: `${T.green}4D`,
      };
    return {
      label: `${result!.totalFare} MAD`,
      color: T.accent,
      bg: `${T.accent}1A`,
      border: `${T.accent}40`,
    };
  }, [hasResult, result, T]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: T.bg,
      }}
    >
      {/* ── Zone 1: Header bar (44px) ─────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: `1px solid ${T.borderSubtle}`,
          background: T.header,
          backdropFilter: "blur(12px)",
        }}
      >
        {/* left: indicator + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: T.accent,
              boxShadow: `0 0 8px ${T.accent}99`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: T.text,
              letterSpacing: "0.03em",
            }}
          >
            Pricing Engine
          </span>
        </div>

        {/* right: live chip */}
        <AnimatePresence mode="wait">
          {resultChip ? (
            <motion.div
              key="chip-result"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.2 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 6,
                background: resultChip.bg,
                border: `1px solid ${resultChip.border}`,
              }}
            >
              <motion.div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: resultChip.color,
                  flexShrink: 0,
                }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontWeight: 700,
                  color: resultChip.color,
                  letterSpacing: "0.04em",
                }}
              >
                {resultChip.label}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="chip-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                padding: "3px 10px",
                borderRadius: 6,
                background: T.card,
                border: `1px solid ${T.border}`,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontWeight: 600,
                  color: T.textDim,
                  letterSpacing: "0.06em",
                }}
              >
                —
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Zone 2: Tariff Timeline (~140px) ─────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          padding: "14px 20px 12px",
          borderBottom: `1px solid ${T.border}`,
          background: T.header,
        }}
      >
        <TariffTimeline
          brackets={brackets}
          activeBracket={result?.bracketUsed ?? null}
          theme={T}
        />
      </div>

      {/* ── Zone 3: Pipeline (flex-1, scrollable) ────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto" as const,
          padding: "12px 20px",
        }}
      >
        <AnimatePresence mode="wait">
          {hasResult && result!.steps.length > 0 ? (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: "flex",
                flexDirection: "column" as const,
                gap: 3,
              }}
            >
              {result!.steps.map((step, i) => (
                <PipelineStepCard
                  key={step.id}
                  step={step}
                  index={i}
                  isLast={i === result!.steps.length - 1}
                  theme={T}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="pipeline-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                paddingTop: 24,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Clock3 size={18} color={T.textDim} />
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: T.textDim,
                  letterSpacing: "0.04em",
                  textAlign: "center" as const,
                  maxWidth: 200,
                  lineHeight: 1.5,
                }}
              >
                Run a pricing scenario to trace the pipeline
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Zone 4: Fare Result Panel (150px) ────────────────────────────── */}
      <FareResultPanel result={result} theme={T} />
    </div>
  );
}
