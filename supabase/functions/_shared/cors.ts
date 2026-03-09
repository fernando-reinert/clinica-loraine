// CORS for Edge Functions. OPTIONS always returns 200; disallowed origins get Allow-Origin: "null".

export const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.88.34:5173",
  "https://clinica-aurea.com",
];

const CORS_METHODS = "POST, OPTIONS";
// Supabase functions.invoke() usa authorization, x-client-info, apikey, content-type.
// Incluímos também x-requested-with para chamadas fetch customizadas.
const CORS_HEADERS_LIST =
  "authorization, x-client-info, apikey, content-type, x-requested-with";
const CORS_MAX_AGE = "86400";

/** Retorna true se a origin é permitida (allowlist + 127.0.0.1 e 192.168.*). */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)) return true;
  if (/^http:\/\/192\.168\.\d+\.\d+(?::\d+)?$/i.test(origin)) return true;
  return false;
}

/**
 * Returns CORS headers. If origin is allowed use it; otherwise use "null"
 * so OPTIONS can still return 200 and preflight passes.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = isAllowedOrigin(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Headers": CORS_HEADERS_LIST,
    "Access-Control-Max-Age": CORS_MAX_AGE,
    "Vary": "Origin",
  };
}

/** Preflight OPTIONS: status 200 with CORS headers. */
export function corsPreflightResponse(req: Request): Response {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(req),
  });
}

/** CORS headers plus Content-Type for JSON responses. */
export function jsonHeadersWithCors(req: Request): Record<string, string> {
  return {
    ...getCorsHeaders(req),
    "Content-Type": "application/json",
  };
}
