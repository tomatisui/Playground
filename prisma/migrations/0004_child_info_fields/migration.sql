PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ScreeningSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childLabel" TEXT NOT NULL,
    "ageYears" INTEGER NOT NULL,
    "classroomLabel" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
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
    "guardianRelationship",
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
    "guardianRelationship",
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

CREATE UNIQUE INDEX "ScreeningSession_guardianPhone_key"
ON "ScreeningSession"("guardianPhone");

PRAGMA foreign_keys=ON;
