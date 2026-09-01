# Spectrum

Spectrum is an accessibility-first dating app for autistic and neurodivergent adults. It is designed to reduce ambiguity, respect sensory needs, and help people communicate clearly without turning dating into a clinical experience.

This repository contains the completed Phase 2 foundation:

- `mobile/` — Expo + React Native app for iOS and Android
- `server/` — Express + TypeScript API with Prisma/PostgreSQL
- `docs/` — architecture, roadmap, safety, privacy, terms, and community drafts
- `infra/` — local and AWS-oriented deployment notes
- `fastlane/` — app-store automation placeholders

Phase 2 adds verified accounts, password recovery, optional authenticator 2FA, Apple/Google identity validation, persistent mobile sessions, a guided six-step profile flow, private photo uploads, editable prompts/preferences, and account-synchronized accessibility settings.

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

## Phase 2 provider configuration

- Configure `EMAIL_WEBHOOK_URL` for production verification and reset messages. Development responses include a preview link when no webhook is configured.
- Set `APPLE_CLIENT_ID` and `GOOGLE_CLIENT_IDS` on the API, plus the matching `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values for mobile builds.
- Set `MEDIA_BUCKET` for private S3 photo storage. When omitted, development uploads use `MEDIA_LOCAL_DIR`.
- Treat `JWT_*` and `TWO_FACTOR_ENCRYPTION_KEY` as independent secrets stored outside source control.

The mobile OAuth redirect scheme is `spectrum://`. Apple and Google console settings must match the bundle identifiers and redirect URLs for each build environment.
