import type {
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from "@medusajs/framework/http";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries (older than 2 minutes) every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > 120_000) {
      rateLimitStore.delete(ip);
    }
  }
}, 300_000);

// Prevent cleanup interval from blocking process termination
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

export function checkRateLimit(
  ip: string,
  maxPerMinute = 60
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const windowDuration = 60_000; // 60 seconds

  let entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > windowDuration) {
    entry = { count: 1, windowStart: now };
    rateLimitStore.set(ip, entry);
    return {
      allowed: true,
      remaining: maxPerMinute - 1,
      resetAt: new Date(now + windowDuration),
    };
  }

  const resetAt = new Date(entry.windowStart + windowDuration);

  if (entry.count >= maxPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: maxPerMinute - entry.count,
    resetAt,
  };
}

export function getClientIp(req: MedusaRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
}

export function applyRateLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  maxPerMinute = 60
): boolean {
  if ((req as any)._rateLimitInfo) {
    const info = (req as any)._rateLimitInfo;
    res.setHeader("X-RateLimit-Limit", info.limit.toString());
    res.setHeader("X-RateLimit-Remaining", info.remaining.toString());
    res.setHeader("X-RateLimit-Reset", info.resetAt.toISOString());
    return true;
  }

  const ip = getClientIp(req);
  const { allowed, remaining, resetAt } = checkRateLimit(ip, maxPerMinute);

  res.setHeader("X-RateLimit-Limit", maxPerMinute.toString());
  res.setHeader("X-RateLimit-Remaining", remaining.toString());
  res.setHeader("X-RateLimit-Reset", resetAt.toISOString());

  if (!allowed) {
    res.status(429).json({
      type: "rate_limit_exceeded",
      message: "Too many requests. Please try again later.",
    });
    return false;
  }

  (req as any)._rateLimitInfo = { limit: maxPerMinute, remaining, resetAt };
  return true;
}

export function rateLimitMiddleware(maxPerMinute = 60) {
  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): void => {
    if (!applyRateLimit(req, res, maxPerMinute)) {
      return;
    }
    next();
  };
}

/**
 * Resets the rate limit map. Useful for isolated testing.
 */
export function resetRateLimits(): void {
  rateLimitStore.clear();
}
