// lib/cache.ts
// Cache wrapper backed by Upstash Redis.
//
// Tag-based invalidation works by maintaining a Redis Set per tag:
//   tag:exams          → Set{ "exams:q::p:0", "exams:q:jee:p:0", ... }
//   tag:examCategories → Set{ "categories:q:", ... }
//
// invalidateTag("exams") fetches the set, bulk-deletes all keys, deletes the set.
// withCache(..., ["exams"]) registers the key in the set on every cache write.

import { redis } from "@/lib/redis";

const TAG_PREFIX = "tag:";

export async function withCache<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
    tags: string[] = []
): Promise<T> {
    // ── Cache read ────────────────────────────────────────────────────────────
    try
    {
        const cached = await redis.get<T>(key);
        if (cached !== null) return cached;
    } catch (err)
    {
        // Redis unavailable — fall through to source of truth
        console.warn("[cache] read failed:", err);
    }

    // ── Source of truth ───────────────────────────────────────────────────────
    const value = await fn();

    // ── Cache write (non-fatal) ───────────────────────────────────────────────
    try
    {
        const pipeline = redis.pipeline();
        pipeline.set(key, value, { ex: ttlSeconds });
        for (const tag of tags)
        {
            pipeline.sadd(`${TAG_PREFIX}${tag}`, key);
            // Keep the tag set alive a bit longer than the values it tracks
            pipeline.expire(`${TAG_PREFIX}${tag}`, ttlSeconds + 120);
        }
        await pipeline.exec();
    } catch (err)
    {
        console.warn("[cache] write failed:", err);
    }

    return value;
}

// Deletes every key registered under this tag, then deletes the tag set itself.
export async function invalidateTag(tag: string): Promise<void> {
    try
    {
        const tagKey = `${TAG_PREFIX}${tag}`;
        const keys = await redis.smembers<string[]>(tagKey);

        if (keys.length > 0)
        {
            const pipeline = redis.pipeline();
            for (const k of keys) pipeline.del(k);
            pipeline.del(tagKey);
            await pipeline.exec();
        }
    } catch (err)
    {
        console.warn(`[cache] invalidateTag(${tag}) failed:`, err);
    }
}

// Convenience: delete a single key directly.
export async function invalidateKey(key: string): Promise<void> {
    try
    {
        await redis.del(key);
    } catch (err)
    {
        console.warn(`[cache] invalidateKey(${key}) failed:`, err);
    }
}

export async function getCachedPaper(paperId: string, fetcher: () => Promise<any>) {
    return withCache(
        `paper:${paperId}`,
        86400, // 24 hours (86,400 seconds)
        fetcher,
        ["papers", `paper:${paperId}`] // Tags for easy invalidation
    );
}