CREATE TABLE "AccountLinkTransaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "stateHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountLinkTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceBlob" (
    "id" UUID NOT NULL,
    "evidenceId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "encryptionVersion" INTEGER NOT NULL DEFAULT 1,
    "scanStatus" TEXT NOT NULL,
    "sanitizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceBlob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdentityCheck" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "claimId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "applicantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "reviewAnswer" TEXT,
    "rejectLabels" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IdentityCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountLinkTransaction_stateHash_key" ON "AccountLinkTransaction"("stateHash");
CREATE UNIQUE INDEX "PlayerGameAccount_playerId_gameId_provider_key" ON "PlayerGameAccount"("playerId", "gameId", "provider");
CREATE INDEX "AccountLinkTransaction_userId_provider_consumedAt_expiresAt_idx" ON "AccountLinkTransaction"("userId", "provider", "consumedAt", "expiresAt");
CREATE INDEX "AccountLinkTransaction_playerId_provider_idx" ON "AccountLinkTransaction"("playerId", "provider");
CREATE UNIQUE INDEX "EvidenceBlob_evidenceId_key" ON "EvidenceBlob"("evidenceId");
CREATE UNIQUE INDEX "EvidenceBlob_storageKey_key" ON "EvidenceBlob"("storageKey");
CREATE INDEX "EvidenceBlob_scanStatus_createdAt_idx" ON "EvidenceBlob"("scanStatus", "createdAt");
CREATE UNIQUE INDEX "IdentityCheck_externalUserId_key" ON "IdentityCheck"("externalUserId");
CREATE INDEX "IdentityCheck_claimId_status_idx" ON "IdentityCheck"("claimId", "status");
CREATE INDEX "IdentityCheck_applicantId_idx" ON "IdentityCheck"("applicantId");

ALTER TABLE "AccountLinkTransaction" ADD CONSTRAINT "AccountLinkTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountLinkTransaction" ADD CONSTRAINT "AccountLinkTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceBlob" ADD CONSTRAINT "EvidenceBlob_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "VerificationEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdentityCheck" ADD CONSTRAINT "IdentityCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdentityCheck" ADD CONSTRAINT "IdentityCheck_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ProfileClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
