/**
 * Opt-in checkpoint load probe.
 *
 * It deliberately requires a dedicated test session and cookie. Do not point
 * this at a real student's active attempt: every request persists a revision.
 */
const baseUrl = process.env.LOAD_TEST_URL?.replace(/\/$/, "");
const sessionId = process.env.LOAD_TEST_SESSION_ID;
const cookie = process.env.LOAD_TEST_COOKIE;
const requestCount = Number(process.env.LOAD_TEST_REQUESTS ?? 40);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY ?? 5);

if (!baseUrl || !sessionId || !cookie) {
    throw new Error(
        "Set LOAD_TEST_URL, LOAD_TEST_SESSION_ID, and LOAD_TEST_COOKIE before running this probe."
    );
}
if (!Number.isInteger(requestCount) || requestCount < 1 || requestCount > 500) {
    throw new Error("LOAD_TEST_REQUESTS must be an integer between 1 and 500.");
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 25) {
    throw new Error("LOAD_TEST_CONCURRENCY must be an integer between 1 and 25.");
}
const targetUrl = baseUrl;
const targetSessionId = sessionId;
const sessionCookie = cookie;

const latencies: number[] = [];
const statuses = new Map<number, number>();
let nextRequest = 0;

async function worker() {
    while (nextRequest < requestCount) {
        const index = nextRequest++;
        const startedAt = performance.now();
        const response = await fetch(`${targetUrl}/api/sessions/${targetSessionId}/checkpoint`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: sessionCookie,
                origin: targetUrl,
            },
            // Revisions are monotonic so the endpoint can safely ignore older
            // concurrent arrivals. The empty metric list makes this a pure
            // transport/database probe.
            body: JSON.stringify({ revision: 10_000 + index, metrics: [] }),
        });
        latencies.push(performance.now() - startedAt);
        statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
        await response.arrayBuffer();
    }
}

await Promise.all(Array.from({ length: concurrency }, worker));
latencies.sort((a, b) => a - b);
const percentile = (p: number) => latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * p) - 1)] ?? 0;
const failures = [...statuses.entries()].filter(([status]) => status >= 400).reduce((total, [, count]) => total + count, 0);

console.table({
    url: targetUrl,
    requests: requestCount,
    concurrency,
    failures,
    p50Ms: Math.round(percentile(0.5) * 10) / 10,
    p95Ms: Math.round(percentile(0.95) * 10) / 10,
    p99Ms: Math.round(percentile(0.99) * 10) / 10,
    statusCounts: Object.fromEntries(statuses),
});

if (failures > 0) process.exitCode = 1;

export {};
