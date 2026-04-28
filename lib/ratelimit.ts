import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { UserRole } from "@prisma/client";

// Shared Redis client — reused in Phase 4
export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 5 session creations per user per 10 minutes
export const sessionRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    analytics: true,
    prefix: "rl:session",
});

// 20 requests per minute for general API actions
export const actionRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "rl:action",
});