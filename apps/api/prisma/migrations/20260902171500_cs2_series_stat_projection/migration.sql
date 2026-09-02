-- Backfill the series-level projection used by public match views while preserving granular map facts.
INSERT INTO "PlayerMatchStatistic" (
    "id", "playerId", "matchId", "mapKey", "kills", "deaths", "assists", "rounds",
    "teamId", "opponentTeamId", "performanceRating", "adr", "kast", "impact",
    "headshotRate", "openingDuelRate", "verifiedAt", "sourceCode", "metrics",
    "schemaVersion", "createdAt"
)
SELECT
    gen_random_uuid(),
    "playerId",
    "matchId",
    'all',
    SUM("kills"),
    SUM("deaths"),
    SUM("assists"),
    SUM("rounds"),
    "teamId",
    "opponentTeamId",
    SUM("performanceRating" * "rounds") / NULLIF(SUM("rounds") FILTER (WHERE "performanceRating" IS NOT NULL), 0),
    SUM("adr" * "rounds") / NULLIF(SUM("rounds") FILTER (WHERE "adr" IS NOT NULL), 0),
    SUM("kast" * "rounds") / NULLIF(SUM("rounds") FILTER (WHERE "kast" IS NOT NULL), 0),
    SUM("impact" * "rounds") / NULLIF(SUM("rounds") FILTER (WHERE "impact" IS NOT NULL), 0),
    SUM("headshotRate" * "rounds") / NULLIF(SUM("rounds") FILTER (WHERE "headshotRate" IS NOT NULL), 0),
    SUM("openingDuelRate" * "rounds") / NULLIF(SUM("rounds") FILTER (WHERE "openingDuelRate" IS NOT NULL), 0),
    MAX("verifiedAt"),
    "sourceCode",
    jsonb_build_object('schema', 'cs2.v1', 'grain', 'series', 'backfilled', true),
    MAX("schemaVersion"),
    CURRENT_TIMESTAMP
FROM "PlayerMatchStatistic"
WHERE "mapKey" <> 'all' AND "sourceCode" LIKE 'cs2-demo-%'
GROUP BY "playerId", "matchId", "teamId", "opponentTeamId", "sourceCode"
ON CONFLICT ("playerId", "matchId", "mapKey") DO NOTHING;
