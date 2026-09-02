CREATE TYPE "PlayerPublicationStatus" AS ENUM ('PUBLISHED', 'REVOKED');

ALTER TABLE "Organization"
  ADD COLUMN "isFederation" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "UserRole_userId_roleId_scopeType_scopeId_key"
  ON "UserRole"("userId", "roleId", "scopeType", "scopeId");

CREATE TABLE "PlayerPublication" (
  "id" UUID NOT NULL,
  "playerId" UUID NOT NULL,
  "selfClaimId" UUID NOT NULL,
  "federationId" UUID NOT NULL,
  "photoEvidenceId" UUID NOT NULL,
  "verificationId" UUID NOT NULL,
  "reviewerId" UUID NOT NULL,
  "status" "PlayerPublicationStatus" NOT NULL,
  "publicPhotoUrl" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerPublication_playerId_key" ON "PlayerPublication"("playerId");
CREATE UNIQUE INDEX "PlayerPublication_selfClaimId_key" ON "PlayerPublication"("selfClaimId");
CREATE UNIQUE INDEX "PlayerPublication_photoEvidenceId_key" ON "PlayerPublication"("photoEvidenceId");
CREATE UNIQUE INDEX "PlayerPublication_verificationId_key" ON "PlayerPublication"("verificationId");
CREATE INDEX "PlayerPublication_status_publishedAt_idx" ON "PlayerPublication"("status", "publishedAt");
CREATE INDEX "PlayerPublication_federationId_status_idx" ON "PlayerPublication"("federationId", "status");

ALTER TABLE "PlayerPublication"
  ADD CONSTRAINT "PlayerPublication_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerPublication"
  ADD CONSTRAINT "PlayerPublication_selfClaimId_fkey"
  FOREIGN KEY ("selfClaimId") REFERENCES "ProfileClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerPublication"
  ADD CONSTRAINT "PlayerPublication_federationId_fkey"
  FOREIGN KEY ("federationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerPublication"
  ADD CONSTRAINT "PlayerPublication_photoEvidenceId_fkey"
  FOREIGN KEY ("photoEvidenceId") REFERENCES "VerificationEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerPublication"
  ADD CONSTRAINT "PlayerPublication_verificationId_fkey"
  FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerPublication"
  ADD CONSTRAINT "PlayerPublication_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
