import { ModuleCode, getExpectedModules } from "@/lib/screening-config";

export type TransitionScreenType =
  | "overall-order-intro"
  | "practice-start"
  | "test-start"
  | "all-tests-complete";

export const MODULE_KOREAN_LABELS: Record<ModuleCode, string> = {
  M1: "비슷한 소리 구별 검사",
  M2: "시끄러운 소리 속 듣기 검사",
  M3: "기억하기 검사",
  "M3-R": "거꾸로 기억하기 검사",
  M4: "소리 패턴 검사",
  M5: "말소리 찾기 검사",
};

export function getModuleKoreanLabel(moduleCode: ModuleCode) {
  return MODULE_KOREAN_LABELS[moduleCode];
}

export function buildOverviewHref(sessionId: string) {
  return `/session/${sessionId}/overview`;
}

export function buildConsultationHref(sessionId: string) {
  return `/session/${sessionId}/consultation`;
}

export function buildPracticeStartHref(
  sessionId: string,
  moduleCode: ModuleCode,
  previousModuleCode?: ModuleCode | null,
) {
  const params = new URLSearchParams({
    screen: "practice-start",
    module: moduleCode,
  });

  if (previousModuleCode) {
    params.set("previous", previousModuleCode);
  }

  return `/session/${sessionId}/transition?${params.toString()}`;
}

export function buildAllTestsCompleteHref(sessionId: string) {
  return `/session/${sessionId}/transition?screen=all-tests-complete`;
}

export function getOverallOrderItems(ageYears: number) {
  return getExpectedModules(ageYears).map((moduleCode, index) => ({
    moduleCode,
    order: index + 1,
    label: getModuleKoreanLabel(moduleCode),
  }));
}

export function getPracticeStartCopy(
  moduleCode: ModuleCode,
  previousModuleCode?: ModuleCode | null,
) {
  const moduleLabel = getModuleKoreanLabel(moduleCode);
  const previousLabel = previousModuleCode
    ? getModuleKoreanLabel(previousModuleCode)
    : null;

  const previews: Record<ModuleCode, string> = {
    M1: "짧은 연습 뒤에 비슷한 소리를 구별하는 검사를 시작합니다.",
    M2: "짧은 연습 뒤에 들린 말을 고르는 검사를 시작합니다.",
    M3: "먼저 단어를 익히고 두 번 연습한 뒤 실제 검사를 시작합니다.",
    "M3-R": "두 번 연습한 뒤 거꾸로 기억하기 검사를 시작합니다.",
    M4: "길이 소리 연습을 먼저 하고, 이어서 높낮이 소리 연습을 합니다.",
    M5: "짧은 연습 뒤에 처음 소리를 찾는 검사를 시작합니다.",
  };

  return {
    title: previousLabel
      ? `${moduleLabel} 연습을 시작해요`
      : "첫 번째 검사 연습을 시작해요",
    body: previousLabel
      ? `${previousLabel} 검사가 끝났어요. 이제 ${moduleLabel} 연습을 시작합니다.`
      : `${moduleLabel}부터 차례대로 진행합니다.`,
    bullets: [previews[moduleCode]],
    primaryLabel: "연습 시작",
    audioText: previousLabel
      ? `${previousLabel} 검사가 끝났어요. 이제 ${moduleLabel} 연습을 시작합니다. ${previews[moduleCode]}`
      : `첫 번째로 ${moduleLabel} 연습을 시작합니다. ${previews[moduleCode]}`,
  };
}

export function getTestStartCopy(moduleCode: ModuleCode) {
  const moduleLabel = getModuleKoreanLabel(moduleCode);

  const prompts: Record<ModuleCode, string> = {
    M1: "연습이 끝났어요. 검사 시작을 누르면 비슷한 소리 구별 검사를 시작합니다.",
    M2: "연습이 끝났어요. 검사 시작을 누르면 들린 말을 고르는 검사를 시작합니다.",
    M3: "연습이 끝났어요. 검사 시작을 누르면 같은 순서로 기억하기 검사를 시작합니다.",
    "M3-R": "연습이 끝났어요. 검사 시작을 누르면 거꾸로 기억하기 검사를 시작합니다.",
    M4: "연습이 끝났어요. 검사 시작을 누르면 소리 패턴 검사를 시작합니다.",
    M5: "연습이 끝났어요. 검사 시작을 누르면 말소리 찾기 검사를 시작합니다.",
  };

  return {
    title: `${moduleLabel}를 시작해요`,
    body: prompts[moduleCode],
    bullets: ["준비가 되면 검사 시작을 눌러 본검사로 들어가세요."],
    primaryLabel: "검사 시작",
    audioText: prompts[moduleCode],
  };
}

export function getAllTestsCompleteCopy() {
  return {
    title: "모든 검사가 끝났어요",
    body: "이제 이번 선별 검사에서 진행한 활동이 모두 끝났습니다.",
    bullets: ["결과 보기 버튼을 눌러 이번 관찰 결과를 확인해 주세요."],
    primaryLabel: "결과 보기",
    audioText:
      "모든 검사가 끝났어요. 결과 보기 버튼을 눌러 이번 관찰 결과를 확인해 주세요.",
  };
}
