import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";


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

// Checkpoints are deliberately more frequent than normal actions, but still
// bounded per user/session to prevent write amplification.
export const checkpointRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(8, "1 m"),
    analytics: true,
    prefix: "rl:checkpoint",
});
