CREATE TABLE "AuthRateLimitBucket" (
  "subject" VARCHAR(255) NOT NULL,
  "attempts" INTEGER NOT NULL,
  "windowStartAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthRateLimitBucket_pkey" PRIMARY KEY ("subject")
);

CREATE INDEX "AuthRateLimitBucket_updatedAt_idx" ON "AuthRateLimitBucket" ("updatedAt");
