"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChildAudioGuidanceControls,
  useChildAudioGuidance,
} from "@/components/child-audio-guidance";
import { ChildStageHeader } from "@/components/child-stage-header";
import { playPattern, speakText, wait } from "@/lib/audio-playback";
import { getChildInstructionLine } from "@/lib/child-ui-copy";

type PracticeItem = {
  id: string;
  prompt: string;
  choices: string[];
  correctAnswer: string;
  promptSequence?: string[];
};

type PracticeRunnerProps = {
  sessionId: string;
  moduleCode: string;
  playbackType: "tts" | "pattern";
  instructions: string;
  instructionText?: string;
  instructionAudio?: string | null;
  items: PracticeItem[];
  trainingMasteryThreshold?: number;
  initialPracticeRuns: number;
  initialPracticeFailures: number;
  moduleHref: string;
};

export function PracticeRunner({
  sessionId,
  moduleCode,
  playbackType,
  instructions,
  instructionText,
  instructionAudio,
  items,
  trainingMasteryThreshold = 0.5,
  initialPracticeRuns,
  initialPracticeFailures,
  moduleHref,
}: PracticeRunnerProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [practiceRuns, setPracticeRuns] = useState(initialPracticeRuns);
  const [practiceFailures, setPracticeFailures] = useState(initialPracticeFailures);
  const [submitting, setSubmitting] = useState(false);
  const [roundState, setRoundState] = useState<"idle" | "passed" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [m4Playing, setM4Playing] = useState(false);
  const [m4SoundPlayCount, setM4SoundPlayCount] = useState(0);
  const currentPracticeItem = items.find((item) => !answers[item.id]) ?? items[0];
  const isM4 = moduleCode === "M4";
  const guidance = useChildAudioGuidance({
    instructionText: instructionText ?? instructions,
    instructionAudio,
    stimulusText: currentPracticeItem?.prompt,
    stimulusPlaybackType: playbackType,
    autoplayKey: isM4
      ? ""
      : currentPracticeItem
        ? `${moduleCode}-${currentPracticeItem.id}`
        : `${moduleCode}-practice`,
  });
  const isPlaying = isM4 ? m4Playing : guidance.isPlaying;
  const headerInstructionLine = isM4
    ? "소리를 듣고 같은 걸 골라요"
    : getChildInstructionLine(moduleCode);
  const m4LengthItems = items.filter(
    (item) =>
      item.id.includes("p1") ||
      item.prompt.includes("짧음") ||
      item.prompt.includes("길음"),
  );
  const m4PitchItems = items.filter(
    (item) =>
      item.id.includes("p2") ||
      item.prompt.includes("높음") ||
      item.prompt.includes("낮음"),
  );
  const m4CurrentSoundItem =
    m4SoundPlayCount % 2 === 0
      ? m4LengthItems[Math.floor(m4SoundPlayCount / 2)] ?? m4LengthItems[0]
      : m4PitchItems[Math.floor(m4SoundPlayCount / 2)] ?? m4PitchItems[0];

  const isComplete = useMemo(
    () => items.every((item) => answers[item.id]),
    [answers, items],
  );

  async function playM4Instruction() {
    if (m4Playing) {
      return;
    }

    setM4Playing(true);
    try {
      await speakText("소리 듣기 버튼을 누르고 같은 걸 고르세요.");
    } finally {
      setM4Playing(false);
    }
  }

  async function playM4Pattern() {
    if (!m4CurrentSoundItem || m4Playing || m4SoundPlayCount >= 4) {
      return;
    }

    setM4Playing(true);
    try {
      const segments =
        m4CurrentSoundItem.promptSequence && m4CurrentSoundItem.promptSequence.length > 0
          ? m4CurrentSoundItem.promptSequence
          : m4CurrentSoundItem.prompt.split("-").map((segment) => segment.trim());

      for (let index = 0; index < segments.length; index += 1) {
        await playPattern(segments[index] ?? "", {
          segmentDurationScale: 2,
          segmentGapMs: 240,
        });

        if (index < segments.length - 1) {
          await wait(1000);
        }
      }
      setM4SoundPlayCount((value) => Math.min(value + 1, 4));
    } finally {
      setM4Playing(false);
    }
  }

  function renderM4Choice(choice: string) {
    const segments = choice.split("-").map((segment) => segment.trim());
    const isLengthPattern = segments.every(
      (segment) => segment === "짧음" || segment === "길음",
    );

    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="flex min-w-28 justify-center">
          {isLengthPattern ? (
            <div className="flex items-start gap-4">
              {segments.map((segment, segmentIndex) => (
                <div
                  key={`${choice}-${segmentIndex}`}
                  className="flex flex-col items-center"
                >
                  <div
                    className={`rounded-full bg-[var(--accent-strong)] ${
                      segment === "길음" ? "h-3 w-20" : "h-3 w-10"
                    }`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-2">
              {segments.map((segment, segmentIndex) => (
                <div
                  key={`${choice}-${segmentIndex}`}
                  className={`w-4 rounded-full bg-[var(--accent-strong)] ${
                    segment === "높음" ? "h-16" : "h-8"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        <span>{choice}</span>
      </div>
    );
  }

  async function submitRound() {
    if (!isComplete) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const correctCount = items.filter(
      (item) => answers[item.id] === item.correctAnswer,
    ).length;
    const passed = correctCount / items.length >= trainingMasteryThreshold;
    const nextRuns = practiceRuns + 1;
    const nextFailures = passed ? practiceFailures : practiceFailures + 1;

    const response = await fetch(
      `/api/session/${sessionId}/module/${moduleCode}/progress`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "practice",
          practiceRuns: nextRuns,
          practiceFailures: nextFailures,
          passed,
        }),
      },
    );

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
      return;
    }

    if (nextFailures < 2) {
      setAnswers({});
    }
  }

  return (
    <div className="space-y-4">
      <ChildStageHeader
        stageLabel="연습"
        instructionLine={headerInstructionLine}
      />
      <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
        {isM4 ? (
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1 self-start text-sm leading-7 text-[var(--muted)]">
              <p>1) 소리의 패턴을 듣고 같은 걸 고릅니다.</p>
              <p>2) 소리는 길이와 높낮이 두 종류가 있습니다.</p>
              <p>3) 각각 2번 연습할 수 있습니다.</p>
              <p>4) 연습이 끝나면 &apos;검사 시작&apos; 버튼을 누르세요.</p>
            </div>
            <div className="flex shrink-0 items-start justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  void playM4Instruction();
                }}
                disabled={m4Playing}
                className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {m4Playing ? "듣는 중..." : "설명 듣기"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void playM4Pattern();
                }}
                disabled={m4Playing || m4SoundPlayCount >= 4}
                className="rounded-[1.2rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {m4Playing ? "듣는 중..." : "소리 듣기"}
              </button>
            </div>
          </div>
        ) : (
          <ChildAudioGuidanceControls
            onPlay={guidance.playGuidance}
            isPlaying={guidance.isPlaying}
            hasPlayedOnce={guidance.hasPlayedOnce}
          />
        )}
      </div>

      {errorMessage ? (
        <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      {items.map((item, index) => (
        <article
          key={item.id}
          className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">연습 {index + 1}</p>
          </div>
          <div className={`mt-4 grid gap-2 ${isM4 ? "sm:grid-cols-2" : ""}`}>
            {item.choices.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() =>
                  setAnswers((current) => ({
                    ...current,
                    [item.id]: choice,
                  }))
                }
                disabled={isPlaying}
                className={`rounded-[1rem] border px-4 py-3 text-left text-sm ${
                  answers[item.id] === choice
                    ? "border-[var(--accent-strong)] bg-[rgba(201,111,59,0.12)]"
                    : "border-[var(--line)] bg-white"
                } ${isM4 ? "min-h-28" : ""}`}
              >
                {isM4 ? renderM4Choice(choice) : choice}
              </button>
            ))}
          </div>
        </article>
      ))}

      {roundState === "failed" ? (
        <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          연습에서 아직 어려움이 보였습니다.
          {practiceFailures >= 2
            ? " 두 번 이상 반복되어 품질 플래그로 기록되며, 보호자는 본 과제로 계속 진행할 수 있습니다."
            : " 같은 방식으로 한 번 더 연습해 보세요."}
        </div>
      ) : null}

      {roundState === "passed" ? (
        <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
          연습을 통과했습니다. 본 과제로 이동하세요.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={submitRound}
          disabled={!isComplete || submitting}
          className="flex-1 rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
        >
          {submitting ? "저장 중..." : isM4 ? "검사 시작" : "연습 결과 저장"}
        </button>

        {(roundState === "passed" || practiceFailures >= 2) && (
          <Link
            href={moduleHref}
            className="flex-1 rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-3 text-center text-sm font-semibold"
          >
            본 과제로 이동
          </Link>
        )}

        {roundState === "failed" && practiceFailures < 2 ? (
          <button
            type="button"
            onClick={() => {
              setRoundState("idle");
              setAnswers({});
              router.refresh();
            }}
            className="flex-1 rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold"
          >
            다시 연습
          </button>
        ) : null}
      </div>
    </div>
  );
}
