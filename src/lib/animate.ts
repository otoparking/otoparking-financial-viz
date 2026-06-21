import type { ParticleData } from "@/types/financial";

/**
 * Quadratic bezier interpolation for a single axis.
 */
function quadraticBezier(a: number, b: number, c: number, t: number): number {
  return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
}

/**
 * Renders a single frame of all active particles onto the canvas.
 * Particles follow a quadratic bezier arc from source → control → target.
 * Each particle lives for `duration` ms and fades out over the last 20 frames.
 */
export function renderParticlesFrame(
  ctx: CanvasRenderingContext2D,
  particles: ParticleData[],
  now: number,
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  for (const p of particles) {
    const elapsed = now - p.startTime;
    if (elapsed < 0) continue;

    const progress = Math.min(elapsed / p.duration, 1);
    if (progress >= 1) continue;

    // Control point: midpoint offset upward for arc
    const midX = (p.fromX + p.toX) / 2;
    const midY = (p.fromY + p.toY) / 2 - 40;

    const x = quadraticBezier(p.fromX, midX, p.toX, progress);
    const y = quadraticBezier(p.fromY, midY, p.toY, progress);

    // Fade out over the last 20 frames (≈ 333ms at 60fps)
    const fadeProgress = Math.max(0, (progress - 0.67) / 0.33);
    const alpha = 1 - fadeProgress;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 5px circle
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // Glow
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}

/**
 * Eases a counter from oldValue to newValue over `duration` ms.
 * Returns the current interpolated value for the given elapsed time.
 * Uses ease-out cubic.
 */
export function animateCounter(
  oldValue: number,
  newValue: number,
  elapsed: number,
  duration: number,
): number {
  const progress = Math.min(elapsed / duration, 1);
  const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
  return oldValue + (newValue - oldValue) * eased;
}

/**
 * Standard ease-out cubic curve (1 − (1 − t)³).
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
