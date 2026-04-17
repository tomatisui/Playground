import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompletionSnapshot } from "@/lib/screening-config";
import {
  buildProvisionalSummary,
  touchSessionRoute,
  upsertQualityFlag,
} from "@/lib/session-runtime";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; code: string }> },
) {
  const { id, code } = await context.params;
  const body = await request.json();
  const session = await prisma.screeningSession.findUnique({
    where: { id },
    include: { moduleAttempts: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (body.type === "practice") {
    await prisma.screeningModuleAttempt.upsert({
      where: {
        sessionId_moduleCode: {
          sessionId: id,
          moduleCode: code,
        },
      },
      update: {
        practiceRuns: body.practiceRuns,
        practiceFailures: body.practiceFailures,
        status: "PRACTICED",
      },
      create: {
        sessionId: id,
        moduleCode: code,
        practiceRuns: body.practiceRuns,
        practiceFailures: body.practiceFailures,
        status: "PRACTICED",
      },
    });

    if (!body.passed && body.practiceFailures >= 2) {
      await upsertQualityFlag(id, "failed_practice", `${code} practice was failed repeatedly.`);
      await upsertQualityFlag(
        id,
        "low_training_mastery",
        `${code} practice accuracy remained low across repeated attempts.`,
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (body.type === "assist") {
    await prisma.screeningModuleAttempt.upsert({
      where: {
        sessionId_moduleCode: {
          sessionId: id,
          moduleCode: code,
        },
      },
      update: {
        caregiverAssistCount: body.caregiverAssistCount,
      },
      create: {
        sessionId: id,
        moduleCode: code,
        caregiverAssistCount: body.caregiverAssistCount,
        status: "IN_PROGRESS",
      },
    });

    if (body.caregiverAssistCount >= 1) {
      await upsertQualityFlag(
        id,
        "possible_caregiver_assist",
        `${code} runtime included reported caregiver help.`,
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (body.type === "progress") {
    await prisma.screeningModuleAttempt.upsert({
      where: {
        sessionId_moduleCode: {
          sessionId: id,
          moduleCode: code,
        },
      },
      update: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
        lastItemIndex: body.lastItemIndex,
        correctCount: body.correctCount,
        itemCount: body.itemCount,
        responseLog: body.responseLog,
        caregiverAssistCount: body.caregiverAssistCount ?? 0,
      },
      create: {
        sessionId: id,
        moduleCode: code,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        lastItemIndex: body.lastItemIndex,
        correctCount: body.correctCount,
        itemCount: body.itemCount,
        responseLog: body.responseLog,
        caregiverAssistCount: body.caregiverAssistCount ?? 0,
      },
    });

    await touchSessionRoute(id, `/session/${id}/module/${code}`, code);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "complete") {
    await prisma.screeningModuleAttempt.upsert({
      where: {
        sessionId_moduleCode: {
          sessionId: id,
          moduleCode: code,
        },
      },
      update: {
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
        lastItemIndex: body.itemCount,
        correctCount: body.correctCount,
        itemCount: body.itemCount,
        responseLog: body.responseLog,
        caregiverAssistCount: body.caregiverAssistCount ?? 0,
        provisionalSummary: buildProvisionalSummary(
          code,
          body.correctCount,
          body.itemCount,
        ),
      },
      create: {
        sessionId: id,
        moduleCode: code,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
        lastItemIndex: body.itemCount,
        correctCount: body.correctCount,
        itemCount: body.itemCount,
        responseLog: body.responseLog,
        caregiverAssistCount: body.caregiverAssistCount ?? 0,
        provisionalSummary: buildProvisionalSummary(
          code,
          body.correctCount,
          body.itemCount,
        ),
      },
    });

    if ((body.caregiverAssistCount ?? 0) >= 1) {
      await upsertQualityFlag(
        id,
        "possible_caregiver_assist",
        `${code} runtime included reported caregiver help.`,
      );
    }

    const updatedSession = await prisma.screeningSession.findUnique({
      where: { id },
      include: { moduleAttempts: true },
    });

    if (updatedSession) {
      const snapshot = getCompletionSnapshot(
        updatedSession.ageYears,
        updatedSession.moduleAttempts,
      );

      if (snapshot.is_complete) {
        await touchSessionRoute(id, `/session/${id}/report`, null);
      } else {
        await touchSessionRoute(id, `/session/${id}/practice`, null);
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
