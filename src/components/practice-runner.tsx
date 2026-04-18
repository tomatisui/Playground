"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChildAudioGuidanceControls,
  useChildAudioGuidance,
} from "@/components/child-audio-guidance";

type PracticeItem = {
  id: string;
  prompt: string;
  choices: string[];
  correctAnswer: string;
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
  const currentPracticeItem = items.find((item) => !answers[item.id]) ?? items[0];
  const guidance = useChildAudioGuidance({
    instructionText: instructionText ?? instructions,
    instructionAudio,
    stimulusText: currentPracticeItem?.prompt,
    stimulusPlaybackType: playbackType,
    autoplayKey: currentPracticeItem ? `${moduleCode}-${currentPracticeItem.id}` : `${moduleCode}-practice`,
  });

  const isComplete = useMemo(
    () => items.every((item) => answers[item.id]),
    [answers, items],
  );

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
      <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
        <p className="text-sm leading-7 text-[var(--foreground)]">
          {instructionText ?? instructions}
        </p>
        <div className="mt-4">
          <ChildAudioGuidanceControls
            onPlay={guidance.playGuidance}
            isPlaying={guidance.isPlaying}
            hasPlayedOnce={guidance.hasPlayedOnce}
          />
        </div>
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
            <span className="text-xs text-[var(--muted)]">설명 후 문항 재생 사용</span>
          </div>
          <div className="mt-4 grid gap-2">
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
                disabled={guidance.isPlaying}
                className={`rounded-[1rem] border px-4 py-3 text-left text-sm ${
                  answers[item.id] === choice
                    ? "border-[var(--accent-strong)] bg-[rgba(201,111,59,0.12)]"
                    : "border-[var(--line)] bg-white"
                }`}
              >
                {choice}
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
          {submitting ? "저장 중..." : "연습 결과 저장"}
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
