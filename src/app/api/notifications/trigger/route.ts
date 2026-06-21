import { NextResponse } from "next/server";

/**
 * POST /api/notifications/trigger
 *
 * Thin proxy to the OtoParking backend. Supports two modes:
 *
 * 1. Dedicated (production-identical): provide `scenarioId`
 *    → proxies to POST {BACKEND_URL}/api/test/notifications/{scenarioId}
 *    The backend calls the real PushcasterService.notifyXxx() method.
 *
 * 2. Generic (raw payload): omit `scenarioId`
 *    → proxies to POST {BACKEND_URL}/api/test/notifications/trigger
 *    The backend forwards the raw payload directly.
 */

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function POST(request: Request) {
  const body = await request.json();

  // Determine the backend endpoint
  const scenarioId = (body as Record<string, unknown>)?.scenarioId as
    | string
    | undefined;
  const path = scenarioId
    ? `/api/test/notifications/${scenarioId}`
    : "/api/test/notifications/trigger";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const data = await res.json();
    const success = res.ok;
    const backendData = data?.data ?? {};

    return NextResponse.json(
      {
        success,
        workflowId: backendData.workflowId ?? scenarioId ?? body.workflowId,
        status: res.status,
        subscriberId: backendData.subscriberId,
        email: backendData.email,
        channels: backendData.channels,
        sentAt: backendData.sentAt,
        usedTemplate: backendData.usedTemplate,
        message: success
          ? (data?.message ?? "OK")
          : (data?.message ?? `Backend returned HTTP ${res.status}`),
      },
      { status: success ? 200 : 502 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        message: `Backend unreachable: ${msg}`,
      },
      { status: 502 },
    );
  }
}
