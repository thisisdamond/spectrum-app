# Phase 2 — Accounts and profile setup

## Account lifecycle

- Password registration creates a pending account and a single-use, SHA-256-digested verification token that expires after 24 hours.
- Verification activates the account and creates a short-lived access token plus a rotating refresh token. Refresh tokens are Argon2-hashed at rest.
- Password-reset responses do not reveal whether an email belongs to an account. Reset links expire after 30 minutes and revoke the active refresh token.
- Optional TOTP secrets are encrypted with AES-256-GCM. Login uses a five-minute challenge token before issuing a normal session.
- Apple and Google identity tokens are verified against provider JWKS, issuer, and configured audience on the API. Provider subjects—not email addresses—identify returning social accounts.

## Profile setup

The mobile flow is resumable and ordered as basics, match preferences, communication, sensory comfort, photos, and prompts. Completion is computed by the API, so reinstalling the app does not lose progress.

Photo uploads allow JPEG, PNG, WebP, or HEIC files up to 10 MB. Production uses private S3 objects and ten-minute upload URLs; development uses an authenticated local adapter. Confirmation verifies that the uploaded object exists and matches the claimed size and content type.

Accessibility preferences are optimistic on-device settings backed by SecureStore and synchronized to the authenticated account. Failed API updates roll back the optimistic change.

## Deployment checklist

1. Generate independent access-token, refresh-token, and two-factor encryption secrets.
2. Configure the production email webhook and validate both auth email templates.
3. Register Apple and Google app identifiers for every supported platform and environment.
4. Provision a private S3 bucket with encryption, lifecycle, CORS, abuse scanning, and least-privilege IAM.
5. Run `pnpm db:deploy` before starting the updated API.
