export const MODULE_PRIORITY = [
  "M3",
  "M4",
  "M5",
  "M3-R",
  "M2",
  "M1",
] as const;

export const AGE_MODULES = {
  5: {
    label: "Age 5",
    expected_modules: ["M1", "M2", "M3", "M4", "M5"],
  },
  6: {
    label: "Age 6",
    expected_modules: ["M1", "M2", "M3", "M3-R", "M4", "M5"],
  },
} as const;

export const MODULE_DETAILS = {
  M1: {
    code: "M1",
    title: "phonemic discrimination",
    summary: "Child distinguishes similar speech sounds in quiet listening.",
    internalLabels: ["prototype_placeholder", "content_not_final"],
  },
  M2: {
    code: "M2",
    title: "speech-in-noise",
    summary: "Child identifies speech targets while background noise is present.",
    internalLabels: ["prototype_placeholder", "content_not_final"],
  },
  M3: {
    code: "M3",
    title: "auditory working memory forward",
    summary: "Child repeats heard sequences in the same order.",
    internalLabels: ["content_not_final"],
  },
  "M3-R": {
    code: "M3-R",
    title: "auditory working memory backward",
    summary: "Child repeats heard sequences in reverse order.",
    internalLabels: ["content_not_final"],
  },
  M4: {
    code: "M4",
    title: "auditory pattern recognition",
    summary: "Child recognizes and compares rhythmic or tonal patterns.",
    internalLabels: ["content_not_final"],
  },
  M5: {
    code: "M5",
    title: "phonological awareness",
    summary: "Child demonstrates sound-based language awareness without diagnostic labeling.",
    internalLabels: ["content_not_final"],
  },
} as const;

export type ModuleCode = keyof typeof MODULE_DETAILS;
export type AgeYears = keyof typeof AGE_MODULES;

type SessionAttempt = {
  moduleCode: string;
  completedAt: Date | null;
};

function normalizeAge(ageYears: number): AgeYears {
  return ageYears === 6 ? 6 : 5;
}

export function getAgeModuleConfig(ageYears: number) {
  return AGE_MODULES[normalizeAge(ageYears)];
}

export function getExpectedModules(ageYears: number): ModuleCode[] {
  return [...getAgeModuleConfig(ageYears).expected_modules];
}

export function getCompletedModules(attempts: SessionAttempt[]): ModuleCode[] {
  return attempts
    .filter((attempt) => attempt.completedAt)
    .map((attempt) => attempt.moduleCode)
    .filter((moduleCode): moduleCode is ModuleCode => moduleCode in MODULE_DETAILS);
}

export function getNextRecommendedModule(
  ageYears: number,
  completedModules: string[],
): ModuleCode | null {
  const expected = new Set(getExpectedModules(ageYears));
  const completed = new Set(completedModules);

  for (const moduleCode of MODULE_PRIORITY) {
    if (expected.has(moduleCode) && !completed.has(moduleCode)) {
      return moduleCode;
    }
  }

  return null;
}

export function getCompletionSnapshot(
  ageYears: number,
  attempts: SessionAttempt[],
) {
  const expected_modules = getExpectedModules(ageYears);
  const completed_modules = getCompletedModules(attempts).filter((moduleCode) =>
    expected_modules.includes(moduleCode),
  );
  const remaining_modules = expected_modules.filter(
    (moduleCode) => !completed_modules.includes(moduleCode),
  );
  const unexpected_modules = getCompletedModules(attempts).filter(
    (moduleCode) => !expected_modules.includes(moduleCode),
  );

  return {
    expected_modules,
    completed_modules,
    remaining_modules,
    unexpected_modules,
    next_module: getNextRecommendedModule(ageYears, completed_modules),
    is_complete:
      remaining_modules.length === 0 &&
      completed_modules.length === expected_modules.length,
  };
}

export function isExpectedModule(ageYears: number, moduleCode: string) {
  return getExpectedModules(ageYears).includes(moduleCode as ModuleCode);
}

export function getParentFacingSummary(isComplete: boolean) {
  if (isComplete) {
    return "All planned listening activities for this age band are complete. This prototype highlights completion only and does not provide a diagnosis or percentile interpretation.";
  }

  return "This prototype shows which listening activities have been completed and which still need observation. It is a non-diagnostic screen and does not assign percentile norms.";
}
