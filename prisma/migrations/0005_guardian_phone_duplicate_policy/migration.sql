PRAGMA foreign_keys=OFF;

DROP INDEX IF EXISTS "ScreeningSession_guardianPhone_key";

CREATE TABLE "new_ScreeningSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childLabel" TEXT NOT NULL,
    "ageYears" INTEGER NOT NULL,
    "classroomLabel" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT NOT NULL,
    "guardianRelationship" TEXT,
    "birthYear" INTEGER,
    "birthMonth" INTEGER,
    "birthDay" INTEGER,
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
    "guardianName",
    "guardianPhone",
    "guardianRelationship",
    "birthYear",
    "birthMonth",
    "birthDay",
    "consentAcceptedAt",
    "audioCheckPassed",
    "audioCheckCompletedAt",
    "currentRoute",
    "currentModuleCode",
    "lastActiveAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "childLabel",
    "ageYears",
    "classroomLabel",
    "guardianName",
    COALESCE(NULLIF("guardianPhone", ''), 'legacy-' || substr("id", 1, 8)),
    "guardianRelationship",
    "birthYear",
    "birthMonth",
    "birthDay",
    "consentAcceptedAt",
    "audioCheckPassed",
    "audioCheckCompletedAt",
    "currentRoute",
    "currentModuleCode",
    "lastActiveAt",
    "createdAt",
    "updatedAt"
FROM "ScreeningSession";

DROP TABLE "ScreeningSession";
ALTER TABLE "new_ScreeningSession" RENAME TO "ScreeningSession";

PRAGMA foreign_keys=ON;
