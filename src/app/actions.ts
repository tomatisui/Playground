"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompletionSnapshot, isExpectedModule } from "@/lib/screening-config";
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

export async function createSession(formData: FormData) {
  const childLabel = String(formData.get("childLabel") ?? "").trim();
  const guardianName = String(formData.get("guardianName") ?? "").trim();
  const guardianRelationship = String(
    formData.get("guardianRelationship") ?? "",
  ).trim();
  const ageYears = Number(formData.get("ageYears") ?? 5);

  const session = await prisma.screeningSession.create({
    data: {
      childLabel: childLabel || "New child",
      guardianName: guardianName || null,
      guardianRelationship: guardianRelationship || null,
      ageYears: ageYears === 6 ? 6 : 5,
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

  await prisma.screeningSession.update({
    where: { id: sessionId },
    data: {
      audioCheckPassed: passed,
      audioCheckCompletedAt: new Date(),
      currentRoute: `/session/${sessionId}/practice`,
      lastActiveAt: new Date(),
    },
  });

  if (!passed) {
    await upsertQualityFlag(
      sessionId,
      "audio_check_failed",
      "Guardian selected that the headphone or sound check did not pass cleanly.",
    );
  }

  redirect(`/session/${sessionId}/practice`);
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
    await touchSessionRoute(sessionId, `/session/${sessionId}/report`, null);
    redirect(`/session/${sessionId}/report`);
  }

  await touchSessionRoute(sessionId, `/session/${sessionId}/practice`, null);
  redirect(`/session/${sessionId}/practice`);
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
