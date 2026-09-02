# Spectrum

Spectrum is an accessibility-first dating app for autistic and neurodivergent adults. It is designed to reduce ambiguity, respect sensory needs, and help people communicate clearly without turning dating into a clinical experience.

This repository contains the completed Phase 4 communication and safety foundation:

- `mobile/` — Expo + React Native app for iOS and Android
- `server/` — Express + TypeScript API with Prisma/PostgreSQL
- `docs/` — architecture, roadmap, safety, privacy, terms, and community drafts
- `infra/` — local and AWS-oriented deployment notes
- `fastlane/` — app-store automation placeholders

Phase 4 adds persistent match conversations, authenticated live updates, typing and read state, idempotent retryable sends, quiet push notifications, blocking, unmatching, evidence-backed reports, role-protected moderation queues, encrypted safety plans, and date check-ins. The Phase 2 account/profile foundation and Phase 3 discovery/matching experience remain in place.

## Requirements

- Node.js 24+
- pnpm 11+
- Docker Desktop (for local PostgreSQL)
- Expo Go or an iOS/Android simulator

## Quick start

```bash
pnpm install
docker compose up -d postgres
cp server/.env.example server/.env
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Run only one app when preferred:

```bash
pnpm dev:server
pnpm dev:mobile
```

## Quality checks

```bash
pnpm typecheck
pnpm test
pnpm lint
```

## Product principles

- 18+ only; consent and safety are product requirements.
- Matching is based on user-controlled preferences, never a diagnosis or a notion of autism “severity.”
- Exact location, email, and sensitive preferences are private by default.
- Reduced motion, calm presentation, readable text, and predictable navigation are first-class features.
- Legal files are working drafts and require qualified legal review before launch.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/ROADMAP.md](docs/ROADMAP.md) for implementation detail and the phased launch plan.

## Provider configuration

- Configure `EMAIL_WEBHOOK_URL` for production verification and reset messages. Development responses include a preview link when no webhook is configured.
- Set `APPLE_CLIENT_ID` and `GOOGLE_CLIENT_IDS` on the API, plus the matching `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values for mobile builds.
- Set `MEDIA_BUCKET` for private S3 photo storage. When omitted, development uploads use `MEDIA_LOCAL_DIR`.
- Set `EXPO_PUBLIC_EAS_PROJECT_ID` in mobile builds to register devices for Expo Push notifications.
- Set `SAFETY_WEBHOOK_URL` only when a reviewed trusted-contact delivery provider is available. Authenticate it with `SAFETY_WEBHOOK_SECRET`.
- Treat `JWT_*`, `TWO_FACTOR_ENCRYPTION_KEY`, and `SAFETY_DATA_ENCRYPTION_KEY` as independent secrets stored outside source control.

The mobile OAuth redirect scheme is `spectrum://`. Apple and Google console settings must match the bundle identifiers and redirect URLs for each build environment.

## Phase 3 discovery behavior

- Age, gender, dating-goal, and known-distance preferences must fit in both directions before scoring.
- Blocks, passes, prior likes, existing matches, paused profiles, inactive accounts, and incomplete profiles are excluded.
- Free accounts receive eight likes per UTC day. The API enforces the quota transactionally; mobile values are display-only.
- Compatibility explanations use only user-controlled lifestyle, communication, comfort, interest, pace, and distance inputs. Diagnosis and support-needs labels are never inputs.
- The API returns age and rounded distance, not birth dates or coordinates. Private development photos require an authorized relationship on every read.

## Phase 4 communication and safety behavior

- Live conversation updates use authenticated long polling, so access tokens never appear in URLs. Message client IDs make retries idempotent.
- Typing state expires automatically. Read receipts reveal only the latest read-through time inside an active match.
- Push permissions are requested only after a person chooses to enable them. Quiet mode is enforced with dedicated Android channels and foreground handling.
- Blocking ends active matches immediately and makes the account unavailable to discovery and messaging. Unblocking does not restore prior matches.
- Reports can include selected messages and enter a role-protected moderation queue. Blocking after a report is the default, not a requirement.
- Safety-plan contact details, venue, and private notes are encrypted at rest. Date check-ins provide reminders and an optional provider webhook after a 15-minute missed window; they are not emergency monitoring.

See [docs/PHASE_4.md](docs/PHASE_4.md) for the API and deployment contract.
