# Controlled performance checks

The app already records structured session creation/completion durations and
returns `Server-Timing` for checkpoints. This script measures the full
authenticated checkpoint path: browser edge, authentication, rate limit,
database upsert, and response.

Use a disposable **practice** session owned by a dedicated load-test account.
Never run it against an active student session, because a checkpoint is an
intentional write.

```powershell
$env:LOAD_TEST_URL='https://your-deployment.vercel.app'
$env:LOAD_TEST_SESSION_ID='test-session-id'
$env:LOAD_TEST_COOKIE='sb-...=...'
$env:LOAD_TEST_REQUESTS='100'
$env:LOAD_TEST_CONCURRENCY='10'
npm run load:checkpoint
```

Start at five concurrent requests and increase gradually. For the current
checkpoint policy, success responses should dominate and p95 should remain
below 750 ms. A burst of `429` responses means the rate limiter is protecting
the session; it is not a capacity result. Run this in a staging deployment and
observe Vercel, Supabase, and Upstash metrics at the same time.

Before a real load exercise, use the admin **System operations** page to
confirm the database, Redis, QStash, canonical URL, and cron secret are set.
