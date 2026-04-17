import m1Manifest from "../../content/stimuli/M1.manifest.json";
import m2Manifest from "../../content/stimuli/M2.manifest.json";
import m3Manifest from "../../content/stimuli/M3.manifest.json";
import m3rManifest from "../../content/stimuli/M3-R.manifest.json";
import m4Manifest from "../../content/stimuli/M4.manifest.json";
import m5Manifest from "../../content/stimuli/M5.manifest.json";

export type ModuleAgeBand = 5 | 6;

export type ModuleItemDefinition = {
  id: string;
  ageBand: ModuleAgeBand[];
  contentGroup?: "M5-A" | "M5-B";
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
