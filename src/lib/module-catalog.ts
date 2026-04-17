import moduleDefinitions from "@/lib/module-definitions.json";

export type ModuleItemDefinition = {
  id: string;
  prompt: string;
  choices: string[];
  correctAnswer: string;
};

export type RuntimeModuleDefinition = {
  code: string;
  title: string;
  implemented: boolean;
  placeholderCopy?: string;
  playbackType?: "tts" | "pattern";
  instructions?: string;
  practiceItems?: ModuleItemDefinition[];
  testItems?: ModuleItemDefinition[];
};

const catalog = moduleDefinitions as Record<string, RuntimeModuleDefinition>;

export function getModuleDefinition(moduleCode: string) {
  return catalog[moduleCode] ?? null;
}

export function getImplementedModuleDefinition(moduleCode: string) {
  const definition = getModuleDefinition(moduleCode);

  if (!definition || !definition.implemented) {
    return null;
  }

  return definition;
}
