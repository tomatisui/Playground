#!/bin/sh

set -eu

DB_PATH="prisma/dev.db"

sqlite3 "$DB_PATH" ".read prisma/migrations/0001_init/migration.sql"
sqlite3 "$DB_PATH" ".read prisma/migrations/0002_screening_prototype/migration.sql"

add_column_if_missing() {
  table_name="$1"
  column_name="$2"
  column_sql="$3"

  existing="$(sqlite3 "$DB_PATH" "PRAGMA table_info(\"$table_name\");" | awk -F'|' -v column="$column_name" '$2 == column { print $2 }')"

  if [ -z "$existing" ]; then
    sqlite3 "$DB_PATH" "ALTER TABLE \"$table_name\" ADD COLUMN $column_sql;"
  fi
}

add_column_if_missing "ScreeningSession" "guardianName" "\"guardianName\" TEXT"
add_column_if_missing "ScreeningSession" "guardianPhone" "\"guardianPhone\" TEXT"
add_column_if_missing "ScreeningSession" "guardianRelationship" "\"guardianRelationship\" TEXT"
add_column_if_missing "ScreeningSession" "birthYear" "\"birthYear\" INTEGER"
add_column_if_missing "ScreeningSession" "birthMonth" "\"birthMonth\" INTEGER"
add_column_if_missing "ScreeningSession" "birthDay" "\"birthDay\" INTEGER"
add_column_if_missing "ScreeningSession" "consentAcceptedAt" "\"consentAcceptedAt\" DATETIME"
add_column_if_missing "ScreeningSession" "audioCheckPassed" "\"audioCheckPassed\" BOOLEAN"
add_column_if_missing "ScreeningSession" "audioCheckCompletedAt" "\"audioCheckCompletedAt\" DATETIME"
add_column_if_missing "ScreeningSession" "currentRoute" "\"currentRoute\" TEXT"
add_column_if_missing "ScreeningSession" "currentModuleCode" "\"currentModuleCode\" TEXT"
add_column_if_missing "ScreeningSession" "lastActiveAt" "\"lastActiveAt\" DATETIME"

add_column_if_missing "ScreeningModuleAttempt" "status" "\"status\" TEXT NOT NULL DEFAULT 'NOT_STARTED'"
add_column_if_missing "ScreeningModuleAttempt" "startedAt" "\"startedAt\" DATETIME"
add_column_if_missing "ScreeningModuleAttempt" "practiceRuns" "\"practiceRuns\" INTEGER NOT NULL DEFAULT 0"
add_column_if_missing "ScreeningModuleAttempt" "practiceFailures" "\"practiceFailures\" INTEGER NOT NULL DEFAULT 0"
add_column_if_missing "ScreeningModuleAttempt" "lastItemIndex" "\"lastItemIndex\" INTEGER NOT NULL DEFAULT 0"
add_column_if_missing "ScreeningModuleAttempt" "correctCount" "\"correctCount\" INTEGER NOT NULL DEFAULT 0"
add_column_if_missing "ScreeningModuleAttempt" "itemCount" "\"itemCount\" INTEGER NOT NULL DEFAULT 0"
add_column_if_missing "ScreeningModuleAttempt" "caregiverAssistCount" "\"caregiverAssistCount\" INTEGER NOT NULL DEFAULT 0"
add_column_if_missing "ScreeningModuleAttempt" "provisionalSummary" "\"provisionalSummary\" TEXT"
add_column_if_missing "ScreeningModuleAttempt" "responseLog" "\"responseLog\" TEXT"

sqlite3 "$DB_PATH" <<'SQL'
DROP INDEX IF EXISTS "ScreeningSession_guardianPhone_key";

UPDATE "ScreeningSession"
SET "guardianPhone" = 'legacy-' || substr("id", 1, 8)
WHERE "guardianPhone" IS NULL OR "guardianPhone" = '';

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
SQL
