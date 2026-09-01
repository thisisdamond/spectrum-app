-- Phase 3: atomic daily discovery usage and explainable match snapshots.
CREATE TABLE "DiscoveryUsage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "dateKey" VARCHAR(10) NOT NULL,
    "likesUsed" INTEGER NOT NULL DEFAULT 0,
    "backtracksUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryUsage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Match"
ADD COLUMN "compatibilityScore" DOUBLE PRECISION,
ADD COLUMN "compatibilitySnapshot" JSONB;

CREATE UNIQUE INDEX "DiscoveryUsage_userId_dateKey_key" ON "DiscoveryUsage"("userId", "dateKey");
CREATE INDEX "DiscoveryUsage_dateKey_idx" ON "DiscoveryUsage"("dateKey");

ALTER TABLE "DiscoveryUsage" ADD CONSTRAINT "DiscoveryUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
