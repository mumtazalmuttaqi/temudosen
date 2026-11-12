type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalRateLimitStore = globalThis as unknown as {
  __rateLimitMap?: Map<string, RateLimitEntry>;
};

const rateLimitStore = (globalRateLimitStore.__rateLimitMap ??= new Map());

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  options: { limit?: number; windowMs?: number } = {}
): RateLimitResult {
  const limit = options.limit ?? (process.env.NODE_ENV === "test" ? 1000 : 15);
  const windowMs = options.windowMs ?? 60_000;
  const now = Date.now();

  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: entry.resetAt,
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

