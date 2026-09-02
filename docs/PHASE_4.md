# Phase 4 — Communication and safety

## Conversation contract

Every conversation route derives the acting account from the access token and verifies an active match. Mobile first loads the latest 100 messages, then holds an authenticated update request for up to 20 seconds. The server returns messages after an opaque cursor plus typing and read-state changes. A disconnected client reconnects with the same cursor, so a temporary network interruption does not require a separate socket credential or put an access token in a URL.

Each outgoing message carries a mobile-generated UUID. The API stores it with the sender and returns the original result for a retry. Reusing that UUID in another conversation is rejected. Sending and match-activity updates share a transaction, and an unmatch racing with a send causes the send to roll back.

Typing state is an eight-second heartbeat. Read state applies only to incoming, non-deleted messages. The Matches screen shows the last message and an authoritative unread count. Unmatching closes the conversation and clears typing state without deleting the message record.

## Notifications

Device registration is an explicit action in Notification Settings. The API accepts only Expo push-token formats and binds a token to the currently authenticated account. People can independently control new-match, new-message, new-like, and message-preview behavior, pause notifications for 24 hours, and select quiet notifications through their accessibility settings.

Every notification creates a `PushNotification` record with its category, privacy-safe body, quiet state, status, attempts, and error. Disabled, paused, or unregistered delivery is recorded as skipped. Android payloads select a dedicated quiet or audible channel; foreground presentation follows the same accessibility preference.

Remote notifications require `expo-notifications`, a physical-device development or production build, and `EXPO_PUBLIC_EAS_PROJECT_ID`. Expo Go is not a remote-push test target.

## Blocks, reports, and moderation

Blocking is idempotent, does not notify the other account, immediately unmatches all active relationships, and removes typing state. The blocked-account list deliberately omits profile photos. Unblocking permits future discovery eligibility but does not restore a match or conversation.

A report validates the target, match relationship, and every selected evidence message before creation. Report-and-block defaults to on, while report-only remains available. Authorized moderators can list open/reviewing reports, retrieve only the selected evidence, move a report through reviewing/resolved/dismissed states, record a resolution note, and add internal account notes. Setting a user’s moderator/admin role remains an audited operational action outside the consumer app.

## Private safety plan and date check-ins

Safety-plan contact details and notes, plus check-in venues and notes, are encrypted with AES-256-GCM before PostgreSQL storage. `SAFETY_DATA_ENCRYPTION_KEY` is mandatory, independent from authentication and 2FA keys, and must be held in a production secret manager. Key rotation needs a planned decrypt-and-re-encrypt migration because ciphertext is versioned but Phase 4 does not include an automatic rotation job.

People can schedule a check-in from a match or from the Safety Center, choose a reminder from one to eight hours, mark themselves okay, or cancel. The API also permits schedules up to 30 days ahead. At the scheduled time Spectrum sends a reminder. After a 15-minute grace period it marks the check-in missed and sends another reminder.

Trusted-contact escalation is opt-in per check-in and requires saved contact details. If `SAFETY_WEBHOOK_URL` is configured, a missed check-in sends the minimum provider payload needed to contact that person; `SAFETY_WEBHOOK_SECRET` authenticates that request. Without a configured provider, the user still receives Spectrum reminders but no external contact is attempted. The UI states that check-ins are supportive reminders, not emergency monitoring.

## Deployment checklist

1. Run `pnpm db:deploy` before starting the Phase 4 API. The migration adds roles, message idempotency, match activity, typing state, report evidence, safety plans, check-ins, and the notification outbox.
2. Set a unique 32-or-more-character `SAFETY_DATA_ENCRYPTION_KEY` through the production secret manager. Never reuse a JWT or 2FA key.
3. Configure the EAS project ID in signed mobile builds and verify iOS/Android push credentials on physical devices.
4. Leave `SAFETY_WEBHOOK_URL` unset until the delivery provider, data-processing terms, retry behavior, and incident response have been reviewed.
5. Grant `MODERATOR` or `ADMIN` only through an audited operational workflow and restrict moderation endpoints at the network and application layers.
6. Monitor failed push records, long-poll duration and reconnect rates, open-report age, missed-check-in processing delay, and safety-provider failures without logging message or safety-plan contents.
7. Before production scale, add shared pub/sub, durable push and webhook retries, Expo receipt processing, invalid-token cleanup, moderation audit events, and a reviewed moderator console.
