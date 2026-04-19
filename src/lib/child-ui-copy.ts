export type ChildStageLabel =
  | "오디오 확인"
  | "볼륨 조정 단계"
  | "먼저 들어보기"
  | "사전 학습 단계"
  | "사전 학습 확인"
  | "연습"
  | "검사";

export function getChildInstructionLine(moduleCode: string) {
  switch (moduleCode) {
    case "M1":
      return "잘 듣고 같은 소리를 골라요";
    case "M2":
      return "시끌시끌한 소리 속에서 들린 말을 골라요";
    case "M3":
      return "말을 잘 듣고 같은 순서로 골라요";
    case "M3-R":
      return "말을 잘 듣고 거꾸로 골라요";
    case "M4":
      return "소리를 듣고 같은 모양을 골라요";
    case "M5":
      return "처음 소리가 다른 하나를 골라요";
    default:
      return "잘 듣고 맞는 것을 골라요";
  }
}
