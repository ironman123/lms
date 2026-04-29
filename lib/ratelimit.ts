import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { redis } from "@/lib/redis";
import { UserRole } from "@prisma/client";


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