"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChildAudioGuidanceControls,
  useChildAudioGuidance,
} from "@/components/child-audio-guidance";
import { speakText } from "@/lib/audio-playback";

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
  title: string;
  instructions: string;
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

function SequenceChoiceCard({
  label,
  imageKey,
  onClick,
  disabled,
  selected,
}: {
  label: string;
  imageKey?: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[1rem] border px-3 py-3 text-left transition disabled:opacity-50 ${
        selected
          ? "border-[var(--accent-strong)] bg-[rgba(201,111,59,0.12)]"
          : "border-[var(--line)] bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[0.9rem] bg-[var(--card-strong)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          {imageKey ? imageKey.slice(0, 3) : "IMG"}
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
          <p className="text-xs text-[var(--muted)]">image + text choice</p>
        </div>
      </div>
    </button>
  );
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
  recognitionItems,
  practiceItems,
  initialPracticeRuns,
  initialPracticeFailures,
  moduleHref,
}: SequencePracticeRunnerProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"familiarization" | "recognition" | "practice" | "done">(
    "familiarization",
  );
  const [recognitionAnswer, setRecognitionAnswer] = useState("");
  const [practiceSelections, setPracticeSelections] = useState<Record<string, string[]>>({});
  const [practiceStepIndex, setPracticeStepIndex] = useState(0);
  const [practiceRuns, setPracticeRuns] = useState(initialPracticeRuns);
  const [practiceFailures, setPracticeFailures] = useState(initialPracticeFailures);
  const [roundState, setRoundState] = useState<"idle" | "passed" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [playingFamiliarizationKey, setPlayingFamiliarizationKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const familiarizationGuidance = useChildAudioGuidance({
    instructionText: "카드를 눌러 단어를 듣고 익혀요.",
    autoplayKey: `${moduleCode}-familiarization`,
  });

  const activePracticeItem = practiceItems[practiceStepIndex] ?? null;
  const recognitionItem = recognitionItems[0];
  const recognitionGuidance = useChildAudioGuidance({
    instructionText: "들은 단어와 같은 카드를 골라요.",
    stimulusText: recognitionItem ? buildTargetText(recognitionItem) : undefined,
    autoplayKey: recognitionItem ? `${moduleCode}-${recognitionItem.id}` : `${moduleCode}-recognition`,
  });
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
    if (!recognitionItems[0] || !practiceItems.every((item) => {
      const selected = practiceSelections[item.id] ?? [];
      return selected.length === (item.promptSequence?.length ?? 1);
    })) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const recognitionCorrect = recognitionAnswer === recognitionItems[0].correctAnswer ? 1 : 0;
    const practiceCorrect = practiceItems.filter((item) => {
      const selected = practiceSelections[item.id] ?? [];
      return selected.join(", ") === item.correctAnswer;
    }).length;
    const total = recognitionItems.length + practiceItems.length;
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
      setRecognitionAnswer("");
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
      <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
        <p className="text-sm leading-7 text-[var(--muted)]">{instructionText}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Visible choices: {visibleChoiceCount}. Familiarization and practice are internal prototype training only.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      {phase === "familiarization" ? (
        <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">친숙화</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                아래 7개 단어를 그림과 글자로 먼저 익힙니다. 각 카드를 눌러 단어를 들을 수 있습니다.
              </p>
            </div>
            <ChildAudioGuidanceControls
              onPlay={familiarizationGuidance.playGuidance}
              isPlaying={familiarizationGuidance.isPlaying}
              hasPlayedOnce={familiarizationGuidance.hasPlayedOnce}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {familiarizationItems.map((item) => (
              <SequenceChoiceCard
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
            친숙화 완료 후 확인 단계로 이동
          </button>
        </article>
      ) : null}

      {phase === "recognition" && recognitionItem ? (
        <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">친숙화 확인</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                들은 단어와 같은 카드를 골라 주세요.
              </p>
            </div>
            <ChildAudioGuidanceControls
              onPlay={recognitionGuidance.playGuidance}
              isPlaying={recognitionGuidance.isPlaying}
              hasPlayedOnce={recognitionGuidance.hasPlayedOnce}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {recognitionItem.choices.slice(0, visibleChoiceCount).map((choice, index) => (
              <SequenceChoiceCard
                key={choice}
                label={choice}
                imageKey={recognitionItem.choiceImageKeys?.[index]}
                onClick={() => setRecognitionAnswer(choice)}
                selected={recognitionAnswer === choice}
                disabled={recognitionGuidance.isPlaying}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setPracticeStepIndex(0);
              setPhase("practice");
            }}
            disabled={!recognitionAnswer}
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
        <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                연습 {practiceStepIndex + 1}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                지시를 듣고 같은 순서로 빈 자리를 채워 주세요.
              </p>
            </div>
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
              <SequenceChoiceCard
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
          {roundState === "failed" ? (
            <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
              친숙화 또는 연습에서 아직 어려움이 보였습니다.
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
                  setRecognitionAnswer("");
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
  title,
  instructions,
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
      <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              {title}
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{instructions}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Visible choices: {visibleChoiceCount}
            </p>
          </div>
          <span className="rounded-full bg-[rgba(201,111,59,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
            {currentProgress}
          </span>
        </div>
        {isResume ? (
          <p className="mt-3 text-sm leading-6 text-[var(--accent-strong)]">
            이전 중단 지점부터 이어서 진행합니다.
          </p>
        ) : null}
      </div>

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
            <SequenceChoiceCard
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
