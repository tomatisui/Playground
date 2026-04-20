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
import { playPattern, speakText, wait } from "@/lib/audio-playback";
import { getChildInstructionLine } from "@/lib/child-ui-copy";

type ModuleItem = {
  id: string;
  contentGroup?: string;
  prompt: string;
  promptSequence?: string[];
  choices: string[];
  choiceImageKeys?: string[];
  correctAnswer: string;
};

type ModuleRunnerProps = {
  sessionId: string;
  moduleCode: string;
  playbackType: "tts" | "pattern";
  instructions: string;
  instructionText?: string;
  instructionAudio?: string | null;
  items: ModuleItem[];
  initialIndex: number;
  initialResponses: string[];
  initialAssistCount: number;
  nextHref: string;
};

export function ModuleRunner({
  sessionId,
  moduleCode,
  playbackType,
  instructions,
  instructionText,
  instructionAudio,
  items,
  initialIndex,
  initialResponses,
  initialAssistCount,
  nextHref,
}: ModuleRunnerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [responses, setResponses] = useState(initialResponses);
  const [assistCount, setAssistCount] = useState(initialAssistCount);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [m4Playing, setM4Playing] = useState(false);
  const currentItem = items[currentIndex];
  const isM4 = moduleCode === "M4";
  const isResume = initialIndex > 0 || initialResponses.length > 0;
  const guidance = useChildAudioGuidance({
    instructionText: instructionText ?? instructions,
    instructionAudio,
    stimulusText: currentItem?.prompt,
    stimulusPlaybackType: playbackType,
    autoplayKey: currentItem ? `${moduleCode}-${currentItem.id}` : `${moduleCode}-complete`,
  });
  const isPlaying = isM4 ? m4Playing : guidance.isPlaying;
  const headerInstructionLine = isM4
    ? "소리를 듣고 같은 걸 골라요"
    : getChildInstructionLine(moduleCode);

  const currentProgress = useMemo(
    () => `${Math.min(currentIndex + 1, items.length)}/${items.length}`,
    [currentIndex, items.length],
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
    if (!currentItem || m4Playing) {
      return;
    }

    setM4Playing(true);
    try {
      const segments =
        currentItem.promptSequence && currentItem.promptSequence.length > 0
          ? currentItem.promptSequence
          : currentItem.prompt.split("-").map((segment) => segment.trim());

      for (let index = 0; index < segments.length; index += 1) {
        await playPattern(segments[index] ?? "", {
          segmentDurationScale: 2,
          segmentGapMs: 240,
        });

        if (index < segments.length - 1) {
          await wait(1000);
        }
      }
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
                <div key={`${choice}-${segmentIndex}`}>
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

  async function submitChoice(choice: string) {
    if (!currentItem) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    const updatedResponses = [...responses];
    updatedResponses[currentIndex] = choice;

    const correctCount = updatedResponses.filter(
      (response, index) => response === items[index]?.correctAnswer,
    ).length;

    const payloadBase = {
      correctCount,
      itemCount: items.length,
      responseLog: JSON.stringify(updatedResponses),
      caregiverAssistCount: assistCount,
    };

    if (currentIndex === items.length - 1) {
      const response = await fetch(`/api/session/${sessionId}/module/${moduleCode}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "complete",
          ...payloadBase,
        }),
      });

      if (!response.ok) {
        setSaving(false);
        setErrorMessage("문항 결과를 저장하지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      router.push(nextHref);
      router.refresh();
      return;
    }

    const response = await fetch(`/api/session/${sessionId}/module/${moduleCode}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "progress",
        lastItemIndex: currentIndex + 1,
        ...payloadBase,
      }),
    });

    if (!response.ok) {
      setSaving(false);
      setErrorMessage("진행 상태를 저장하지 못했습니다. 같은 문항을 다시 선택해 주세요.");
      return;
    }

    setResponses(updatedResponses);
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
        instructionLine={headerInstructionLine}
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

      {isM4 ? (
        <div className="space-y-4">
          <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1 self-start text-sm leading-7 text-[var(--muted)]">
                <p>1) 소리의 패턴을 듣고 같은 걸 고릅니다.</p>
                <p>2) 길이 패턴을 먼저 하고, 다음에 높낮이 패턴을 합니다.</p>
                <p>3) 맞는 걸 고르면 바로 다음 문항으로 넘어갑니다.</p>
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
                  disabled={m4Playing || saving}
                  className="rounded-[1.2rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {m4Playing ? "듣는 중..." : "소리 듣기"}
                </button>
              </div>
            </div>
          </div>

          <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                {currentItem.contentGroup === "pitch_pattern" ? "높낮이 검사" : "길이 검사"} {currentIndex + 1}
              </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {currentItem.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => submitChoice(choice)}
                  disabled={saving || isPlaying}
                  className="min-h-28 rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-left text-sm"
                >
                  {renderM4Choice(choice)}
                </button>
              ))}
            </div>
          </article>
        </div>
      ) : (
        <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">문항 {currentIndex + 1}</p>
            <ChildAudioGuidanceControls
              onPlay={guidance.playGuidance}
              isPlaying={guidance.isPlaying}
              hasPlayedOnce={guidance.hasPlayedOnce}
            />
          </div>

          <div className="mt-4 grid gap-2">
            {currentItem.choices.map((choice, index) => (
              <ChildChoiceCard
                key={choice}
                label={choice}
                imageKey={currentItem.choiceImageKeys?.[index]}
                onClick={() => submitChoice(choice)}
                disabled={saving || guidance.isPlaying}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={recordAssist}
            className="mt-4 rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
          >
            보호자 추가 도움이 필요했음 기록
          </button>
        </article>
      )}
    </div>
  );
}
