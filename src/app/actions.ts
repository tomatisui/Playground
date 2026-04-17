"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getCompletionSnapshot,
  isExpectedModule,
} from "@/lib/screening-config";

async function getSessionOrThrow(sessionId: string) {
  const session = await prisma.screeningSession.findUnique({
    where: { id: sessionId },
    include: { moduleAttempts: true },
  });

  if (!session) {
    throw new Error("Session not found.");
  }

  return session;
}

export async function completeRecommendedModule(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await getSessionOrThrow(sessionId);
  const snapshot = getCompletionSnapshot(session.ageYears, session.moduleAttempts);

  if (!snapshot.next_module) {
    revalidatePath("/");
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
      completedAt: new Date(),
    },
    create: {
      sessionId,
      moduleCode: snapshot.next_module,
      completedAt: new Date(),
    },
  });

  revalidatePath("/");
}

export async function toggleModuleCompletion(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const moduleCode = String(formData.get("moduleCode") ?? "");
  const shouldComplete = String(formData.get("shouldComplete") ?? "") === "true";

  const session = await getSessionOrThrow(sessionId);

  if (!isExpectedModule(session.ageYears, moduleCode)) {
    revalidatePath("/");
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
        completedAt: new Date(),
      },
      create: {
        sessionId,
        moduleCode,
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

  revalidatePath("/");
}
