"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getModuleDefinition } from "@/lib/module-catalog";
import { getCompletionSnapshot, isExpectedModule } from "@/lib/screening-config";
import {
  buildAllTestsCompleteHref,
  buildConsultationHref,
  buildOverviewHref,
  buildPracticeStartHref,
} from "@/lib/screening-flow";
import {
  buildProvisionalSummary,
  touchSessionRoute,
  upsertQualityFlag,
} from "@/lib/session-runtime";

async function getSessionOrThrow(sessionId: string) {
  const session = await prisma.screeningSession.findUnique({
    where: { id: sessionId },
    include: {
      moduleAttempts: true,
      qualityFlags: true,
    },
  });

  if (!session) {
    throw new Error("Session not found.");
  }

  return session;
}

async function createSampleSession({
  ageYears,
  childLabel,
  guardianName,
  guardianPhone,
  guardianRelationship,
  completedModules,
  qualityFlags = [],
  currentRoute,
}: {
  ageYears: 5 | 6;
  childLabel: string;
  guardianName: string;
  guardianPhone?: string;
  guardianRelationship: string;
  completedModules: string[];
  qualityFlags?: Array<{ flagCode: string; note: string }>;
  currentRoute?: string;
}) {
  const session = await prisma.screeningSession.create({
    data: {
      childLabel,
      guardianName,
      guardianPhone: guardianPhone ?? `0109000${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
      guardianRelationship,
      ageYears,
      consentAcceptedAt: new Date(),
      audioCheckPassed: true,
      audioCheckCompletedAt: new Date(),
      currentRoute:
        currentRoute ??
        (completedModules.length === (ageYears === 6 ? 6 : 5)
          ? "/admin"
          : "/session/sample/practice"),
      lastActiveAt: new Date(),
    },
  });

  for (const moduleCode of completedModules) {
    const definition = getModuleDefinition(moduleCode, ageYears);
    const itemCount = definition?.testItems.length ?? 0;
    const correctCount = Math.max(0, itemCount - 1);

    await prisma.screeningModuleAttempt.create({
      data: {
        sessionId: session.id,
        moduleCode,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
        practiceRuns: definition?.practiceItems.length ? 1 : 0,
        practiceFailures: moduleCode === "M2" ? 1 : 0,
        lastItemIndex: itemCount,
        itemCount,
        correctCount,
        caregiverAssistCount: moduleCode === "M2" ? 1 : 0,
        provisionalSummary: buildProvisionalSummary(moduleCode, correctCount, itemCount),
        responseLog: JSON.stringify(
          Array.from({ length: itemCount }, (_, index) =>
            definition?.testItems[index]?.correctAnswer ?? "",
          ),
        ),
      },
    });
  }

  for (const flag of qualityFlags) {
    await prisma.screeningQualityFlag.create({
      data: {
        sessionId: session.id,
        flagCode: flag.flagCode,
        note: flag.note,
      },
    });
  }

  return session;
}

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 11);
}

function getSeoulTodayParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  return { year, month, day };
}

function getKoreanAgeSnapshot(year: number, month: number, day: number) {
  const today = getSeoulTodayParts();
  let ageYears = today.year - year;
  let ageMonths = today.month - month;
  const hasHadBirthdayThisMonth = today.day >= day;

  if (!hasHadBirthdayThisMonth) {
    ageMonths -= 1;
  }

  if (ageMonths < 0) {
    ageYears -= 1;
    ageMonths += 12;
  }

  return { ageYears, ageMonths };
}

export async function createSession(formData: FormData) {
  const childLabel = String(formData.get("childLabel") ?? "").trim();
  const guardianName = String(formData.get("guardianName") ?? "").trim();
  const guardianPhone = normalizePhone(String(formData.get("guardianPhone") ?? "").trim());
  const guardianRelationship = String(
    formData.get("guardianRelationship") ?? "",
  ).trim();
  const birthYear = Number(formData.get("birthYear") ?? 0);
  const birthMonth = Number(formData.get("birthMonth") ?? 0);
  const birthDay = Number(formData.get("birthDay") ?? 0);

  if (!childLabel) {
    redirect("/child-info?error=missing-child-label");
  }

  if (!guardianPhone) {
    redirect("/child-info?error=missing-guardian-phone");
  }

  if (guardianPhone.length !== 11) {
    redirect("/child-info?error=invalid-guardian-phone");
  }

  if (!birthYear || !birthMonth || !birthDay) {
    redirect("/child-info?error=missing-birth-date");
  }

  const { ageYears } = getKoreanAgeSnapshot(birthYear, birthMonth, birthDay);

  if (ageYears !== 5 && ageYears !== 6) {
    redirect("/child-info?error=invalid-age-range");
  }

  const existingSession = await prisma.screeningSession.findFirst({
    where: {
      guardianPhone,
      childLabel,
    },
    select: { id: true },
  });

  if (existingSession) {
    redirect("/child-info?error=duplicate-guardian-child");
  }

  const session = await prisma.screeningSession.create({
    data: {
      childLabel,
      guardianName: guardianName || null,
      guardianPhone,
      guardianRelationship: guardianRelationship || null,
      birthYear,
      birthMonth,
      birthDay,
      ageYears,
      consentAcceptedAt: new Date(),
      currentRoute: "/audio-check",
      lastActiveAt: new Date(),
    },
  });

  redirect(`/audio-check?sessionId=${session.id}`);
}

export async function submitAudioCheck(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const passed = String(formData.get("passed") ?? "") === "true";

  if (!sessionId) {
    redirect("/child-info?error=missing-session");
  }

  await prisma.screeningSession.update({
    where: { id: sessionId },
    data: {
      audioCheckPassed: passed,
      audioCheckCompletedAt: new Date(),
      currentRoute: passed
        ? buildOverviewHref(sessionId)
        : buildConsultationHref(sessionId),
      currentModuleCode: null,
      lastActiveAt: new Date(),
    },
  });

  if (!passed) {
    await upsertQualityFlag(
      sessionId,
      "audio_check_failed",
      "Guardian selected that the headphone or sound check did not pass cleanly.",
    );
    await upsertQualityFlag(
      sessionId,
      "consultation_recommended_after_audio_check",
      "Screening ended after the audio check because the guardian reported volume adjustment difficulty.",
    );
    redirect(buildConsultationHref(sessionId));
  }

  redirect(buildOverviewHref(sessionId));
}

export async function completePlaceholderModule(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const moduleCode = String(formData.get("moduleCode") ?? "");
  const session = await getSessionOrThrow(sessionId);

  if (!isExpectedModule(session.ageYears, moduleCode)) {
    redirect(`/session/${sessionId}/practice`);
  }

  await prisma.screeningModuleAttempt.upsert({
    where: {
      sessionId_moduleCode: {
        sessionId,
        moduleCode,
      },
    },
    update: {
      status: "COMPLETED",
      startedAt: new Date(),
      completedAt: new Date(),
      itemCount: 0,
      correctCount: 0,
      provisionalSummary:
        "Placeholder module completed for flow continuity. No scored listening items were run in this phase.",
    },
    create: {
      sessionId,
      moduleCode,
      status: "COMPLETED",
      startedAt: new Date(),
      completedAt: new Date(),
      itemCount: 0,
      correctCount: 0,
      provisionalSummary:
        "Placeholder module completed for flow continuity. No scored listening items were run in this phase.",
    },
  });

  const updatedSession = await getSessionOrThrow(sessionId);
  const snapshot = getCompletionSnapshot(
    updatedSession.ageYears,
    updatedSession.moduleAttempts,
  );

  if (snapshot.is_complete) {
    const href = buildAllTestsCompleteHref(sessionId);
    await touchSessionRoute(sessionId, href, null);
    redirect(href);
  }

  const href = buildPracticeStartHref(
    sessionId,
    snapshot.next_module!,
    moduleCode as
      | "M1"
      | "M2"
      | "M3"
      | "M3-R"
      | "M4"
      | "M5",
  );
  await touchSessionRoute(sessionId, href, snapshot.next_module!);
  redirect(href);
}

export async function completeRecommendedModule(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await getSessionOrThrow(sessionId);
  const snapshot = getCompletionSnapshot(session.ageYears, session.moduleAttempts);

  if (!snapshot.next_module) {
    revalidatePath("/admin");
    return;
  }

  await prisma.screeningModuleAttempt.upsert({
    where: {
      sessionId_moduleCode: {
        sessionId,
        moduleCode: snapshot.next_module,
      },
    },
    update: {
      status: "COMPLETED",
      completedAt: new Date(),
      provisionalSummary: buildProvisionalSummary(snapshot.next_module, 0, 0),
    },
    create: {
      sessionId,
      moduleCode: snapshot.next_module,
      status: "COMPLETED",
      startedAt: new Date(),
      completedAt: new Date(),
      provisionalSummary: buildProvisionalSummary(snapshot.next_module, 0, 0),
    },
  });

  revalidatePath("/admin");
}

export async function toggleModuleCompletion(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const moduleCode = String(formData.get("moduleCode") ?? "");
  const shouldComplete = String(formData.get("shouldComplete") ?? "") === "true";

  const session = await getSessionOrThrow(sessionId);

  if (!isExpectedModule(session.ageYears, moduleCode)) {
    revalidatePath("/admin");
    return;
  }

  if (shouldComplete) {
    await prisma.screeningModuleAttempt.upsert({
      where: {
        sessionId_moduleCode: {
          sessionId,
          moduleCode,
        },
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      create: {
        sessionId,
        moduleCode,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
  } else {
    await prisma.screeningModuleAttempt.deleteMany({
      where: {
        sessionId,
        moduleCode,
      },
    });
  }

  revalidatePath("/admin");
}

export async function resetAllSessions() {
  await prisma.$transaction([
    prisma.screeningQualityFlag.deleteMany(),
    prisma.screeningModuleAttempt.deleteMany(),
    prisma.screeningSession.deleteMany(),
  ]);

  revalidatePath("/admin");
}

export async function createAge5SampleRun() {
  await createSampleSession({
    ageYears: 5,
    childLabel: "샘플 5세",
    guardianName: "테스터 보호자",
    guardianRelationship: "Parent",
    completedModules: ["M1", "M2", "M3", "M4", "M5"],
    qualityFlags: [
      {
        flagCode: "possible_caregiver_assist",
        note: "Sample age-5 run includes one caregiver assist note for admin inspection.",
      },
    ],
    currentRoute: "/session/sample-age-5/report",
  });

  revalidatePath("/admin");
}

export async function createAge6SampleRun() {
  await createSampleSession({
    ageYears: 6,
    childLabel: "샘플 6세",
    guardianName: "테스터 보호자",
    guardianRelationship: "Parent",
    completedModules: ["M1", "M2", "M3", "M3-R", "M4", "M5"],
    qualityFlags: [
      {
        flagCode: "interrupted_session",
        note: "Sample age-6 run simulates an interruption and resume for admin inspection.",
      },
      {
        flagCode: "failed_practice",
        note: "Sample age-6 run simulates repeated practice difficulty.",
      },
    ],
    currentRoute: "/session/sample-age-6/report",
  });

  revalidatePath("/admin");
}

export async function seedSampleSessions() {
  await createAge5SampleRun();
  await createAge6SampleRun();

  await createSampleSession({
    ageYears: 6,
    childLabel: "중단 테스트 세션",
    guardianName: "내부 테스터",
    guardianRelationship: "Guardian",
    completedModules: ["M1", "M2"],
    qualityFlags: [
      {
        flagCode: "audio_check_failed",
        note: "Sample seeded session keeps a failed audio-check flag for inspection.",
      },
      {
        flagCode: "low_training_mastery",
        note: "Sample seeded session keeps a low training mastery flag for inspection.",
      },
    ],
    currentRoute: "/session/sample-age-6/module/M3",
  });

  revalidatePath("/admin");
}
