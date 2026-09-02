-- Stage 6: achievement replay, career history and transfers.
ALTER TABLE "CareerHistory"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "evidence" JSONB,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "verificationLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CareerHistory" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "PlayerAchievement"
  ADD COLUMN "evaluationKey" TEXT,
  ADD COLUMN "firstQualifiedAt" TIMESTAMP(3),
  ADD COLUMN "ruleVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "verificationLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerAchievement" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "Transfer"
  ADD COLUMN "checksum" VARCHAR(64),
  ADD COLUMN "evidence" JSONB,
  ADD COLUMN "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "verificationLevel" INTEGER NOT NULL DEFAULT 0;
UPDATE "Transfer"
SET "checksum" = md5("id"::text || ':1') || md5("id"::text || ':2')
WHERE "checksum" IS NULL;
ALTER TABLE "Transfer" ALTER COLUMN "checksum" SET NOT NULL;
ALTER TABLE "Transfer" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE "AchievementEvent" (
  "id" UUID NOT NULL,
  "eventKey" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" UUID NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AchievementEvent_pkey" PRIMARY KEY ("id")
);

-- Stage 7: claim, evidence and moderation workflow.
CREATE TABLE "ProfileClaim" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "playerId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "method" TEXT NOT NULL,
  "statement" TEXT,
  "evidenceSummary" JSONB,
  "reviewerId" UUID,
  "decisionReason" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationEvidence" (
  "id" UUID NOT NULL,
  "claimId" UUID,
  "verificationId" UUID,
  "submittedById" UUID,
  "kind" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'RESTRICTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModerationCase" (
  "id" UUID NOT NULL,
  "claimId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "assignedToId" UUID,
  "resolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AchievementEvent_eventKey_key" ON "AchievementEvent"("eventKey");
CREATE INDEX "AchievementEvent_subjectType_subjectId_occurredAt_idx" ON "AchievementEvent"("subjectType", "subjectId", "occurredAt");
CREATE INDEX "AchievementEvent_eventType_occurredAt_idx" ON "AchievementEvent"("eventType", "occurredAt");
CREATE INDEX "ProfileClaim_userId_status_createdAt_idx" ON "ProfileClaim"("userId", "status", "createdAt");
CREATE INDEX "ProfileClaim_playerId_status_createdAt_idx" ON "ProfileClaim"("playerId", "status", "createdAt");
CREATE INDEX "VerificationEvidence_verificationId_idx" ON "VerificationEvidence"("verificationId");
CREATE UNIQUE INDEX "VerificationEvidence_claimId_checksum_key" ON "VerificationEvidence"("claimId", "checksum");
CREATE UNIQUE INDEX "ModerationCase_claimId_key" ON "ModerationCase"("claimId");
CREATE INDEX "ModerationCase_status_priority_createdAt_idx" ON "ModerationCase"("status", "priority", "createdAt");
CREATE INDEX "ModerationCase_assignedToId_status_idx" ON "ModerationCase"("assignedToId", "status");
CREATE UNIQUE INDEX "CareerHistory_playerId_teamId_gameId_startedAt_key" ON "CareerHistory"("playerId", "teamId", "gameId", "startedAt");
CREATE UNIQUE INDEX "Transfer_checksum_key" ON "Transfer"("checksum");

ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareerHistory" ADD CONSTRAINT "CareerHistory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareerHistory" ADD CONSTRAINT "CareerHistory_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProfileClaim" ADD CONSTRAINT "ProfileClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileClaim" ADD CONSTRAINT "ProfileClaim_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileClaim" ADD CONSTRAINT "ProfileClaim_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VerificationEvidence" ADD CONSTRAINT "VerificationEvidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ProfileClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationEvidence" ADD CONSTRAINT "VerificationEvidence_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationEvidence" ADD CONSTRAINT "VerificationEvidence_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ProfileClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
