"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChildAudioGuidanceControls,
  useChildAudioGuidance,
} from "@/components/child-audio-guidance";
import { ChildChoiceCard } from "@/components/child-choice-card";

type ModuleItem = {
  id: string;
  prompt: string;
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
  const currentItem = items[currentIndex];
  const isResume = initialIndex > 0 || initialResponses.length > 0;
  const guidance = useChildAudioGuidance({
    instructionText: instructionText ?? instructions,
    instructionAudio,
    stimulusText: currentItem?.prompt,
    stimulusPlaybackType: playbackType,
    autoplayKey: currentItem ? `${moduleCode}-${currentItem.id}` : `${moduleCode}-complete`,
  });

  const currentProgress = useMemo(
    () => `${Math.min(currentIndex + 1, items.length)}/${items.length}`,
    [currentIndex, items.length],
  );

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
      <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm leading-7 text-[var(--foreground)]">
            {instructionText ?? instructions}
          </p>
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
    </div>
  );
}
