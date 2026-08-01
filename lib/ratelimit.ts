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

// A short burst limit complements the configurable hourly/daily limits stored
// in Postgres. Database uniqueness still guarantees repeated clicks do not
// inflate moderation counts.
export const contentReportRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "rl:content-report",
});

export const appFeedbackRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "10 m"),
    analytics: true,
    prefix: "rl:app-feedback",
});
