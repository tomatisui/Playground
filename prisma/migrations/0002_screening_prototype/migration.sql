CREATE TABLE IF NOT EXISTS "ScreeningSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childLabel" TEXT NOT NULL,
    "ageYears" INTEGER NOT NULL,
    "classroomLabel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ScreeningModuleAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScreeningModuleAttempt_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "ScreeningSession" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScreeningModuleAttempt_sessionId_moduleCode_key"
ON "ScreeningModuleAttempt"("sessionId", "moduleCode");

INSERT OR IGNORE INTO "ScreeningSession" ("id", "childLabel", "ageYears", "classroomLabel")
VALUES
    ('sess-age5-lina', 'Lina P.', 5, 'Sunflower Room'),
    ('sess-age6-minho', 'Minho K.', 6, 'Maple Room');

INSERT OR IGNORE INTO "ScreeningModuleAttempt" ("id", "sessionId", "moduleCode", "completedAt")
VALUES
    ('attempt-age5-m3', 'sess-age5-lina', 'M3', CURRENT_TIMESTAMP),
    ('attempt-age6-m3', 'sess-age6-minho', 'M3', CURRENT_TIMESTAMP),
    ('attempt-age6-m4', 'sess-age6-minho', 'M4', CURRENT_TIMESTAMP);
