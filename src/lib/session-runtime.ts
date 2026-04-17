import { prisma } from "@/lib/prisma";
import {
  getContentAssetStatus,
  getModuleDefinition,
  getPlaceholderModuleLabels,
  usesFallbackContentAssets,
} from "@/lib/module-catalog";
import {
  ModuleCode,
  getCompletionSnapshot,
  getExpectedModules,
  getNextRecommendedModule,
} from "@/lib/screening-config";

export const QUALITY_FLAG_DETAILS = {
  failed_practice: "Practice rounds were failed repeatedly.",
  interrupted_session: "The child resumed after an interruption during runtime.",
  audio_check_failed: "The guardian reported that the sound check did not pass cleanly.",
  low_training_mastery: "Practice accuracy stayed low across repeated attempts.",
  possible_caregiver_assist: "The guardian reported that extra help may have been needed.",
} as const;

export type QualityFlagCode = keyof typeof QUALITY_FLAG_DETAILS;

export function parseResponseLog(responseLog: string | null) {
  if (!responseLog) {
    return [];
  }

  try {
    const parsed = JSON.parse(responseLog);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function touchSessionRoute(
  sessionId: string,
  currentRoute: string,
  currentModuleCode?: string | null,
) {
  await prisma.screeningSession.update({
    where: { id: sessionId },
    data: {
      currentRoute,
      currentModuleCode: currentModuleCode ?? null,
      lastActiveAt: new Date(),
    },
  });
}

export async function upsertQualityFlag(
  sessionId: string,
  flagCode: QualityFlagCode,
  note?: string,
) {
  await prisma.screeningQualityFlag.upsert({
    where: {
      sessionId_flagCode: {
        sessionId,
        flagCode,
      },
    },
    update: {
      note: note ?? undefined,
    },
    create: {
      sessionId,
      flagCode,
      note,
    },
  });
}

export function buildProvisionalSummary(
  moduleCode: string,
  correctCount: number,
  itemCount: number,
) {
  const definition = getModuleDefinition(moduleCode);
  const label = definition
    ? `${definition.moduleCode} ${definition.title}`
    : moduleCode;
  const contentStatus = getContentAssetStatus(moduleCode);

  return `${label}: ${correctCount}/${itemCount} items aligned with the current prompt. Content status: ${contentStatus}. This is a provisional raw summary only.`;
}

export function getAccuracyBand(correctCount: number, itemCount: number) {
  if (itemCount <= 0) {
    return "insufficient";
  }

  const accuracy = correctCount / itemCount;

  if (accuracy >= 0.8) {
    return "strong";
  }

  if (accuracy >= 0.5) {
    return "watch";
  }

  return "concern";
}

export function getReportLevel({
  moduleAttempts,
  qualityFlags,
}: {
  moduleAttempts: Array<{
    correctCount: number;
    itemCount: number;
    completedAt: Date | null;
  }>;
  qualityFlags: Array<{ flagCode: string }>;
}) {
  const completedAttempts = moduleAttempts.filter((attempt) => attempt.completedAt);
  const concernCount = completedAttempts.filter(
    (attempt) => getAccuracyBand(attempt.correctCount, attempt.itemCount) === "concern",
  ).length;
  const watchCount = completedAttempts.filter(
    (attempt) => getAccuracyBand(attempt.correctCount, attempt.itemCount) === "watch",
  ).length;
  const flagCodes = new Set(qualityFlags.map((flag) => flag.flagCode));

  if (
    concernCount >= 2 ||
    (concernCount >= 1 &&
      (flagCodes.has("low_training_mastery") ||
        flagCodes.has("possible_caregiver_assist")))
  ) {
    return 3;
  }

  if (
    concernCount >= 1 ||
    watchCount >= 1 ||
    flagCodes.size > 0
  ) {
    return 2;
  }

  return 1;
}

export function getReportLevelCopy(level: number) {
  if (level === 3) {
    return "전문가 상담을 고려할 만한 신호가 보임";
  }

  if (level === 2) {
    return "반복 관찰이 권장됨";
  }

  return "지금은 큰 우려 신호가 두드러지지 않음";
}

export function buildObservedText({
  moduleAttempts,
  qualityFlags,
  ageYears,
}: {
  moduleAttempts: Array<{
    moduleCode: string;
    correctCount: number;
    itemCount: number;
    completedAt: Date | null;
    provisionalSummary: string | null;
  }>;
  qualityFlags: Array<{ flagCode: string }>;
  ageYears: number;
}) {
  const completedAttempts = moduleAttempts.filter((attempt) => attempt.completedAt);

  if (completedAttempts.length === 0) {
    return "아직 충분한 수행 자료가 쌓이지 않아 관찰 내용을 요약하기 어렵습니다.";
  }

  const observations = completedAttempts.map((attempt) => {
    const definition = getModuleDefinition(attempt.moduleCode);
    const band = getAccuracyBand(attempt.correctCount, attempt.itemCount);
    const moduleLabel = definition
      ? `${definition.moduleCode} ${definition.title}`
      : attempt.moduleCode;

    if (band === "strong") {
      return `${moduleLabel} 활동에서는 현재 제시된 과제 범위 안에서 비교적 안정적으로 반응했습니다.`;
    }

    if (band === "watch") {
      return `${moduleLabel} 활동에서는 일부 문항에서 흔들림이 보여 반복 관찰이 도움이 될 수 있습니다.`;
    }

    return `${moduleLabel} 활동에서는 제시된 순서나 소리 단서를 유지하는 데 어려움이 더 자주 관찰되었습니다.`;
  });

  if (qualityFlags.length > 0) {
    observations.push(
      "또한 검사 중 연습 실패, 중단 후 재개, 추가 도움 필요 가능성 같은 진행 품질 신호가 함께 기록되었습니다.",
    );
  }

  const placeholderRuns = completedAttempts.filter((attempt) =>
    getPlaceholderModuleLabels(attempt.moduleCode).length > 0,
  );

  if (placeholderRuns.length > 0) {
    observations.push(
      "일부 활동은 내부 프로토타입 단계의 예비 콘텐츠로 진행되어 이번 결과는 참고용 관찰 안내로 해석하는 것이 적절합니다.",
    );
  }

  const fallbackRuns = completedAttempts.filter((attempt) =>
    usesFallbackContentAssets(attempt.moduleCode, ageYears),
  );

  if (fallbackRuns.length > 0) {
    observations.push(
      "일부 문항은 최종 녹음 자산 대신 현재 프로토타입용 대체 자산으로 진행되었습니다.",
    );
  }

  return observations.join(" ");
}

export function buildLimitationsText() {
  return "이 결과는 짧은 모바일 프로토타입 과제에서 나온 관찰 요약입니다. 기기 음량, 주변 소음, 피로, 낯선 과제 형식, 보호자 도움 여부에 영향을 받을 수 있으며 백분위 규준이나 진단 정보를 제공하지 않습니다.";
}

export function buildNextActionText(level: number) {
  if (level === 3) {
    return "같은 환경에서 한 번 더 반복 관찰해 보고, 일상에서도 비슷한 어려움이 이어지면 청능, 언어, 발달 관련 전문가 상담 여부를 상의해 보세요.";
  }

  if (level === 2) {
    return "다른 날 같은 환경에서 반복 관찰을 권장합니다. 교실과 가정에서 지시 듣기, 소리 순서 따라 하기, 말소리 구별 모습을 함께 기록해 주세요.";
  }

  return "현재 단계에서는 일상 관찰을 이어 가면 충분합니다. 이후 피로가 적은 날에 짧게 다시 확인해 보는 정도로도 도움이 됩니다.";
}

export async function getSessionWithDetails(sessionId: string) {
  return prisma.screeningSession.findUnique({
    where: { id: sessionId },
    include: {
      moduleAttempts: {
        orderBy: [{ createdAt: "asc" }],
      },
      qualityFlags: {
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });
}

export function getSessionEngineSnapshot(session: {
  ageYears: number;
  moduleAttempts: Array<{
    moduleCode: string;
    completedAt: Date | null;
  }>;
}) {
  const completion = getCompletionSnapshot(session.ageYears, session.moduleAttempts);

  return {
    ...completion,
    expected_modules: getExpectedModules(session.ageYears),
    next_module: getNextRecommendedModule(
      session.ageYears,
      completion.completed_modules,
    ),
  };
}

export function isModuleAvailableForSession(ageYears: number, moduleCode: string) {
  return getExpectedModules(ageYears).includes(moduleCode as ModuleCode);
}

export function getPrototypeGradeStatus(session: {
  ageYears: number;
  moduleAttempts: Array<{
    moduleCode: string;
    completedAt: Date | null;
  }>;
}) {
  const completedAttempts = session.moduleAttempts.filter(
    (attempt) => attempt.completedAt,
  );

  if (
    completedAttempts.some(
      (attempt) => getPlaceholderModuleLabels(attempt.moduleCode).length > 0,
    )
  ) {
    return "prototype_grade";
  }

  if (
    completedAttempts.some((attempt) =>
      usesFallbackContentAssets(attempt.moduleCode, session.ageYears),
    )
  ) {
    return "prototype_grade";
  }

  return "content_ready";
}
