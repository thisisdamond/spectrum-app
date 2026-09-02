-- Phase 4: persistent real-time communication, notification outbox, moderation, and encrypted safety tools.
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');
CREATE TYPE "DateCheckInStatus" AS ENUM ('SCHEDULED', 'CHECKED_IN', 'MISSED', 'CANCELED');
CREATE TYPE "PushNotificationKind" AS ENUM ('NEW_MATCH', 'NEW_MESSAGE', 'NEW_LIKE', 'SAFETY_CHECK_IN');
CREATE TYPE "PushDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "Match" ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Message" ADD COLUMN "clientId" UUID;
ALTER TABLE "Report"
  ADD COLUMN "matchId" UUID,
  ADD COLUMN "evidenceMessageIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "resolutionNote" VARCHAR(3000),
  ADD COLUMN "resolvedAt" TIMESTAMP(3);

CREATE TABLE "TypingIndicator" (
  "id" UUID NOT NULL,
  "matchId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TypingIndicator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyPlan" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "encryptedContactName" TEXT,
  "encryptedContactDetails" TEXT,
  "encryptedNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafetyPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DateCheckIn" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "matchId" UUID,
  "label" VARCHAR(120) NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "status" "DateCheckInStatus" NOT NULL DEFAULT 'SCHEDULED',
  "encryptedVenue" TEXT,
  "encryptedNote" TEXT,
  "trustedContactRequested" BOOLEAN NOT NULL DEFAULT false,
  "checkedInAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "missedAt" TIMESTAMP(3),
  "notificationSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DateCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushNotification" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "kind" "PushNotificationKind" NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "body" VARCHAR(500) NOT NULL,
  "data" JSONB,
  "quiet" BOOLEAN NOT NULL DEFAULT true,
  "status" "PushDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" VARCHAR(1000),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Message_senderId_clientId_key" ON "Message"("senderId", "clientId");
CREATE UNIQUE INDEX "TypingIndicator_matchId_userId_key" ON "TypingIndicator"("matchId", "userId");
CREATE INDEX "TypingIndicator_expiresAt_idx" ON "TypingIndicator"("expiresAt");
CREATE UNIQUE INDEX "SafetyPlan_userId_key" ON "SafetyPlan"("userId");
CREATE INDEX "DateCheckIn_status_scheduledFor_idx" ON "DateCheckIn"("status", "scheduledFor");
CREATE INDEX "DateCheckIn_userId_scheduledFor_idx" ON "DateCheckIn"("userId", "scheduledFor");
CREATE INDEX "PushNotification_status_createdAt_idx" ON "PushNotification"("status", "createdAt");
CREATE INDEX "PushNotification_userId_createdAt_idx" ON "PushNotification"("userId", "createdAt");

ALTER TABLE "Report" ADD CONSTRAINT "Report_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TypingIndicator" ADD CONSTRAINT "TypingIndicator_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TypingIndicator" ADD CONSTRAINT "TypingIndicator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyPlan" ADD CONSTRAINT "SafetyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DateCheckIn" ADD CONSTRAINT "DateCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DateCheckIn" ADD CONSTRAINT "DateCheckIn_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PushNotification" ADD CONSTRAINT "PushNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
