// Simple in-memory rate limit for completeStaffSignup (by IP).
const windowMs = 15 * 60 * 1000; // 15 min
const maxAttempts = 10;

const store = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
}

export function checkRateLimit(req: Request): boolean {
  const key = getClientKey(req);
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= maxAttempts;
}

/** Call once per attempt; returns false if over limit (then return 429). */
export function consumeRateLimit(req: Request): boolean {
  return checkRateLimit(req);
}
