ALTER TABLE "Team" ADD COLUMN "city" TEXT;

CREATE INDEX "PlayerProfile_regionName_idx" ON "PlayerProfile"("regionName");
CREATE INDEX "Team_city_idx" ON "Team"("city");
