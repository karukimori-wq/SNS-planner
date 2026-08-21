export const appName = "sns-planner";
export const appVersion = "0.1.0";
export const contractVersion = "0.1.0";

export const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers":
    "Content-Type, X-Trace-Id, X-Correlation-Id, X-Source-App",
};

export function jsonResponse(
  payload: Record<string, unknown>,
  init?: ResponseInit,
) {
  return new Response(JSON.stringify(payload), {
    status: init?.status ?? 200,
    headers: {
      ...jsonHeaders,
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  });
}

export function optionsResponse() {
  return new Response(null, {
    status: 200,
    headers: jsonHeaders,
  });
}

export function timestamp() {
  return new Date().toISOString();
}
