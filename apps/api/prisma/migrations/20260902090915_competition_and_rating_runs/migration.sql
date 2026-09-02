-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sourceCode" TEXT NOT NULL DEFAULT 'arena-demo';

-- AlterTable
ALTER TABLE "PlayerMatchStatistic" ADD COLUMN     "adr" DECIMAL(7,2),
ADD COLUMN     "headshotRate" DECIMAL(5,2),
ADD COLUMN     "impact" DECIMAL(6,3),
ADD COLUMN     "kast" DECIMAL(5,2),
ADD COLUMN     "openingDuelRate" DECIMAL(5,2),
ADD COLUMN     "opponentTeamId" UUID,
ADD COLUMN     "performanceRating" DECIMAL(6,3),
ADD COLUMN     "sourceCode" TEXT NOT NULL DEFAULT 'arena-demo',
ADD COLUMN     "teamId" UUID,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MatchMap" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "mapKey" TEXT NOT NULL,
    "mapOrder" INTEGER NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "overtime" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "winnerTeamId" UUID,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "finalizedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentParticipant" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "seed" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPlacement" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "placeFrom" INTEGER NOT NULL,
    "placeTo" INTEGER NOT NULL,
    "prizeAmount" DECIMAL(14,2),
    "points" DECIMAL(10,2),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStatistic" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "sampleMatches" INTEGER NOT NULL,
    "sampleMaps" INTEGER NOT NULL,
    "rounds" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "metrics" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStatistic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerTournamentStatistic" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "sampleMatches" INTEGER NOT NULL,
    "sampleMaps" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "metrics" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerTournamentStatistic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamStatistic" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "sampleMatches" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "mapsWon" INTEGER NOT NULL,
    "mapsLost" INTEGER NOT NULL,
    "roundsWon" INTEGER NOT NULL,
    "roundsLost" INTEGER NOT NULL,
    "metrics" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamStatistic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchMap_mapKey_status_idx" ON "MatchMap"("mapKey", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MatchMap_matchId_mapOrder_key" ON "MatchMap"("matchId", "mapOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_matchId_key" ON "MatchResult"("matchId");

-- CreateIndex
CREATE INDEX "TournamentParticipant_teamId_status_idx" ON "TournamentParticipant"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_teamId_key" ON "TournamentParticipant"("tournamentId", "teamId");

-- CreateIndex
CREATE INDEX "TournamentPlacement_teamId_placeFrom_idx" ON "TournamentPlacement"("teamId", "placeFrom");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlacement_tournamentId_teamId_key" ON "TournamentPlacement"("tournamentId", "teamId");

-- CreateIndex
CREATE INDEX "PlayerStatistic_gameId_periodEnd_idx" ON "PlayerStatistic"("gameId", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStatistic_playerId_gameId_periodStart_periodEnd_key" ON "PlayerStatistic"("playerId", "gameId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "PlayerTournamentStatistic_tournamentId_kills_idx" ON "PlayerTournamentStatistic"("tournamentId", "kills");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerTournamentStatistic_playerId_tournamentId_key" ON "PlayerTournamentStatistic"("playerId", "tournamentId");

-- CreateIndex
CREATE INDEX "TeamStatistic_gameId_periodEnd_idx" ON "TeamStatistic"("gameId", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "TeamStatistic_teamId_gameId_periodStart_periodEnd_key" ON "TeamStatistic"("teamId", "gameId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "PlayerMatchStatistic_matchId_teamId_idx" ON "PlayerMatchStatistic"("matchId", "teamId");

-- AddForeignKey
ALTER TABLE "MatchMap" ADD CONSTRAINT "MatchMap_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlacement" ADD CONSTRAINT "TournamentPlacement_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlacement" ADD CONSTRAINT "TournamentPlacement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStatistic" ADD CONSTRAINT "PlayerStatistic_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTournamentStatistic" ADD CONSTRAINT "PlayerTournamentStatistic_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTournamentStatistic" ADD CONSTRAINT "PlayerTournamentStatistic_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStatistic" ADD CONSTRAINT "TeamStatistic_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RatingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRating" ADD CONSTRAINT "TeamRating_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RatingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
