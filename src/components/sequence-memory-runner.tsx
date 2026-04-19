"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChildAudioGuidanceControls,
  useChildAudioGuidance,
} from "@/components/child-audio-guidance";
import { ChildChoiceCard } from "@/components/child-choice-card";
import { ChildStageHeader } from "@/components/child-stage-header";
import { getChildInstructionLine } from "@/lib/child-ui-copy";
import { playFeedbackTone, speakText } from "@/lib/audio-playback";

type TrainingPoolItem = {
  label: string;
  imageKey?: string;
};

type SequenceItem = {
  id: string;
  prompt: string;
  promptSequence?: string[];
  choices: string[];
  choiceImageKeys?: string[];
  correctAnswer: string;
};

type SequencePracticeRunnerProps = {
  sessionId: string;
  moduleCode: string;
  instructionText: string;
  instructionAudio?: string | null;
  visibleChoiceCount: number;
  trainingMasteryThreshold: number;
  familiarizationItems: TrainingPoolItem[];
  recognitionItems: SequenceItem[];
  practiceItems: SequenceItem[];
  initialPracticeRuns: number;
  initialPracticeFailures: number;
  moduleHref: string;
};

type SequenceModuleRunnerProps = {
  sessionId: string;
  moduleCode: string;
  instructionText: string;
  instructionAudio?: string | null;
  visibleChoiceCount: number;
  items: SequenceItem[];
  initialIndex: number;
  initialResponses: string[];
  initialAssistCount: number;
  nextHref: string;
};

function buildTargetText(item: SequenceItem) {
  if ((item.promptSequence?.length ?? 0) > 0) {
    return item.promptSequence?.join(", ") ?? item.prompt;
  }

  return item.prompt;
}

function AnswerSlots({
  count,
  selected,
  onRemove,
  disabled,
}: {
  count: number;
  selected: string[];
  onRemove: (index: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Array.from({ length: count }, (_, index) => {
        const value = selected[index];

        return (
          <button
            key={index}
            type="button"
            onClick={() => value && onRemove(index)}
            disabled={disabled || !value}
            className={`rounded-[1rem] border px-3 py-3 text-left text-sm ${
              value
                ? "border-[var(--accent-strong)] bg-[rgba(201,111,59,0.12)] text-[var(--foreground)]"
                : "border-dashed border-[var(--line)] bg-white text-[var(--muted)]"
            } disabled:opacity-50`}
          >
            {value || `빈 자리 ${index + 1}`}
          </button>
        );
      })}
    </div>
  );
}

export function SequencePracticeRunner({
  sessionId,
  moduleCode,
  instructionText,
  instructionAudio,
  visibleChoiceCount,
  trainingMasteryThreshold,
  familiarizationItems,
  practiceItems,
  initialPracticeRuns,
  initialPracticeFailures,
  moduleHref,
}: SequencePracticeRunnerProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"familiarization" | "recognition" | "practice" | "done">(
    "familiarization",
  );
  const [recognitionMatched, setRecognitionMatched] = useState<string[]>([]);
  const [recognitionWrongCount, setRecognitionWrongCount] = useState(0);
  const [recognitionCursor, setRecognitionCursor] = useState(0);
  const [recognitionCurrentTarget, setRecognitionCurrentTarget] = useState("");
  const [recognitionPlaying, setRecognitionPlaying] = useState(false);
  const [recognitionHasPlayed, setRecognitionHasPlayed] = useState(false);
  const [recognitionSkipped, setRecognitionSkipped] = useState(false);
  const [practiceSelections, setPracticeSelections] = useState<Record<string, string[]>>({});
  const [practiceStepIndex, setPracticeStepIndex] = useState(0);
  const [practiceRuns, setPracticeRuns] = useState(initialPracticeRuns);
  const [practiceFailures, setPracticeFailures] = useState(initialPracticeFailures);
  const [roundState, setRoundState] = useState<"idle" | "passed" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [playingFamiliarizationKey, setPlayingFamiliarizationKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const familiarizationGuidance = useChildAudioGuidance({
    instructionText: "그림 카드를 눌러 단어를 듣고 익혀요.",
    autoplayKey: `${moduleCode}-familiarization`,
  });

  const activePracticeItem = practiceItems[practiceStepIndex] ?? null;
  const practiceGuidance = useChildAudioGuidance({
    instructionText,
    instructionAudio,
    stimulusText: activePracticeItem ? buildTargetText(activePracticeItem) : undefined,
    autoplayKey: activePracticeItem ? `${moduleCode}-${activePracticeItem.id}` : `${moduleCode}-practice`,
  });

  async function playFamiliarizationLabel(label: string) {
    const playbackKey = `fam-${label}`;
    if (playingFamiliarizationKey || familiarizationGuidance.isPlaying) {
      return;
    }

    setPlayingFamiliarizationKey(playbackKey);
    try {
      await speakText(label);
    } finally {
      setPlayingFamiliarizationKey("");
    }
  }

  function getNextRecognitionTarget() {
    const remaining = familiarizationItems.filter((item) => !recognitionMatched.includes(item.label));

    if (remaining.length === 0) {
      return "";
    }

    const nextTarget = remaining[recognitionCursor % remaining.length];
    setRecognitionCursor((value) => value + 1);
    return nextTarget?.label ?? "";
  }

  async function playRecognitionWord() {
    if (recognitionPlaying) {
      return;
    }

    const nextTarget = getNextRecognitionTarget();

    if (!nextTarget) {
      setRecognitionCurrentTarget("");
      return;
    }

    setRecognitionPlaying(true);
    setRecognitionHasPlayed(true);
    setRecognitionCurrentTarget(nextTarget);

    try {
      await speakText(nextTarget);
    } finally {
      setRecognitionPlaying(false);
    }
  }

  async function handleRecognitionChoice(choice: string) {
    if (!recognitionCurrentTarget || recognitionPlaying || recognitionSkipped) {
      return;
    }

    if (choice === recognitionCurrentTarget) {
      setRecognitionMatched((value) =>
        value.includes(choice) ? value : [...value, choice],
      );
      setRecognitionCurrentTarget("");
      await playFeedbackTone("correct");
      return;
    }

    const nextWrongCount = recognitionWrongCount + 1;
    setRecognitionWrongCount(nextWrongCount);
    await playFeedbackTone("incorrect");

    if (nextWrongCount >= 7) {
      setRecognitionSkipped(true);
      setRecognitionCurrentTarget("");
    }
  }

  function appendSelection(item: SequenceItem, choice: string) {
    const slotCount = item.promptSequence?.length ?? 1;
    const current = practiceSelections[item.id] ?? [];

    if (current.includes(choice) || current.length >= slotCount) {
      return;
    }

    setPracticeSelections((value) => ({
      ...value,
      [item.id]: [...current, choice],
    }));
  }

  function removeSelection(item: SequenceItem, index: number) {
    const current = practiceSelections[item.id] ?? [];
    setPracticeSelections((value) => ({
      ...value,
      [item.id]: current.filter((_, slotIndex) => slotIndex !== index),
    }));
  }

  async function submitPracticeRound() {
    if (!practiceItems.every((item) => {
      const selected = practiceSelections[item.id] ?? [];
      return selected.length === (item.promptSequence?.length ?? 1);
    })) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const recognitionCorrect = recognitionMatched.length;
    const practiceCorrect = practiceItems.filter((item) => {
      const selected = practiceSelections[item.id] ?? [];
      return selected.join(", ") === item.correctAnswer;
    }).length;
    const total = familiarizationItems.length + practiceItems.length;
    const mastery = total > 0 ? (recognitionCorrect + practiceCorrect) / total : 0;
    const passed = mastery >= trainingMasteryThreshold;
    const nextRuns = practiceRuns + 1;
    const nextFailures = passed ? practiceFailures : practiceFailures + 1;

    const response = await fetch(`/api/session/${sessionId}/module/${moduleCode}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "practice",
        practiceRuns: nextRuns,
        practiceFailures: nextFailures,
        passed,
        familiarizationCompleted: true,
        trainingMasteryResult: passed ? "met" : "low",
      }),
    });

    if (!response.ok) {
      setSubmitting(false);
      setErrorMessage("연습 결과를 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    setPracticeRuns(nextRuns);
    setPracticeFailures(nextFailures);
    setRoundState(passed ? "passed" : "failed");
    setSubmitting(false);

    if (passed) {
      setPhase("done");
      return;
    }

    if (nextFailures < 2) {
      setPhase("recognition");
      setRecognitionMatched([]);
      setRecognitionWrongCount(0);
      setRecognitionCursor(0);
      setRecognitionCurrentTarget("");
      setRecognitionPlaying(false);
      setRecognitionHasPlayed(false);
      setRecognitionSkipped(false);
      setPracticeSelections({});
    } else {
      setPhase("done");
    }
  }
  const currentPracticeReady = activePracticeItem
    ? (practiceSelections[activePracticeItem.id] ?? []).length ===
      (activePracticeItem.promptSequence?.length ?? 1)
    : false;
  const practiceStepCompleted = activePracticeItem
    ? (practiceSelections[activePracticeItem.id] ?? []).length ===
      (activePracticeItem.promptSequence?.length ?? 1)
    : false;
  const allPracticeCompleted = practiceItems.every(
    (item) => (practiceSelections[item.id] ?? []).length === (item.promptSequence?.length ?? 1),
  );
  const readyForTest = phase === "done" && roundState === "passed";
  const hasPracticeStateMismatch =
    phase === "practice" && (!activePracticeItem || practiceStepIndex >= practiceItems.length);
  const practiceInstructionLine =
    moduleCode === "M3-R" ? "말을 잘 듣고 거꾸로 골라요" : "말을 잘 듣고 같은 순서로 골라요";
  const testInstructionLine = getChildInstructionLine(moduleCode);
  const allRecognitionMatched = recognitionMatched.length === familiarizationItems.length;

  function submitPracticeStep() {
    if (!activePracticeItem || !currentPracticeReady || submitting) {
      return;
    }

    if (practiceStepIndex < practiceItems.length - 1) {
      setPracticeStepIndex((value) => value + 1);
      return;
    }

    void submitPracticeRound();
  }

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      {phase === "familiarization" ? (
        <article className="space-y-4 rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
          <ChildStageHeader
            stageLabel="사전 학습 단계"
            instructionLine="그림을 누르면 말이 나와요"
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm leading-7 text-[var(--muted)]">
                검사에 나오는 단어를 먼저 익히는 단계예요
              </p>
            </div>
            <ChildAudioGuidanceControls
              onPlay={familiarizationGuidance.playGuidance}
              isPlaying={familiarizationGuidance.isPlaying}
              hasPlayedOnce={familiarizationGuidance.hasPlayedOnce}
              primaryLabel="안내 음성 듣기"
              replayLabel="안내 음성 듣기"
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {familiarizationItems.map((item) => (
              <ChildChoiceCard
                key={item.label}
                label={item.label}
                imageKey={item.imageKey}
                onClick={() => {
                  void playFamiliarizationLabel(item.label);
                }}
                disabled={Boolean(playingFamiliarizationKey) || familiarizationGuidance.isPlaying}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPhase("recognition")}
            className="mt-4 w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white"
          >
            다음으로 이동
          </button>
        </article>
      ) : null}

      {phase === "recognition" ? (
        <article className="space-y-4 rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
          <ChildStageHeader
            stageLabel="사전 학습 확인"
            instructionLine="말을 듣고 같은 그림을 골라요"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 text-sm leading-7 text-[var(--muted)]">
              <p>1)단어 듣기 버튼을 누르면 말이 나옵니다.</p>
              <p>2)누를 때마다 다른 단어가 나옵니다.</p>
              <p>3)단어들을 다 들으면 연습 단계로 이동 버튼을 누릅니다.</p>
            </div>
            <ChildAudioGuidanceControls
              onPlay={playRecognitionWord}
              isPlaying={recognitionPlaying}
              hasPlayedOnce={recognitionHasPlayed}
              primaryLabel="단어 듣기"
              replayLabel="단어 듣기"
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {familiarizationItems.map((choice) => (
              <ChildChoiceCard
                key={choice.label}
                label={choice.label}
                imageKey={choice.imageKey}
                onClick={() => {
                  void handleRecognitionChoice(choice.label);
                }}
                selected={recognitionMatched.includes(choice.label)}
                disabled={
                  recognitionPlaying ||
                  recognitionSkipped ||
                  !recognitionCurrentTarget ||
                  recognitionMatched.includes(choice.label)
                }
              />
            ))}
          </div>
          {recognitionWrongCount > 0 ? (
            <p className="text-xs leading-6 text-[var(--muted)]">
              틀린 횟수: {recognitionWrongCount}
            </p>
          ) : null}
          {recognitionSkipped ? (
            <p className="text-xs leading-6 text-amber-800">
              틀린 횟수가 7번 이상이어서 이 확인 단계는 건너뜁니다.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setPracticeStepIndex(0);
              setPhase("practice");
            }}
            disabled={!allRecognitionMatched && !recognitionSkipped}
            className="mt-4 w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            연습 단계로 이동
          </button>
        </article>
      ) : null}

      {hasPracticeStateMismatch ? (
        <article className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          연습 단계 상태를 다시 확인하고 있습니다. 아래 버튼으로 안전하게 이어갈 수 있습니다.
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {allPracticeCompleted ? (
              <button
                type="button"
                onClick={() => {
                  setPhase("done");
                  setRoundState("passed");
                }}
                className="flex-1 rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white"
              >
                본검사 시작 화면으로 복구
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPracticeStepIndex(0);
                  setPhase("practice");
                }}
                className="flex-1 rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold"
              >
                연습 처음부터 다시 확인
              </button>
            )}
          </div>
        </article>
      ) : null}

      {phase === "practice" && activePracticeItem ? (
        <article className="space-y-4 rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
          <ChildStageHeader
            stageLabel="연습"
            instructionLine={practiceInstructionLine}
            progressLabel={`${practiceStepIndex + 1}/${practiceItems.length}`}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm leading-7 text-[var(--muted)]">
              {moduleCode === "M3-R"
                ? "마지막에 들은 말을 먼저 골라요."
                : "말을 들은 순서대로 자리를 채워요."}
            </p>
            <ChildAudioGuidanceControls
              onPlay={practiceGuidance.playGuidance}
              isPlaying={practiceGuidance.isPlaying}
              hasPlayedOnce={practiceGuidance.hasPlayedOnce}
            />
          </div>

          <div className="mt-4">
            <AnswerSlots
              count={activePracticeItem.promptSequence?.length ?? 1}
              selected={practiceSelections[activePracticeItem.id] ?? []}
              onRemove={(index) => removeSelection(activePracticeItem, index)}
              disabled={practiceGuidance.isPlaying}
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {activePracticeItem.choices.slice(0, visibleChoiceCount).map((choice, index) => (
              <ChildChoiceCard
                key={choice}
                label={choice}
                imageKey={activePracticeItem.choiceImageKeys?.[index]}
                onClick={() => appendSelection(activePracticeItem, choice)}
                selected={(practiceSelections[activePracticeItem.id] ?? []).includes(choice)}
                disabled={practiceGuidance.isPlaying}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={submitPracticeStep}
            disabled={!currentPracticeReady || submitting || practiceGuidance.isPlaying}
            className="mt-4 w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting
              ? "저장 중..."
              : practiceStepIndex === practiceItems.length - 1
                ? "선택 완료"
                : "선택 완료"}
          </button>
          <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
            {practiceStepCompleted
              ? practiceStepIndex === practiceItems.length - 1
                ? "마지막 연습 선택이 준비되었습니다. 선택 완료를 누르면 연습이 끝납니다."
                : "현재 연습 선택이 준비되었습니다. 선택 완료를 누르면 다음 연습으로 이동합니다."
              : "빈 자리를 모두 채우면 선택 완료 버튼이 활성화됩니다."}
          </p>
        </article>
      ) : null}

      {phase === "done" ? (
        <div className="space-y-4">
          <ChildStageHeader
            stageLabel="검사"
            instructionLine={testInstructionLine}
          />
          {roundState === "failed" ? (
            <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
              먼저 들어보기 또는 연습에서 아직 어려움이 보였습니다.
              {practiceFailures >= 2
                ? " 반복 어려움으로 내부 품질 플래그가 기록되며, 보호자는 본 과제로 계속 진행할 수 있습니다."
                : " 같은 방식으로 한 번 더 연습해 볼 수 있습니다."}
            </div>
          ) : (
            <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
              연습 단계가 끝났습니다. 아래 버튼을 눌러 본검사를 시작하세요.
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {roundState === "failed" && practiceFailures < 2 ? (
              <button
                type="button"
                onClick={() => {
                  setPhase("recognition");
                  setRecognitionMatched([]);
                  setRecognitionWrongCount(0);
                  setRecognitionCursor(0);
                  setRecognitionCurrentTarget("");
                  setRecognitionPlaying(false);
                  setRecognitionHasPlayed(false);
                  setRecognitionSkipped(false);
                  setPracticeSelections({});
                  setPracticeStepIndex(0);
                  setRoundState("idle");
                  router.refresh();
                }}
                className="flex-1 rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold"
              >
                다시 연습
              </button>
            ) : null}

            <Link
              href={moduleHref}
              className={`flex-1 rounded-[1.2rem] px-4 py-3 text-center text-sm font-semibold text-white ${
                readyForTest || practiceFailures >= 2
                  ? "bg-[var(--accent-strong)]"
                  : "bg-slate-300"
              }`}
            >
              본검사 시작
            </Link>
          </div>
          {!readyForTest && roundState === "passed" ? (
            <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
              연습은 완료되었지만 본검사 진입 상태를 다시 확인하고 있습니다. 버튼이 반응하지 않으면 페이지를 새로고침한 뒤 다시 시도해 주세요.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SequenceModuleRunner({
  sessionId,
  moduleCode,
  instructionText,
  instructionAudio,
  visibleChoiceCount,
  items,
  initialIndex,
  initialResponses,
  initialAssistCount,
  nextHref,
}: SequenceModuleRunnerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [responses, setResponses] = useState(initialResponses);
  const [assistCount, setAssistCount] = useState(initialAssistCount);
  const [currentSelection, setCurrentSelection] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const currentItem = items[currentIndex];
  const isResume = initialIndex > 0 || initialResponses.length > 0;
  const testInstructionLine = getChildInstructionLine(moduleCode);
  const guidance = useChildAudioGuidance({
    instructionText,
    instructionAudio,
    stimulusText: currentItem ? buildTargetText(currentItem) : undefined,
    autoplayKey: currentItem ? `${moduleCode}-${currentItem.id}` : `${moduleCode}-complete`,
  });

  const currentProgress = useMemo(
    () => `${Math.min(currentIndex + 1, items.length)}/${items.length}`,
    [currentIndex, items.length],
  );

  function appendSelection(choice: string) {
    if (!currentItem) {
      return;
    }

    const slotCount = currentItem.promptSequence?.length ?? 1;
    if (currentSelection.includes(choice) || currentSelection.length >= slotCount) {
      return;
    }

    setCurrentSelection((value) => [...value, choice]);
  }

  function removeSelection(index: number) {
    setCurrentSelection((value) => value.filter((_, slotIndex) => slotIndex !== index));
  }

  async function submitCurrentAnswer() {
    if (!currentItem) {
      return;
    }

    const slotCount = currentItem.promptSequence?.length ?? 1;
    if (currentSelection.length !== slotCount) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    const updatedResponses = [...responses];
    updatedResponses[currentIndex] = currentSelection.join(", ");

    const correctCount = updatedResponses.filter(
      (response, index) => response === items[index]?.correctAnswer,
    ).length;

    const payloadBase = {
      correctCount,
      itemCount: items.length,
      responseLog: JSON.stringify(updatedResponses),
      caregiverAssistCount: assistCount,
    };

    const isLast = currentIndex === items.length - 1;
    const response = await fetch(`/api/session/${sessionId}/module/${moduleCode}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        isLast
          ? {
              type: "complete",
              ...payloadBase,
            }
          : {
              type: "progress",
              lastItemIndex: currentIndex + 1,
              ...payloadBase,
            },
      ),
    });

    if (!response.ok) {
      setSaving(false);
      setErrorMessage("문항 결과를 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    if (isLast) {
      router.push(nextHref);
      router.refresh();
      return;
    }

    setResponses(updatedResponses);
    setCurrentSelection([]);
    setCurrentIndex((value) => value + 1);
    setSaving(false);
    router.refresh();
  }

  async function recordAssist() {
    const nextAssistCount = assistCount + 1;
    setAssistCount(nextAssistCount);

    const response = await fetch(`/api/session/${sessionId}/module/${moduleCode}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "assist",
        caregiverAssistCount: nextAssistCount,
      }),
    });

    if (!response.ok) {
      setAssistCount((value) => Math.max(0, value - 1));
      setErrorMessage("보호자 도움 기록을 저장하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  if (!currentItem) {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-5">
          <p className="text-sm leading-7 text-[var(--muted)]">
            이 모듈은 이미 완료되어 다음 단계로 이동할 수 있습니다.
          </p>
        </div>
        <Link
          href={nextHref}
          className="block rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-center text-sm font-semibold text-white"
        >
          다음 단계로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChildStageHeader
        stageLabel="검사"
        instructionLine={testInstructionLine}
        progressLabel={currentProgress}
      />
      {isResume ? (
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/85 p-4 text-sm leading-6 text-[var(--accent-strong)]">
          이어서 할 수 있어요.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">문항 {currentIndex + 1}</p>
          <ChildAudioGuidanceControls
            onPlay={guidance.playGuidance}
            isPlaying={guidance.isPlaying}
            hasPlayedOnce={guidance.hasPlayedOnce}
          />
        </div>

        <div className="mt-4">
          <AnswerSlots
            count={currentItem.promptSequence?.length ?? 1}
            selected={currentSelection}
            onRemove={removeSelection}
            disabled={guidance.isPlaying || saving}
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {currentItem.choices.slice(0, visibleChoiceCount).map((choice, index) => (
            <ChildChoiceCard
              key={choice}
              label={choice}
              imageKey={currentItem.choiceImageKeys?.[index]}
              onClick={() => appendSelection(choice)}
              selected={currentSelection.includes(choice)}
              disabled={guidance.isPlaying || saving}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              void submitCurrentAnswer();
            }}
            disabled={
              saving ||
              currentSelection.length !== (currentItem.promptSequence?.length ?? 1)
            }
            className="flex-1 rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "저장 중..." : "현재 문항 저장"}
          </button>

          <button
            type="button"
            onClick={() => {
              void recordAssist();
            }}
            className="flex-1 rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold"
          >
            보호자 도움 기록
          </button>
        </div>
      </article>
    </div>
  );
}
