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

## Deployment target

The production target is AWS: RDS PostgreSQL, private S3 media, ECS/Fargate API, CloudFront where useful, Secrets Manager, WAF, GuardDuty, and centralized audit logs. The architecture remains portable to Render or Fly.io during early testing.

## Deferred production requirements

- Production email-provider webhook credentials and Apple/Google console credentials
- S3 media moderation and abuse scanning
- Socket-backed real-time messaging
- Expo push notification worker
- RevenueCat webhook verification
- Admin moderation console
- Data export/deletion workflow
- Rate limits, bot protection, audit logging, and production observability
