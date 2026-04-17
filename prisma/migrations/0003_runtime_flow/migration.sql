ALTER TABLE "ScreeningSession" ADD COLUMN IF NOT EXISTS "guardianName" TEXT;
ALTER TABLE "ScreeningSession" ADD COLUMN IF NOT EXISTS "guardianRelationship" TEXT;
ALTER TABLE "ScreeningSession" ADD COLUMN IF NOT EXISTS "consentAcceptedAt" DATETIME;
ALTER TABLE "ScreeningSession" ADD COLUMN IF NOT EXISTS "audioCheckPassed" BOOLEAN;
ALTER TABLE "ScreeningSession" ADD COLUMN IF NOT EXISTS "audioCheckCompletedAt" DATETIME;
ALTER TABLE "ScreeningSession" ADD COLUMN IF NOT EXISTS "currentRoute" TEXT;
ALTER TABLE "ScreeningSession" ADD COLUMN IF NOT EXISTS "currentModuleCode" TEXT;
ALTER TABLE "ScreeningSession" ADD COLUMN IF NOT EXISTS "lastActiveAt" DATETIME;

ALTER TABLE "ScreeningModuleAttempt" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "ScreeningModuleAttempt" ADD COLUMN IF NOT EXISTS "startedAt" DATETIME;
ALTER TABLE "ScreeningModuleAttempt" ADD COLUMN IF NOT EXISTS "practiceRuns" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScreeningModuleAttempt" ADD COLUMN IF NOT EXISTS "practiceFailures" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScreeningModuleAttempt" ADD COLUMN IF NOT EXISTS "lastItemIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScreeningModuleAttempt" ADD COLUMN IF NOT EXISTS "correctCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScreeningModuleAttempt" ADD COLUMN IF NOT EXISTS "itemCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScreeningModuleAttempt" ADD COLUMN IF NOT EXISTS "caregiverAssistCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScreeningModuleAttempt" ADD COLUMN IF NOT EXISTS "provisionalSummary" TEXT;
ALTER TABLE "ScreeningModuleAttempt" ADD COLUMN IF NOT EXISTS "responseLog" TEXT;

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
