"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChildAudioGuidanceControls,
  useChildAudioGuidance,
} from "@/components/child-audio-guidance";
import { ChildStageHeader } from "@/components/child-stage-header";
import { getChildInstructionLine } from "@/lib/child-ui-copy";
import { playFeedbackTone, speakText, wait } from "@/lib/audio-playback";

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
  trainingMasteryThreshold: number;
  familiarizationItems: TrainingPoolItem[];
  practiceItems: SequenceItem[];
  initialPracticeRuns: number;
  initialPracticeFailures: number;
  moduleHref: string;
};

type SequenceModuleRunnerProps = {
  sessionId: string;
  moduleCode: string;
  trainingPool: TrainingPoolItem[];
  items: SequenceItem[];
  initialIndex: number;
  initialResponses: string[];
  initialAssistCount: number;
  nextHref: string;
};

type SequenceTone = "practice" | "test";
const SEQUENCE_DELAY_MS = 1000;

function getToneClasses(seed: string) {
  const tones = [
    "from-rose-100 to-orange-50",
    "from-amber-100 to-yellow-50",
    "from-emerald-100 to-teal-50",
    "from-sky-100 to-cyan-50",
    "from-violet-100 to-fuchsia-50",
    "from-pink-100 to-rose-50",
  ];

  const value = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[value % tones.length];
}

function getSequenceInstructionAudioText(moduleCode: string) {
  return moduleCode === "M3-R"
    ? "말을 잘 듣고, 마지막에 들은 것부터 거꾸로 고르세요"
    : "말을 잘 듣고, 들은 순서대로 고르세요";
}

function getSequenceGuidanceLines(moduleCode: string) {
  return moduleCode === "M3-R"
    ? [
        "단어 듣기를 눌러 마지막에 들은 것부터 골라요",
        "그림을 바꾸고 싶으면 채워진 그림을 눌러요",
        "빈 자리를 다 채우면 선택 완료를 눌러요",
        "주의: 단어 듣기는 한 번만 나와요",
      ]
    : [
        "단어 듣기를 눌러 들은 순서대로 골라요",
        "그림을 바꾸고 싶으면 채워진 그림을 눌러요",
        "빈 자리를 다 채우면 선택 완료를 눌러요",
        "주의: 단어 듣기는 한 번만 나와요",
      ];
}

function getSequencePoolFromItems(items: SequenceItem[], fallbackPool: TrainingPoolItem[]) {
  if (fallbackPool.length > 0) {
    return fallbackPool;
  }

  const entries = new Map<string, TrainingPoolItem>();

  for (const item of items) {
    item.choices.forEach((choice, index) => {
      if (!entries.has(choice)) {
        entries.set(choice, {
          label: choice,
          imageKey: item.choiceImageKeys?.[index],
        });
      }
    });
  }

  return [...entries.values()];
}

function buildRuntimeAttemptPlan(items: SequenceItem[]) {
  const groups = new Map<number, SequenceItem[]>();

  for (const item of items) {
    const level = item.promptSequence?.length ?? 1;
    const current = groups.get(level) ?? [];
    groups.set(level, [...current, item]);
  }

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([level, levelItems]) => {
      const attempts = levelItems.length >= 2 ? levelItems.slice(0, 2) : [levelItems[0], levelItems[0]];

      return attempts.map((item, index) => ({
        item,
        runtimeId: `${item.id}-level-${level}-attempt-${index + 1}`,
        level,
        levelAttempt: (index === 0 ? 1 : 2) as 1 | 2,
      }));
    });
}

async function playSequencePrompt(moduleCode: string, item: SequenceItem) {
  const instructionResult = await speakText(getSequenceInstructionAudioText(moduleCode));

  if (instructionResult.status !== "ended") {
    return { consumed: false, completed: false };
  }

  const sequence =
    item.promptSequence && item.promptSequence.length > 0
      ? item.promptSequence
      : [item.prompt];

  let consumed = false;

  for (const spokenItem of sequence) {
    await wait(SEQUENCE_DELAY_MS);
    const spokenResult = await speakText(spokenItem);

    if (!consumed && spokenResult.status === "ended") {
      consumed = true;
    }

    if (spokenResult.status !== "ended") {
      return { consumed, completed: false };
    }
  }

  return { consumed, completed: true };
}

function SequenceCard({
  label,
  imageKey,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  imageKey?: string;
  onClick?: () => void;
  disabled?: boolean;
  tone: SequenceTone;
}) {
  const toneClasses = getToneClasses(imageKey || label);
  const baseClasses =
    "flex min-h-[5.5rem] w-full items-center gap-3 rounded-[1.1rem] px-4 py-4 text-left transition";
  const toneClassesByMode =
    tone === "test"
      ? "border border-[rgba(58,111,168,0.36)] bg-[rgba(245,250,255,0.98)]"
      : "border border-[rgba(201,111,59,0.3)] bg-[rgba(255,250,245,0.98)]";
  const content = (
    <>
      <div
        aria-hidden="true"
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-gradient-to-br ${toneClasses}`}
      >
        <div className="h-6 w-6 rounded-full bg-white/80" />
        <div className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-white/60" />
      </div>
      <p className="text-base font-semibold text-[var(--foreground)]">{label}</p>
    </>
  );

  if (!onClick) {
    return <div className={`${baseClasses} ${toneClassesByMode}`}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${toneClassesByMode} disabled:opacity-50`}
    >
      {content}
    </button>
  );
}

function AnswerSlots({
  count,
  pool,
  selected,
  onRemove,
  disabled,
  tone,
}: {
  count: number;
  pool: TrainingPoolItem[];
  selected: string[];
  onRemove: (index: number) => void;
  disabled?: boolean;
  tone: SequenceTone;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: count }, (_, index) => {
        const value = selected[index];
        const selectedItem = value
          ? pool.find((item) => item.label === value) ?? { label: value }
          : null;

        return (
          <div
            key={`slot-${index}`}
            className="min-w-[7.25rem] flex-1 basis-[7.25rem] sm:min-w-[8rem] sm:basis-[8rem]"
          >
            {selectedItem ? (
              <SequenceCard
                label={selectedItem.label}
                imageKey={selectedItem.imageKey}
                onClick={() => onRemove(index)}
                disabled={disabled}
                tone={tone}
              />
            ) : (
              <div
                className={`flex min-h-[5.5rem] w-full items-center rounded-[1.1rem] border-2 border-dashed px-4 py-4 text-left text-base font-semibold ${
                  tone === "test"
                    ? "border-[rgba(58,111,168,0.55)] bg-[rgba(58,111,168,0.1)] text-[var(--foreground)]"
                    : "border-[rgba(201,111,59,0.5)] bg-[rgba(201,111,59,0.08)] text-[var(--foreground)]"
                }`}
              >
                빈 자리 {index + 1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChoiceGrid({
  pool,
  selected,
  onSelect,
  disabled,
  tone,
  matched = [],
}: {
  pool: TrainingPoolItem[];
  selected: string[];
  onSelect: (label: string) => void;
  disabled?: boolean;
  tone: SequenceTone;
  matched?: string[];
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {pool.map((choice) => (
        <div
          key={choice.label}
          className="min-w-[7.25rem] flex-1 basis-[7.25rem] sm:min-w-[8rem] sm:basis-[8rem]"
        >
          {selected.includes(choice.label) && matched.length === 0 ? (
            <div
              className={`min-h-[5.5rem] w-full rounded-[1.1rem] border-2 border-dashed ${
                tone === "test"
                  ? "border-[rgba(58,111,168,0.34)] bg-[rgba(58,111,168,0.06)]"
                  : "border-[rgba(201,111,59,0.3)] bg-[rgba(201,111,59,0.05)]"
              }`}
            />
          ) : (
            <SequenceCard
              label={choice.label}
              imageKey={choice.imageKey}
              onClick={() => onSelect(choice.label)}
              disabled={disabled || matched.includes(choice.label)}
              tone={tone}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function SequencePracticeRunner({
  sessionId,
  moduleCode,
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
  const [practicePlayingItemId, setPracticePlayingItemId] = useState("");
  const [practicePlayedItemIds, setPracticePlayedItemIds] = useState<string[]>([]);
  const [practiceRevealedItemIds, setPracticeRevealedItemIds] = useState<string[]>([]);
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
  const practicePlaying = activePracticeItem
    ? practicePlayingItemId === activePracticeItem.id
    : false;
  const practiceHasPlayed = activePracticeItem
    ? practicePlayedItemIds.includes(activePracticeItem.id)
    : false;
  const practiceChoicesVisible = activePracticeItem
    ? practiceRevealedItemIds.includes(activePracticeItem.id)
    : false;
  const practiceInstructionLine =
    moduleCode === "M3-R" ? "말을 잘 듣고 거꾸로 골라요" : "말을 잘 듣고 같은 순서로 골라요";
  const testInstructionLine = getChildInstructionLine(moduleCode);
  const allRecognitionMatched = recognitionMatched.length === familiarizationItems.length;
  const practiceGuidanceLines = getSequenceGuidanceLines(moduleCode);

  function resetPracticePlayback(clearPlayed = false) {
    setPracticePlayingItemId("");
    if (clearPlayed) {
      setPracticePlayedItemIds([]);
      setPracticeRevealedItemIds([]);
    }
  }

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

  async function playPracticeSequence() {
    if (!activePracticeItem || practicePlaying || practiceHasPlayed) {
      return;
    }

    setPracticePlayingItemId(activePracticeItem.id);

    try {
      const result = await playSequencePrompt(moduleCode, activePracticeItem);

      if (result.consumed) {
        setPracticePlayedItemIds((value) =>
          value.includes(activePracticeItem.id) ? value : [...value, activePracticeItem.id],
        );
      }
      if (result.completed) {
        setPracticeRevealedItemIds((value) =>
          value.includes(activePracticeItem.id) ? value : [...value, activePracticeItem.id],
        );
      }
    } finally {
      setPracticePlayingItemId("");
    }
  }

  async function submitPracticeRound() {
    if (
      !practiceItems.every((item) => {
        const selected = practiceSelections[item.id] ?? [];
        return selected.length === (item.promptSequence?.length ?? 1);
      })
    ) {
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
      resetPracticePlayback(true);
    } else {
      setPhase("done");
    }
  }

  const currentPracticeReady = activePracticeItem
    ? (practiceSelections[activePracticeItem.id] ?? []).length ===
      (activePracticeItem.promptSequence?.length ?? 1)
    : false;
  const practiceStepCompleted = currentPracticeReady;
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
      resetPracticePlayback();
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
          <ChoiceGrid
            pool={familiarizationItems}
            selected={[]}
            onSelect={(label) => {
              void playFamiliarizationLabel(label);
            }}
            disabled={Boolean(playingFamiliarizationKey) || familiarizationGuidance.isPlaying}
            tone="practice"
          />
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
          <ChoiceGrid
            pool={familiarizationItems}
            selected={[]}
            onSelect={(label) => {
              void handleRecognitionChoice(label);
            }}
            disabled={recognitionPlaying || recognitionSkipped || !recognitionCurrentTarget}
            matched={recognitionMatched}
            tone="practice"
          />
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
              resetPracticePlayback(true);
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
                  resetPracticePlayback(true);
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
        <article className="space-y-4 rounded-[1.4rem] border border-[rgba(201,111,59,0.22)] bg-[rgba(255,249,244,0.96)] p-4">
          <ChildStageHeader
            stageLabel="연습"
            instructionLine={practiceInstructionLine}
            progressLabel={`${practiceStepIndex + 1}/${practiceItems.length}`}
          />
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 text-sm leading-7 text-[var(--muted)]">
              {practiceGuidanceLines.map((line) => (
                <p
                  key={line}
                  className={line.includes("주의") ? "font-semibold text-amber-800" : undefined}
                >
                  {line}
                </p>
              ))}
            </div>
            <ChildAudioGuidanceControls
              onPlay={playPracticeSequence}
              isPlaying={practicePlaying}
              hasPlayedOnce={practiceHasPlayed}
              primaryLabel="단어 듣기"
              replayLabel="단어 듣기"
              disableAfterPlayed
            />
          </div>

          <AnswerSlots
            count={activePracticeItem.promptSequence?.length ?? 1}
            pool={familiarizationItems}
            selected={practiceSelections[activePracticeItem.id] ?? []}
            onRemove={(index) => removeSelection(activePracticeItem, index)}
            disabled={practicePlaying}
            tone="practice"
          />

          {practiceChoicesVisible ? (
            <ChoiceGrid
              pool={familiarizationItems}
              selected={practiceSelections[activePracticeItem.id] ?? []}
              onSelect={(label) => appendSelection(activePracticeItem, label)}
              disabled={practicePlaying}
              tone="practice"
            />
          ) : (
            <div className="mt-4 rounded-[1.2rem] border border-dashed border-[rgba(201,111,59,0.34)] bg-[rgba(201,111,59,0.05)] px-4 py-5 text-sm leading-7 text-[var(--muted)]">
              단어 듣기를 마치면 고를 그림이 나타나요.
            </div>
          )}

          <button
            type="button"
            onClick={submitPracticeStep}
            disabled={!currentPracticeReady || submitting || practicePlaying}
            className="mt-4 w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "저장 중..." : "선택 완료"}
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
          <ChildStageHeader stageLabel="검사" instructionLine={testInstructionLine} emphasis="strong" />
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
                  resetPracticePlayback(true);
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
  trainingPool,
  items,
  initialIndex,
  initialResponses,
  initialAssistCount,
  nextHref,
}: SequenceModuleRunnerProps) {
  const router = useRouter();
  const runtimePlan = useMemo(() => buildRuntimeAttemptPlan(items), [items]);
  const normalizedInitialIndex = Math.min(initialIndex, Math.max(runtimePlan.length - 1, 0));
  const [currentIndex, setCurrentIndex] = useState(normalizedInitialIndex);
  const [responses, setResponses] = useState(() => runtimePlan.map((_, index) => initialResponses[index] ?? ""));
  const [assistCount] = useState(initialAssistCount);
  const [currentSelection, setCurrentSelection] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [playingItemId, setPlayingItemId] = useState("");
  const [playedItemIds, setPlayedItemIds] = useState<string[]>([]);
  const [revealedItemIds, setRevealedItemIds] = useState<string[]>([]);
  const currentAttempt = runtimePlan[currentIndex];
  const currentItem = currentAttempt?.item;
  const isResume = initialIndex > 0 || initialResponses.length > 0;
  const testInstructionLine = getChildInstructionLine(moduleCode);
  const testGuidanceLines = getSequenceGuidanceLines(moduleCode);
  const choicePool = useMemo(
    () => getSequencePoolFromItems(items, trainingPool),
    [items, trainingPool],
  );

  const currentProgress = useMemo(
    () => `${Math.min(currentIndex + 1, runtimePlan.length)}/${runtimePlan.length}`,
    [currentIndex, runtimePlan.length],
  );
  const currentSlotCount = currentItem?.promptSequence?.length ?? 1;
  const testPlaying = currentAttempt ? playingItemId === currentAttempt.runtimeId : false;
  const testHasPlayedOnce = currentAttempt ? playedItemIds.includes(currentAttempt.runtimeId) : false;
  const testChoicesVisible = currentAttempt ? revealedItemIds.includes(currentAttempt.runtimeId) : false;
  const currentLevelAttempts = currentAttempt
    ? runtimePlan.filter((attempt) => attempt.level === currentAttempt.level)
    : [];
  const currentLevelStartIndex = currentLevelAttempts.length > 0
    ? runtimePlan.findIndex((attempt) => attempt.runtimeId === currentLevelAttempts[0]?.runtimeId)
    : currentIndex;

  function appendSelection(choice: string) {
    if (!currentItem) {
      return;
    }

    if (currentSelection.length > currentSlotCount) {
      setCurrentSelection((value) => value.slice(0, currentSlotCount));
      return;
    }

    if (currentSelection.includes(choice) || currentSelection.length >= currentSlotCount) {
      return;
    }

    setCurrentSelection((value) => [...value, choice]);
  }

  function removeSelection(index: number) {
    setCurrentSelection((value) => value.filter((_, slotIndex) => slotIndex !== index));
  }

  async function playTestSequence() {
    if (!currentItem || !currentAttempt || testPlaying || testHasPlayedOnce) {
      return;
    }

    setPlayingItemId(currentAttempt.runtimeId);

    try {
      const result = await playSequencePrompt(moduleCode, currentItem);

      if (result.consumed) {
        setPlayedItemIds((value) =>
          value.includes(currentAttempt.runtimeId) ? value : [...value, currentAttempt.runtimeId],
        );
      }
      if (result.completed) {
        setRevealedItemIds((value) =>
          value.includes(currentAttempt.runtimeId) ? value : [...value, currentAttempt.runtimeId],
        );
      }
    } finally {
      setPlayingItemId("");
    }
  }

  async function submitCurrentAnswer() {
    if (!currentItem) {
      return;
    }

    if (currentSelection.length !== currentSlotCount) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    const updatedResponses = [...responses];
    updatedResponses[currentIndex] = currentSelection.join(", ");

    const correctCount = updatedResponses.filter(
      (response, index) => response === runtimePlan[index]?.item.correctAnswer,
    ).length;

    const currentLevelResponses = currentLevelAttempts.map((attempt) => {
      const responseIndex = runtimePlan.findIndex(
        (planAttempt) => planAttempt.runtimeId === attempt.runtimeId,
      );

      return {
        attempt,
        response: updatedResponses[responseIndex] ?? "",
        correct: (updatedResponses[responseIndex] ?? "") === attempt.item.correctAnswer,
      };
    });
    const completedLevelResponses = currentLevelResponses.filter((entry) => entry.response);
    const hasSecondAttemptAtLevel = currentLevelAttempts.length >= 2;

    if (!hasSecondAttemptAtLevel) {
      setSaving(false);
      setErrorMessage("현재 단계 구성에 문제가 있어 두 번째 문항을 준비하지 못했습니다.");
      return;
    }

    const payloadBase = {
      correctCount,
      itemCount: runtimePlan.length,
      responseLog: JSON.stringify(updatedResponses),
      caregiverAssistCount: assistCount,
    };

    const bothIncorrectAtLevel =
      completedLevelResponses.length === 2 &&
      completedLevelResponses.every((entry) => !entry.correct);
    const levelFullyAttempted = completedLevelResponses.length === 2;
    const currentLevelEndsModule =
      currentLevelAttempts[currentLevelAttempts.length - 1]?.runtimeId ===
      runtimePlan[runtimePlan.length - 1]?.runtimeId;
    const shouldComplete =
      bothIncorrectAtLevel || (levelFullyAttempted && currentLevelEndsModule);

    const nextIndex = levelFullyAttempted
      ? currentLevelStartIndex + currentLevelAttempts.length
      : currentIndex + 1;

    const response = await fetch(`/api/session/${sessionId}/module/${moduleCode}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        shouldComplete
          ? {
              type: "complete",
              ...payloadBase,
            }
          : {
              type: "progress",
              lastItemIndex: nextIndex,
              ...payloadBase,
            },
      ),
    });

    if (!response.ok) {
      setSaving(false);
      setErrorMessage("문항 결과를 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    if (shouldComplete) {
      router.push(nextHref);
      router.refresh();
      return;
    }

    setResponses(updatedResponses);
    setCurrentSelection([]);
    setCurrentIndex(nextIndex);
    setSaving(false);
    router.refresh();
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
        emphasis="strong"
        tone="cool"
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

      <article className="rounded-[1.4rem] border border-[rgba(58,111,168,0.42)] bg-[rgba(240,248,255,0.98)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--accent-strong)]">문항 {currentIndex + 1}</p>
            <div className="space-y-1 text-sm leading-7 text-[var(--muted)]">
              {testGuidanceLines.map((line) => (
                <p
                  key={line}
                  className={line.includes("주의") ? "font-semibold text-[var(--accent-strong)]" : undefined}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
          <ChildAudioGuidanceControls
            onPlay={playTestSequence}
            isPlaying={testPlaying}
            hasPlayedOnce={testHasPlayedOnce}
            primaryLabel="단어 듣기"
            replayLabel="단어 듣기"
            disableAfterPlayed
          />
        </div>

        <div className="mt-4">
          <AnswerSlots
            count={currentSlotCount}
            pool={choicePool}
            selected={currentSelection}
            onRemove={removeSelection}
            disabled={testPlaying || saving}
            tone="test"
          />
        </div>

        {testChoicesVisible ? (
          <ChoiceGrid
            pool={choicePool}
            selected={currentSelection}
            onSelect={appendSelection}
            disabled={testPlaying || saving}
            tone="test"
          />
        ) : (
          <div className="mt-4 rounded-[1.2rem] border border-dashed border-[rgba(58,111,168,0.38)] bg-[rgba(58,111,168,0.06)] px-4 py-5 text-sm leading-7 text-[var(--muted)]">
            단어 듣기를 마치면 고를 그림이 나타나요.
          </div>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              void submitCurrentAnswer();
            }}
            disabled={saving || currentSelection.length !== currentSlotCount}
            className="w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "저장 중..." : "선택 완료"}
          </button>
        </div>
      </article>
    </div>
  );
}
