"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlaybackButton } from "@/components/playback-button";

type ModuleItem = {
  id: string;
  prompt: string;
  choices: string[];
  correctAnswer: string;
};

type ModuleRunnerProps = {
  sessionId: string;
  moduleCode: string;
  playbackType: "tts" | "pattern";
  title: string;
  instructions: string;
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
  title,
  instructions,
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
  const currentItem = items[currentIndex];
  const isResume = initialIndex > 0 || initialResponses.length > 0;

  const currentProgress = useMemo(
    () => `${Math.min(currentIndex + 1, items.length)}/${items.length}`,
    [currentIndex, items.length],
  );

  async function submitChoice(choice: string) {
    if (!currentItem) {
      return;
    }

    setSaving(true);
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
      await fetch(`/api/session/${sessionId}/module/${moduleCode}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "complete",
          ...payloadBase,
        }),
      });

      router.push(nextHref);
      router.refresh();
      return;
    }

    await fetch(`/api/session/${sessionId}/module/${moduleCode}/progress`, {
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

    setResponses(updatedResponses);
    setCurrentIndex((value) => value + 1);
    setSaving(false);
    router.refresh();
  }

  async function recordAssist() {
    const nextAssistCount = assistCount + 1;
    setAssistCount(nextAssistCount);

    await fetch(`/api/session/${sessionId}/module/${moduleCode}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "assist",
        caregiverAssistCount: nextAssistCount,
      }),
    });
  }

  if (!currentItem) {
    return (
      <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-5">
        <p className="text-sm leading-7 text-[var(--muted)]">
          This module has already been completed. You can move forward to the next
          step.
        </p>
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
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {instructions}
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

      <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">문항 {currentIndex + 1}</p>
          <PlaybackButton playbackType={playbackType} prompt={currentItem.prompt} />
        </div>

        <div className="mt-4 grid gap-2">
          {currentItem.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => submitChoice(choice)}
              disabled={saving}
              className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-left text-sm transition hover:border-[var(--accent-strong)] disabled:opacity-50"
            >
              {choice}
            </button>
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
