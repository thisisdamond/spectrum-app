# Architecture

## System shape

Spectrum is a pnpm monorepo with two deployable applications:

- Expo/React Native mobile client (`mobile`)
- Express API and PostgreSQL data layer (`server`)

PostgreSQL is the system of record. Prisma owns schema and migrations. Media will use private S3 objects with short-lived signed URLs; exact storage integration is intentionally deferred until Phase 2.

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

Diagnosis and support-needs labels are not inputs. Blocking, rejection, prior likes, account status, pause state, distance, and age/gender preferences are hard filters before scoring.

## Deployment target

The production target is AWS: RDS PostgreSQL, private S3 media, ECS/Fargate API, CloudFront where useful, Secrets Manager, WAF, GuardDuty, and centralized audit logs. The architecture remains portable to Render or Fly.io during early testing.

## Deferred production requirements

- Email verification, reset, social OAuth, and TOTP
- S3 media moderation and abuse scanning
- Socket-backed real-time messaging
- Expo push notification worker
- RevenueCat webhook verification
- Admin moderation console
- Data export/deletion workflow
- Rate limits, bot protection, audit logging, and production observability
