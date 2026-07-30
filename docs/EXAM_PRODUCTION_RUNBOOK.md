# Exam production runbook

## Safety guarantees

- New attempts only use active, objectively gradable questions with valid
  answer keys. Papers containing subjective or malformed active questions are
  blocked at launch.
- Every attempt stores an immutable question-set snapshot. Later edits and
  archives cannot change what the student saw or how that attempt is scored.
- Submission scoring ignores client-provided correctness and recomputes marks
  from the frozen server snapshot.
- Session completion, final interactions, and the statistics contribution are
  committed in one database transaction.
- Duplicate submissions are acknowledged as the same successful submission.
- Interaction revisions are strictly monotonic. No checkpoint or old QStash
  delivery can overwrite the final interaction snapshot.

## Required production environment

- `DATABASE_URL` and `DIRECT_URL`
- Supabase authentication variables used by the app
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and
  `QSTASH_NEXT_SIGNING_KEY`
- `APP_URL` set to the canonical HTTPS origin
- `CRON_SECRET` configured in Vercel

`vercel.json` invokes `/api/cron/session-stats` daily as a final recovery net.
The request must contain `Authorization: Bearer <CRON_SECRET>`. Statistics are
normally processed inside submission; a failure also queues an immediate
signed QStash retry.

## Alerts and dashboards

Forward structured JSON application logs to the production log drain and alert
on:

- `session_complete_failed`: any occurrence
- `session_stats_deferred`: more than 2 in 15 minutes
- `session_stats_retry_enqueue_failed`: any occurrence
- `session_stats_reconciliation` with `failed > 0`
- `session_create_failed`: more than 5 in 10 minutes
- `checkpoint_rate_limit_unavailable`: more than 3 in 10 minutes

Track p50, p95, and p99 `durationMs` for `session_created` and
`session_completed`. Initial operating targets:

- session creation p95 below 1.5 seconds
- session completion p95 below 3 seconds
- checkpoint p95 below 750 ms (also exposed in `Server-Timing`)
- zero completed sessions without a `SessionStatsContribution`
- zero unprocessed contributions older than 15 minutes

## Incident checks

1. Confirm `prisma migrate status` reports no pending migration.
2. Count completed sessions without contributions.
3. Count contributions where `processedAt` is null.
4. Invoke the protected reconciliation endpoint if pending rows exist.
5. Never repair answer keys by guessing. Correct the source question or keep it
   archived, then re-run `scripts/archive-ungradable-questions.ts` in dry-run
   mode.

## Release gate

Before deployment:

1. `npm test`
2. `npm run typecheck`
3. targeted ESLint for changed files
4. `npm run build`
5. `npx prisma migrate status`
6. dry-run the legacy question archive audit
7. manually complete one mock attempt with correct, incorrect, skipped, and
   flagged answers in the deployment environment
