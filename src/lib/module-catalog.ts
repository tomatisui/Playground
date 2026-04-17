import m1Manifest from "../../content/stimuli/M1.manifest.json";
import m2Manifest from "../../content/stimuli/M2.manifest.json";
import m3Manifest from "../../content/stimuli/M3.manifest.json";
import m3rManifest from "../../content/stimuli/M3-R.manifest.json";
import m4Manifest from "../../content/stimuli/M4.manifest.json";
import m5Manifest from "../../content/stimuli/M5.manifest.json";

export type ModuleAgeBand = 5 | 6;

export type TrainingPoolEntry = {
  label: string;
  imageKey?: string;
  localAudioPath?: string | null;
  labels?: string[];
  reviewNeeded?: boolean;
  notes?: string;
};

export type ModuleItemDefinition = {
  id: string;
  ageBand: ModuleAgeBand[];
  contentGroup?: string;
  prompt: string;
  promptSequence?: string[];
  promptAudio: string | null;
  localAudioPath?: string | null;
  choices: string[];
  choiceImageKeys?: string[];
  choiceImages: string[];
  correctAnswer: string;
  difficultyLevel: string;
  placeholder: boolean;
  labels?: string[];
  reviewNeeded?: boolean;
  notes: string;
};

export type ModuleManifest = {
  moduleCode: string;
  title: string;
  implemented: boolean;
  ageBand: ModuleAgeBand[];
  playbackType: "tts" | "pattern";
  instructions: string;
  placeholderCopy?: string;
  trainingPool?: TrainingPoolEntry[];
  practiceItems: ModuleItemDefinition[];
  testItems: ModuleItemDefinition[];
  promptAudio: string[];
  choiceImages: string[];
  correctAnswer: string | null;
  difficultyLevel: string;
  placeholder: boolean;
  labels: string[];
  notes: string;
};

function normalizeManifest(input: unknown) {
  return input as ModuleManifest;
}

const catalog: Record<string, ModuleManifest> = {
  M1: normalizeManifest(m1Manifest),
  M2: normalizeManifest(m2Manifest),
  M3: normalizeManifest(m3Manifest),
  "M3-R": normalizeManifest(m3rManifest),
  M4: normalizeManifest(m4Manifest),
  M5: normalizeManifest(m5Manifest),
};

function filterItemsForAge(
  items: ModuleItemDefinition[],
  ageYears: number,
) {
  const normalizedAge = ageYears === 6 ? 6 : 5;
  return items.filter((item) => item.ageBand.includes(normalizedAge));
}

export function getModuleManifest(moduleCode: string) {
  return catalog[moduleCode] ?? null;
}

export function getModuleDefinition(moduleCode: string, ageYears?: number) {
  const manifest = getModuleManifest(moduleCode);

  if (!manifest) {
    return null;
  }

  if (!ageYears) {
    return manifest;
  }

  const normalizedAge = ageYears === 6 ? 6 : 5;

  if (!manifest.ageBand.includes(normalizedAge)) {
    return null;
  }

  return {
    ...manifest,
    implemented: !manifest.placeholder,
    practiceItems: filterItemsForAge(manifest.practiceItems, normalizedAge),
    testItems: filterItemsForAge(manifest.testItems, normalizedAge),
  };
}

export function getPlaceholderModuleLabels(moduleCode: string) {
  const manifest = getModuleManifest(moduleCode);

  if (!manifest || !manifest.placeholder) {
    return [];
  }

  return manifest.labels;
}

export function usesFallbackContentAssets(moduleCode: string, ageYears?: number) {
  const definition = getModuleDefinition(moduleCode, ageYears);

  if (!definition) {
    return true;
  }

  const allItems = [...definition.practiceItems, ...definition.testItems];

  return allItems.some(
    (item) => !item.promptAudio || item.choiceImages.length === 0,
  );
}

export function getContentAssetStatus(moduleCode: string, ageYears?: number) {
  const definition = getModuleDefinition(moduleCode, ageYears);

  if (!definition) {
    return "missing_manifest";
  }

  if (definition.placeholder) {
    return "prototype_placeholder";
  }

  return usesFallbackContentAssets(moduleCode, ageYears)
    ? "fallback_assets"
    : "real_assets";
}

export function getM5ValidationIssues(ageYears: number) {
  const definition = getModuleDefinition("M5", ageYears);

  if (!definition) {
    return ["M5 manifest is missing for this age band."];
  }

  const issues: string[] = [];
  const checkItems = [...definition.practiceItems, ...definition.testItems];

  for (const item of checkItems) {
    if (item.contentGroup === "M5-A") {
      if (item.choices.length !== 4) {
        issues.push(`${item.id}: M5-A items must have 4 choices.`);
      }
      if ((item.promptSequence?.length ?? 0) < 5) {
        issues.push(`${item.id}: M5-A prompt sequence should include 4 words plus an instruction cue.`);
      }
    }

    if (item.contentGroup === "M5-B") {
      if (item.choices.length !== 3) {
        issues.push(`${item.id}: M5-B items must have 3 choices.`);
      }
      if ((item.promptSequence?.length ?? 0) < 4) {
        issues.push(`${item.id}: M5-B prompt sequence should include 3 words plus an instruction cue.`);
      }
    }

    if (!item.labels?.includes("provisional_prototype_content")) {
      issues.push(`${item.id}: prototype content label is missing.`);
    }

    const lexicalExceptions = item.choices.filter((choice) => [...choice].length > 2);
    if (lexicalExceptions.length > 0 && !item.reviewNeeded) {
      issues.push(
        `${item.id}: lexical exception metadata is required for >2-syllable choices (${lexicalExceptions.join(", ")}).`,
      );
    }
  }

  return issues;
}

export function getModuleReviewFlags(moduleCode: string, ageYears?: number) {
  const definition = getModuleDefinition(moduleCode, ageYears);

  if (!definition) {
    return ["Manifest is missing for this age band."];
  }

  const flags: string[] = [];

  for (const item of [...definition.practiceItems, ...definition.testItems]) {
    if (item.reviewNeeded) {
      flags.push(`${item.id}: review_needed metadata is set.`);
    }
  }

  if (moduleCode === "M5") {
    for (const item of [...definition.practiceItems, ...definition.testItems]) {
      const lexicalExceptions = item.choices.filter((choice) => [...choice].length > 2);
      for (const exception of lexicalExceptions) {
        flags.push(`${item.id}: lexical exception candidate "${exception}" should stay under review.`);
      }
    }
  }

  return flags;
}

export function getM3RValidationIssues(ageYears: number) {
  const definition = getModuleDefinition("M3-R", ageYears);

  if (!definition) {
    return ["M3-R manifest is missing for this age band."];
  }

  const issues: string[] = [];
  const checkItems = [...definition.practiceItems, ...definition.testItems];

  for (const item of checkItems) {
    if (!item.labels?.includes("provisional_prototype_content")) {
      issues.push(`${item.id}: prototype content label is missing.`);
    }

    if ((item.promptSequence?.length ?? 0) < 2) {
      issues.push(`${item.id}: reverse-memory sequence should include at least 2 heard items.`);
    }

    if (!item.correctAnswer.includes(",")) {
      issues.push(`${item.id}: reverse-memory answer should encode an ordered sequence.`);
    }
  }

  return issues;
}

export function getM4ValidationIssues(ageYears: number) {
  const definition = getModuleDefinition("M4", ageYears);

  if (!definition) {
    return ["M4 manifest is missing for this age band."];
  }

  const issues: string[] = [];
  const checkItems = [...definition.practiceItems, ...definition.testItems];
  const maxPatternLength = ageYears === 6 ? 4 : 3;

  for (const item of checkItems) {
    if (!item.labels?.includes("provisional_prototype_content")) {
      issues.push(`${item.id}: prototype content label is missing.`);
    }

    if (
      item.contentGroup !== "length_pattern" &&
      item.contentGroup !== "pitch_pattern"
    ) {
      issues.push(`${item.id}: M4 items must declare length_pattern or pitch_pattern.`);
    }

    const patternLength = item.promptSequence?.length ?? 0;
    if (patternLength < 2) {
      issues.push(`${item.id}: M4 items should include at least a 2-step pattern.`);
    }
    if (patternLength > maxPatternLength) {
      issues.push(
        `${item.id}: pattern length ${patternLength} exceeds age ${ageYears} maximum of ${maxPatternLength}.`,
      );
    }
  }

  return issues;
}

export function getModuleSubtypeBreakdown(moduleCode: string, ageYears?: number) {
  const definition = getModuleDefinition(moduleCode, ageYears);

  if (!definition) {
    return {} as Record<string, number>;
  }

  return [...definition.practiceItems, ...definition.testItems].reduce<Record<string, number>>(
    (accumulator, item) => {
      const key = item.contentGroup ?? "unspecified";
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    },
    {},
  );
}
