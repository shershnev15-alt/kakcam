-- Stage 12: CS2 provider-neutral staging and external identity links.
CREATE TYPE "DataImportRecordStatus" AS ENUM ('STAGED', 'VALID', 'INVALID', 'APPLIED', 'SKIPPED');

CREATE TABLE "DataImportRecord" (
    "id" UUID NOT NULL,
    "importId" UUID NOT NULL,
    "externalKey" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "status" "DataImportRecordStatus" NOT NULL DEFAULT 'STAGED',
    "rawPayload" JSONB NOT NULL,
    "canonicalPayload" JSONB,
    "errors" JSONB,
    "appliedEntityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    CONSTRAINT "DataImportRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalEntityLink" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 100,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalEntityLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DataImportRecord_importId_externalKey_key" ON "DataImportRecord"("importId", "externalKey");
CREATE UNIQUE INDEX "DataImportRecord_importId_checksum_key" ON "DataImportRecord"("importId", "checksum");
CREATE INDEX "DataImportRecord_status_createdAt_idx" ON "DataImportRecord"("status", "createdAt");
CREATE UNIQUE INDEX "ExternalEntityLink_sourceId_entityType_externalId_key" ON "ExternalEntityLink"("sourceId", "entityType", "externalId");
CREATE INDEX "ExternalEntityLink_entityType_entityId_idx" ON "ExternalEntityLink"("entityType", "entityId");

ALTER TABLE "DataImportRecord" ADD CONSTRAINT "DataImportRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "DataImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalEntityLink" ADD CONSTRAINT "ExternalEntityLink_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
