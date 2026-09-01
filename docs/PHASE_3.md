# Phase 3 — Discovery and matching

## Discovery contract

The API evaluates both people before a candidate appears. Each person must fall inside the other’s age range, gender preferences, dating goals, and known maximum distance. Incomplete, inactive, deleted, paused, blocked, passed, already-liked, and previously matched profiles are excluded before compatibility scoring.

Coordinates and birth dates stay inside the API. Mobile receives a derived age, an optional rounded distance, and a deliberately limited public profile. Missing coordinates stay unknown. A candidate must have at least one photo and one prompt so the discovery card is meaningful.

Stable score-and-user cursors paginate up to 20 candidates per request. Standard stored preferences always apply. Premium accounts can additionally set a minimum compatibility score and filter by communication style, date environment, or dating goal.

## Likes, passes, and matching

Free accounts receive eight likes per UTC day. `DiscoveryUsage` stores the per-day counter, which is incremented in the same serializable transaction that creates a like. Concurrent or repeated requests are retried safely, duplicate likes do not use quota, and the mobile client receives the authoritative remaining count and reset time.

A reciprocal like activates a match and stores the compatibility score and explanation snapshot from match time. Incoming likes are chronological and show only people who still pass safety and reciprocal preference checks. Passing is idempotent. Premium backtrack restores the most recent pass and records usage.

Interaction targets are validated server-side: a liked photo, prompt, or video prompt must belong to the receiver. The API also rechecks blocks, passes, account status, pause state, setup completion, and reciprocal preferences at action time instead of trusting a previously loaded card.

## Explainable compatibility

The deterministic 0–100 score keeps the published weights in `ARCHITECTURE.md`. The response adds:

- a short alignment summary;
- up to three concrete shared-preference highlights;
- the four strongest scored dimensions, each normalized for display.

Explanations use only preferences a person chose to share. Diagnosis, support needs, and any idea of autism “severity” are excluded. The mobile experience states that compatibility is a guide, not a guarantee or diagnosis.

## Mobile experience

- Discover loads one real profile at a time with authenticated photos, score details, server-enforced like status, calm empty/error states, refresh, filters, pass, like, and 24-hour break actions.
- Likes you lists incoming interest, optional notes, and explicit pass/like-back choices without pressuring a response.
- Matches lists mutual matches, latest-message previews, and the compatibility score captured at match time.
- Advanced filters and backtrack are visible only through explicit Premium gates. Standard reciprocal preferences remain available to everyone.

## Deployment checklist

1. Run `pnpm db:deploy` before starting the Phase 3 API; the incremental migration adds `DiscoveryUsage` and match snapshots.
2. Keep all API instances on synchronized UTC time for daily quota resets.
3. Configure private S3 media and short signed-read expiry; local authenticated media is for development only.
4. Monitor serialization retries, quota rejections, empty-candidate rates, and match creation without logging profile contents.
5. Seed test users with reciprocal preferences, at least one photo, and at least one prompt for discovery QA.
