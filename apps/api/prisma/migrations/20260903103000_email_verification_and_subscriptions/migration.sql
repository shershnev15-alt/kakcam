CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "organizationId" UUID,
    "planCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT NOT NULL DEFAULT 'MANUAL',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Subscription_owner_check" CHECK (("userId" IS NOT NULL) <> ("organizationId" IS NOT NULL))
);

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_usedAt_expiresAt_idx" ON "EmailVerificationToken"("userId", "usedAt", "expiresAt");
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE INDEX "Subscription_userId_status_currentPeriodEnd_idx" ON "Subscription"("userId", "status", "currentPeriodEnd");
CREATE INDEX "Subscription_organizationId_status_currentPeriodEnd_idx" ON "Subscription"("organizationId", "status", "currentPeriodEnd");
CREATE INDEX "Subscription_planCode_status_idx" ON "Subscription"("planCode", "status");

ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
