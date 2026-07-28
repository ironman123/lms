# Converso LMS — System Design Audit

Date: 2026-07-28

## Executive summary

Converso is a full-stack examination and learning-management application. It supports:

- exam/category/paper/question authoring;
- AI-assisted PDF and syllabus ingestion;
- practice and timed mock sessions;
- per-question telemetry and session analytics;
- user dashboards and topic/exam performance summaries;
- paid bundles through Razorpay;
- notifications and web push;
- Supabase authentication;
- PostgreSQL persistence through Prisma;
- Upstash Redis caching/rate limiting and QStash background delivery.

The project is not a write-off. It is a coherent modular monolith with several good foundations: server-side authorization helpers, schema validation on most admin mutations, relational constraints, a queue boundary for push/interaction processing, and an App Router structure that reflects product areas.

Its current design health is approximately **5/10**. The product surface is substantial, but the codebase has accumulated correctness, latency, and maintenance debt faster than its boundaries have matured. The highest remaining risks are missing database indexes for core dashboard/session queries, completion latency, broken lint tooling, weak observability, and the absence of automated tests. Paid-access correctness, session-start scaling, and interaction-worker fan-out were remediated in the 2026-07-28 refactor.

## Current architecture

```text
Browser
  |
  | Next.js navigation / React Server Actions / route handlers
  v
Next.js App Router modular monolith
  |-- Server Components: page reads and rendering
  |-- Server Actions: auth, admin CRUD, purchases, sessions, analytics
  |-- API routes: QStash workers, webhooks, push subscription, admin lookups
  |
  +--> Supabase Auth
  +--> PostgreSQL <-- Prisma + pg adapter/pool
  +--> Upstash Redis <-- cache + rate limits
  +--> QStash <-- interaction/push jobs
  +--> Razorpay <-- orders, verification, webhooks
  +--> Google/IBM/PDF tooling <-- document ingestion
  +--> Web Push providers
```

This is an appropriate broad architecture for the current product size. A separate microservice fleet would add operational cost without solving the present problems. The next step should be a better-structured modular monolith, not microservices.

## What is working well

### Clear product modules

The route tree has understandable product areas: library/admin authoring, dashboards, session execution, results, subscriptions, and notifications.

### Server-side authorization on mutations

The category, exam, paper, question, bundle, notification, OCR, profile, onboarding, and session actions generally call `requireAdmin()` or `requireAuth()` at the mutation boundary.

### Validation exists where it matters most

Admin write flows use Zod-backed schemas for exams, categories, papers, and questions. Database constraints also cover important relationships and uniqueness rules.

### Batch creation is already used in several places

Question interactions, syllabus entries, tags, and paper links use `createMany` or transactions instead of issuing every write independently.

### External work has begun moving to queues

Push delivery and detailed interaction persistence have QStash endpoints with signature verification. This is the correct direction even though the worker implementation still needs work.

### Caching has failure fallback

The Redis wrapper falls back to PostgreSQL when Redis is unavailable, which protects correctness. Cache invalidation is explicit and tagged.

## Critical findings

### P0 — Paid-access correctness is broken

**Status: remediated in the 2026-07-28 session-start refactor.** The details
below describe the original defect and why the new entitlement resolver was
introduced.

The session gate first asks whether an active bundle explicitly contains the paper:

```ts
where: { paperIds: { has: paperId }, isActive: true }
```

However, a `FULL_ACCESS` bundle represents its papers with an empty `paperIds` array. That means the initial bundle lookup does not find it, the access check is skipped, and papers covered only by full-access bundles can be started for free.

The reverse problem exists inside `checkPaperAccess()`: any paid `FULL_ACCESS` purchase qualifies without ensuring that the bundle's `examId` matches the paper's exam. A full-access purchase for Exam A can therefore qualify for a paper in Exam B.

The entitlement model should be normalized:

- `BundlePaper(bundleId, paperId)` for explicit mock packs;
- `ProductBundle.examId` for exam-wide access;
- one access query that first resolves the paper's exam and then checks either the explicit paper link or a matching exam-wide bundle;
- an integration-test matrix for free, mock-pack, full-access, expired, refunded, inactive, and cross-exam cases.

This should be fixed before performance tuning because an optimized incorrect gate is still incorrect.

### P1 — Internal user-bundle helper is exported from a `"use server"` module

The unsafe `checkPaperAccess(userId, paperId)` export was removed during the
session refactor. `getUserBundles(userId)` remains exported from a Server
Actions module and accepts a caller-provided user ID without authenticating or
enforcing self-access.

Even if they are currently imported only by trusted server code, this is an unsafe boundary and can become a user-information oracle when referenced from client code. Move internal queries into a normal server-only service module. Public actions should derive the user ID from `requireAuth()`, never accept it from the browser.

### P1 — No tests and no working lint gate

There are no test/spec files or test scripts. The lint script fails before inspecting source because `eslint-config-next@0.2.4` does not provide the imports used by the flat config, while the app runs Next `16.2.4`. This leaves a large, payment-enabled application without an executable regression gate.

At minimum, CI should run:

1. TypeScript;
2. ESLint with matching Next tooling;
3. Prisma validation/migration checks;
4. unit tests for scoring and access rules;
5. integration tests for session creation/completion and Razorpay state transitions;
6. one end-to-end practice and mock flow.

## Why practice/mock session start is slow

**Status: the largest structural costs were removed in the 2026-07-28
session-start refactor.** Session creation now performs access/rate checks
concurrently, reads only the question count, inserts one `TestSession` row, and
defers interaction rows until submission. Session layout/page paper reads are
request-deduplicated, cold cache writes happen after the response, and auth uses
verified claims with request-level memoization. Production timings are still
needed to quantify the remaining external latency.

There is no production timing instrumentation yet, so an exact improvement
percentage cannot be assigned honestly. The original code showed a long
serialized critical path and two clear scaling costs.

### Original phase 1 — Server Action before navigation

`StartExamButton` waits for `createExamSession()` to finish before `router.push()` runs.

The action performs, mostly in sequence:

1. Supabase `getUser()` network validation.
2. Redis user-cache read; PostgreSQL user read and Redis write on a miss.
3. Product-bundle lookup.
4. Purchase/access join query when a matching bundle is found.
5. Upstash Redis rate-limit request.
6. Paper question-ID query.
7. A PostgreSQL transaction creating the session.
8. `createMany` for one `QuestionInteraction` row per question.
9. Server Action response.

The interaction insert is one batch statement, which is much better than N individual calls, but it still blocks the user and grows with paper size. It also maintains several indexes for every inserted row.

### Original phase 2 — Navigation/render after creation

After the action returns, the new route performs more work:

1. Middleware calls Supabase `getUser()` again.
2. The session layout queries the paper and exam metadata.
3. The practice/mock page calls `requireAuth()` again.
4. The page reads the user cache again.
5. It queries the just-created session.
6. It reads the entire paper from Redis.
7. On a cache miss it loads every question from PostgreSQL, serializes the full paper into Redis, writes tag metadata, and only then returns it.
8. The complete question set is serialized into the React Server Component payload and hydrated in the client.

The layout and page query overlapping paper data separately. Redis is also on the critical path even when PostgreSQL may already be geographically close to the application.

### Likely bottleneck order

Without production spans, the likely order is:

1. **Accumulated remote round trips** across Supabase, Redis, and PostgreSQL.
2. **Cold paper-cache load and write** for a full question paper.
3. **Eager interaction-row creation**, especially for large papers.
4. **Duplicate auth and paper work during navigation**.
5. **Large server-component payload/hydration** for papers with large content/options.

### Recommended session-start redesign

#### First: add timing spans

Instrument these exact segments with one request/session correlation ID:

- auth;
- user cache;
- entitlement;
- rate limit;
- paper metadata;
- session insert;
- interaction insert;
- route auth;
- session fetch;
- paper cache read/miss/write;
- RSC response size and client interactive time.

Record p50, p95, p99, cache-hit rate, question count, and region. Optimize from measured p95 data.

#### Then: shorten the critical path

1. Resolve auth once per request and use request-scoped memoization.
2. Replace array-based bundle checks with the normalized entitlement query.
3. Run independent entitlement metadata and rate-limit operations concurrently after auth.
4. Read only a question count for session creation, not every question ID.
5. Create only the `TestSession` synchronously.
6. Create `QuestionInteraction` lazily on first interaction or batch-upsert all interactions at submission.
7. Deduplicate layout/page paper metadata reads with a shared cached server function.
8. Avoid waiting for a Redis cache write before rendering a cold paper.
9. Consider loading question content in chunks if papers are large; do not expose answer keys in mock-mode payloads.
10. Prefetch the session route/paper data from the lobby where appropriate, but never pre-create a session on hover.

A sensible target is a p95 click-to-session-shell time under one second in the application's primary region, with question content following immediately.

### Session crash recovery

**Status: remediated on 2026-07-28.** The client now sends one validated bulk
checkpoint every 15 seconds and when the document is hidden or unloaded.
Checkpoint writes verify the authenticated owner and paper membership. A
monotonic revision prevents late requests from overwriting newer answers.
Reloading an active session restores answers, flags, interaction counters,
dwell time, and the original wall-clock timer. Final scoring remains
server-authoritative and overwrites checkpoint-only correctness values.

## Database and data-model findings

### Missing core indexes

`TestSession` has no indexes despite frequent filtering and ordering by user, completion state, paper, and start time. Add indexes based on measured query plans, likely:

- `(userId, startTime DESC)`;
- `(userId, endTime, startTime DESC)`;
- `(paperId)`.

`ActivityLog` should have `(sessionId, timestamp)` if the activity tail remains a feature.

### Array-based bundle membership is the wrong long-term model

`ProductBundle.paperIds String[]` makes integrity and entitlement queries harder:

- no foreign key from an array member to `QuestionPaper`;
- awkward cross-exam correctness;
- harder indexing/query planning;
- more complicated updates and cache invalidation.

A join table is safer and easier to test.

### Analytics reads can become unbounded

The exam dashboard loads every completed session and all of its interactions for an exam into application memory. This will slow down as a serious user accumulates history. Subject and hesitation aggregates should eventually be stored incrementally or computed in bounded SQL queries.

### Statistics updates are vulnerable to concurrent lost updates

`updateUserStats()` reads JSON maps, mutates them in application memory, then writes them back. Two sessions completed concurrently can overwrite each other's JSON changes. Move critical aggregates to normalized rows or use a transaction/locking strategy.

## API and asynchronous-work findings

### Server Actions mix transport and domain logic

Actions currently perform authentication, validation, data access, payment decisions, cache invalidation, queue publication, analytics, and response formatting in the same files. The session action is 246 lines and the dashboard action is 279 lines.

Adopt three lightweight layers:

- action/route adapter: authenticate, validate, map errors;
- domain service: session, entitlement, scoring, purchase rules;
- repository/integration modules: Prisma, Redis, QStash, Razorpay.

This remains one deployable application while making behavior testable without React.

### Error contracts are inconsistent

Some actions return `{ success, error }`, some throw generic `Error`, some redirect, and some return raw Prisma objects. Define typed result/error codes for client-invoked actions and keep redirects at page/form boundaries.

### Queue interaction worker fan-out

**Status: remediated on 2026-07-28.** Checkpoints and the QStash completion
worker now share one repository function that validates paper membership and
executes one idempotent bulk upsert. The revision guard also makes duplicate or
out-of-order delivery safe.

### Session completion still waits for “background” work

`completeExamSession()` awaits both QStash publication and aggregate-stat updates before returning. QStash publishing is a remote call, and stats perform multiple reads/upserts. Persist the authoritative session result transactionally, enqueue a durable post-processing job, and return.

### Request validation is uneven

QStash and Razorpay signatures are verified, which is good, but JSON payloads are cast directly to TypeScript interfaces. Runtime schemas should validate queue, webhook, and push-subscription bodies before database work.

### Payment state should be webhook-authoritative and idempotent

Client callback verification marks purchases paid; the webhook handles failure/refund. Make captured/authorized payment webhooks the authoritative state transition, store processed event IDs, and make every transition idempotent.

## Maintainability findings

### Oversized components

Several components carry too many responsibilities:

- `PaperBuilder.tsx`: ~605 lines;
- `ActiveSessionClient.tsx`: ~552 lines;
- `QuestionCard.tsx`: ~548 lines;
- `NewExamForm.tsx`: ~384 lines;
- `QuestionForm.tsx`: ~327 lines.

Split by domain behavior, not arbitrary visual fragments. For example, session state/reducer, question renderer, navigator, submission coordinator, and telemetry adapter should be separate units with tests.

### Weak typing is widespread

There are roughly 99 `any`/`as any` occurrences. The Redis paper cache returns `Promise<any>`, which removes type safety exactly where mock-answer sanitization matters.

### Dead and placeholder code remains

The repository contains commented authentication code, a mostly commented session layout, “replace this block” comments in production routes, and a stock Create Next App README. These are signals that changes are being applied as patches without a cleanup pass.

### Dependency drift

Notable version/tooling problems include:

- `eslint-config-next@0.2.4` with Next `16.2.4`;
- Prisma packages resolving to different patch versions;
- `@prisma/adapter-pg` on major version 7 while Prisma Client is on major version 6.

There are also likely unused packages or abandoned integrations (`@google/genai`, Appwrite, `pdfjs-dist`, and commented Clerk usage). Confirm with a dependency audit and remove them to reduce install/build surface.

### No operational documentation

The README is still the framework starter. It does not document architecture, required services, environment variables, migrations, queue/webhook setup, deployment, recovery, or local test data.

## Theme-system remediation completed

The dark theme previously had a token layer but most product UI bypassed it with hard-coded white, black, and slate utilities. The remediation:

- centralized and refined light/dark surface, text, border, input, focus, sidebar, success, and warning tokens;
- migrated legacy product surfaces across 60+ files to semantic theme classes;
- updated cards, forms, navigation, dashboards, lobby/results, authoring, and session UI;
- preserved intentional inverse colors on dark marketing/status surfaces;
- fixed the theme toggle when the current preference is `system`;
- added an accessible label/title to the toggle;
- enabled browser `color-scheme`;
- removed the duplicate stylesheet-level Google Font import and uses the root Next font variable.

Future UI should use `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, and the semantic status tokens. Hard-coded slate colors should be reserved for intentionally fixed inverse/brand artwork.

## Recommended delivery sequence

### Immediate — correctness and observability

1. Fix and test entitlement rules.
2. Move internal access helpers out of Server Actions.
3. Add session-start tracing and production p95 dashboards.
4. Repair lint tooling and add CI.
5. Add access/scoring/session integration tests.

### Next — session latency

1. Add `TestSession` indexes based on query plans.
2. Move completion analytics fully behind the queue.
3. Add production session-start and checkpoint telemetry.

### Then — structural cleanup

1. Normalize bundle-paper relationships.
2. Extract entitlement/session/scoring services.
3. Split the large session and builder components.
4. Normalize analytics data that is currently stored in JSON.
5. Remove unused dependencies and dead code.
6. Replace the starter README with an operator/developer guide.

## Validation performed for the theme change

- Production `next build`: passed.
- TypeScript `tsc --noEmit`: passed.
- `git diff --check`: passed.
- ESLint: could not start because of the pre-existing `eslint-config-next` version/configuration mismatch described above.
