PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ScreeningSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childLabel" TEXT NOT NULL,
    "ageYears" INTEGER NOT NULL,
    "classroomLabel" TEXT,
    "guardianName" TEXT,
    "guardianRelationship" TEXT,
    "consentAcceptedAt" DATETIME,
    "audioCheckPassed" BOOLEAN,
    "audioCheckCompletedAt" DATETIME,
    "currentRoute" TEXT,
    "currentModuleCode" TEXT,
    "lastActiveAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_ScreeningSession" (
    "id",
    "childLabel",
    "ageYears",
    "classroomLabel",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "childLabel",
    "ageYears",
    "classroomLabel",
    "createdAt",
    "updatedAt"
FROM "ScreeningSession";

DROP TABLE "ScreeningSession";
ALTER TABLE "new_ScreeningSession" RENAME TO "ScreeningSession";

CREATE TABLE "new_ScreeningModuleAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "practiceRuns" INTEGER NOT NULL DEFAULT 0,
    "practiceFailures" INTEGER NOT NULL DEFAULT 0,
    "lastItemIndex" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "caregiverAssistCount" INTEGER NOT NULL DEFAULT 0,
    "provisionalSummary" TEXT,
    "responseLog" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScreeningModuleAttempt_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "ScreeningSession" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_ScreeningModuleAttempt" (
    "id",
    "sessionId",
    "moduleCode",
    "completedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "sessionId",
    "moduleCode",
    "completedAt",
    "createdAt",
    "updatedAt"
FROM "ScreeningModuleAttempt";

DROP TABLE "ScreeningModuleAttempt";
ALTER TABLE "new_ScreeningModuleAttempt" RENAME TO "ScreeningModuleAttempt";

CREATE UNIQUE INDEX "ScreeningModuleAttempt_sessionId_moduleCode_key"
ON "ScreeningModuleAttempt"("sessionId", "moduleCode");

CREATE TABLE IF NOT EXISTS "ScreeningQualityFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "flagCode" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScreeningQualityFlag_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "ScreeningSession" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScreeningQualityFlag_sessionId_flagCode_key"
ON "ScreeningQualityFlag"("sessionId", "flagCode");

PRAGMA foreign_keys=ON;
