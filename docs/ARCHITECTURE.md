# Architecture

## System shape

Spectrum is a pnpm monorepo with two deployable applications:

- Expo/React Native mobile client (`mobile`)
- Express API and PostgreSQL data layer (`server`)

PostgreSQL is the system of record. Prisma owns schema and tracked migrations. Profile media uses private S3 objects with short-lived signed upload/read URLs in production and an authenticated local-file adapter in development.

## Trust boundaries

The mobile client is untrusted. Every API route validates input, derives the acting user from an access token, and performs relationship authorization server-side. Passwords and refresh tokens are hashed with Argon2. Access tokens are short-lived. Mobile tokens belong in SecureStore.

Public profile data is separated from authentication data. Exact location is not part of a public response. Approximate coordinates are used only for server-side distance filtering and must be rounded before storage in production.

## Matching

The compatibility engine is deterministic and returns a 0–100 score with a transparent breakdown:

| Dimension | Weight |
| --- | ---: |
| Dating goals | 15 |
| Communication style | 15 |
| Sensory preferences | 15 |
| Social energy | 10 |
| Routine/flexibility | 10 |
| Interests | 10 |
| Distance | 10 |
| Vices compatibility | 5 |
| Preferred date environments | 5 |
| Pace and boundaries | 5 |

Diagnosis and support-needs labels are not inputs. Blocking, rejection, prior likes, existing matches, account status, setup completion, pause state, and reciprocal distance, dating-goal, age, and gender preferences are hard filters before scoring. Unknown coordinates remain unknown and do not produce a fabricated distance.

Candidate responses expose a derived age and rounded distance, never a birth date or coordinates. Compatibility explanations name the strongest user-controlled dimensions and shared preferences. A snapshot is stored when a mutual match is created so later preference edits do not rewrite the reason shown for that match.

Free-like usage is incremented with match creation inside a serializable database transaction. A per-user UTC date key makes the eight-like limit atomic and independently auditable. Duplicate likes are idempotent and do not consume quota. Premium access is accepted only when the subscription is active or trialing.

Private photos use short-lived S3 read URLs in production. The local media endpoint rechecks ownership, active matches, blocks, passes, and reciprocal discovery eligibility before serving another person’s photo.

## Communication

Messages are persistent PostgreSQL records and require an active match on every read, send, typing, and read-state request. Mobile creates a UUID for every outgoing message; a unique sender/client-ID pair makes retries idempotent without allowing that identifier to cross conversations. Match activity timestamps keep active conversations ordered by their latest message.

The Phase 4 live transport is authenticated long polling with opaque time-and-ID cursors. Tokens stay in authorization headers rather than query strings. Typing indicators are short-lived database heartbeats, and read receipts expose only a read-through timestamp. This transport is intentionally replaceable with a managed WebSocket or event-stream layer when traffic requires it.

Push delivery uses an auditable database outbox record and Expo Push. Server-side category, pause, preview, and quiet-mode rules are authoritative. Mobile asks for notification permission only through an explicit settings action. Android has separate quiet and audible channels so a background notification cannot bypass the person’s sound preference.

## Safety and moderation

Blocking is directional and immediately closes every active match between the two accounts. Closed matches cannot be messaged, and unblocking never recreates them. A report may reference one exact match and up to 20 validated message IDs. Moderator endpoints require an active `MODERATOR` or `ADMIN` role and expose the report queue, selected evidence, resolution state, and internal notes.

Trusted-contact details, personal plan notes, venues, and check-in notes use versioned AES-256-GCM encryption with a dedicated key. Date check-ins become due at their scheduled time, notify the account, and become missed after a 15-minute grace period. Trusted-contact details leave Spectrum only when the person opted into escalation for that check-in and a reviewed provider webhook is configured. The feature explicitly does not replace emergency services.

## Deployment target

The production target is AWS: RDS PostgreSQL, private S3 media, ECS/Fargate API, CloudFront where useful, Secrets Manager, WAF, GuardDuty, and centralized audit logs. The architecture remains portable to Render or Fly.io during early testing.

## Deferred production requirements

- Production email-provider webhook credentials and Apple/Google console credentials
- S3 media moderation and abuse scanning
- Managed socket/event transport and shared pub/sub for high-volume messaging
- Durable push retries, Expo receipt processing, and invalid-token cleanup
- RevenueCat webhook verification
- Admin moderation console above the role-protected Phase 4 moderation API
- Reviewed trusted-contact delivery provider, retry policy, and incident runbook
- Data export/deletion workflow
- Rate limits, bot protection, audit logging, and production observability
