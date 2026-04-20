"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type M4SectionGroup = "length_pattern" | "pitch_pattern";

type M4Choice = {
  value: string;
  imageKey?: string;
};

type M4Level = {
  length: number;
  items: ModuleItem[];
};

type M4SectionPlan = {
  group: M4SectionGroup;
  title: string;
  levels: M4Level[];
};

type M4RuntimePlan = {
  sections: M4SectionPlan[];
  flatItems: ModuleItem[];
};

type M4DerivedState = {
  sectionIndex: number;
  levelIndex: number;
  attemptIndex: number;
  answeredCount: number;
  completed: boolean;
};

const M4_SECTION_ORDER: M4SectionGroup[] = ["length_pattern", "pitch_pattern"];
const M4_LEVEL_ORDER = [2, 3, 4, 5];
const M4_PATTERN_ELEMENT_GAP_MS = 1000;
const M4_PATTERN_DURATION_SCALE = 2;
const M4_EXPLANATION_AUTOPLAY_DELAY_MS = 1000;
const M4_SECTION_LABELS: Record<M4SectionGroup, string> = {
  length_pattern: "길이 검사",
  pitch_pattern: "높낮이 검사",
};
const M4_EXPLANATION_TEXT =
  "소리를 잘 듣고 같은 걸 고른 후 선택 완료 버튼을 누르세요.";

function normalizeM4LevelItems(levelItems: ModuleItem[]) {
  const sorted = [...levelItems].sort((left, right) => left.id.localeCompare(right.id));

  if (sorted.length >= 2) {
    return sorted.slice(0, 2);
  }

  if (sorted.length === 1) {
    return [sorted[0], sorted[0]];
  }

  return [];
}

function buildM4RuntimePlan(items: ModuleItem[]): M4RuntimePlan {
  const sections = M4_SECTION_ORDER.map((group) => {
    const groupItems = items.filter((item) => item.contentGroup === group);
    const levels = M4_LEVEL_ORDER.map((length) => {
      const levelItems = groupItems.filter(
        (item) => (item.promptSequence?.length ?? item.prompt.split("-").length) === length,
      );

      return {
        length,
        items: normalizeM4LevelItems(levelItems),
      };
    }).filter((level) => level.items.length > 0);

    return {
      group,
      title: M4_SECTION_LABELS[group],
      levels,
    };
  }).filter((section) => section.levels.length > 0);

  return {
    sections,
    flatItems: sections.flatMap((section) =>
      section.levels.flatMap((level) => level.items),
    ),
  };
}

function deriveM4State(plan: M4RuntimePlan, responses: string[]): M4DerivedState {
  let answeredCount = 0;

  for (let sectionIndex = 0; sectionIndex < plan.sections.length; sectionIndex += 1) {
    const section = plan.sections[sectionIndex];

    for (let levelIndex = 0; levelIndex < section.levels.length; levelIndex += 1) {
      const level = section.levels[levelIndex];
      const firstItem = level.items[0];
      const secondItem = level.items[1];
      const firstAnswer = responses[answeredCount];

      if (typeof firstAnswer === "undefined") {
        return {
          sectionIndex,
          levelIndex,
          attemptIndex: 0,
          answeredCount,
          completed: false,
        };
      }

      const secondAnswer = responses[answeredCount + 1];

      if (typeof secondAnswer === "undefined") {
        return {
          sectionIndex,
          levelIndex,
          attemptIndex: 1,
          answeredCount: answeredCount + 1,
          completed: false,
        };
      }

      const firstCorrect = firstAnswer === firstItem.correctAnswer;
      const secondCorrect = secondAnswer === secondItem.correctAnswer;
      answeredCount += 2;

      if (!firstCorrect && !secondCorrect) {
        break;
      }
    }
  }

  return {
    sectionIndex: plan.sections.length,
    levelIndex: 0,
    attemptIndex: 0,
    answeredCount,
    completed: true,
  };
}

function getM4CurrentItem(plan: M4RuntimePlan, state: M4DerivedState) {
  const section = plan.sections[state.sectionIndex];

  if (!section) {
    return null;
  }

  const level = section.levels[state.levelIndex];

  if (!level) {
    return null;
  }

  return level.items[state.attemptIndex] ?? null;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffleM4Choices(choices: M4Choice[], seedKey: string) {
  const shuffled = [...choices];
  let seed = hashString(seedKey);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function getM4ChoiceSet(
  currentItem: ModuleItem,
  sectionItems: ModuleItem[],
  sessionId: string,
): M4Choice[] {
  const explicitChoices = currentItem.choices.map((choice, index) => ({
    value: choice,
    imageKey: currentItem.choiceImageKeys?.[index],
  }));

  if (explicitChoices.length >= 4) {
    return shuffleM4Choices(explicitChoices.slice(0, 4), `${sessionId}:${currentItem.id}`);
  }

  const levelLength =
    currentItem.promptSequence?.length ?? currentItem.prompt.split("-").length;
  const candidateMap = new Map<string, M4Choice>();

  for (const choice of explicitChoices) {
    candidateMap.set(choice.value, choice);
  }

  for (const item of sectionItems) {
    const itemLength = item.promptSequence?.length ?? item.prompt.split("-").length;

    if (itemLength !== levelLength) {
      continue;
    }

    item.choices.forEach((choice, index) => {
      if (!candidateMap.has(choice)) {
        candidateMap.set(choice, {
          value: choice,
          imageKey: item.choiceImageKeys?.[index],
        });
      }
    });
  }

  const stableChoices = [...candidateMap.values()];
  const correctChoice = stableChoices.find((choice) => choice.value === currentItem.correctAnswer) ?? {
    value: currentItem.correctAnswer,
    imageKey: undefined,
  };
  const distractors = stableChoices.filter(
    (choice) => choice.value !== currentItem.correctAnswer,
  );

  return shuffleM4Choices(
    [correctChoice, ...distractors].slice(0, 4),
    `${sessionId}:${currentItem.id}`,
  );
}

function getM4AccuracySummary(plan: M4RuntimePlan, responses: string[]) {
  let correctCount = 0;

  for (let index = 0; index < responses.length; index += 1) {
    const item = plan.flatItems[index];

    if (item && responses[index] === item.correctAnswer) {
      correctCount += 1;
    }
  }

  return {
    correctCount,
    itemCount: responses.length,
  };
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
                  className={`rounded-full bg-[rgb(58,111,168)] ${
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
                className={`w-4 rounded-full bg-[rgb(58,111,168)] ${
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
  const [m4PendingChoice, setM4PendingChoice] = useState<{
    itemId: string;
    value: string;
  } | null>(null);
  const [m4PlayedItemIds, setM4PlayedItemIds] = useState<string[]>([]);
  const [m4AutoplayDone, setM4AutoplayDone] = useState(false);
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
  const m4Plan = useMemo(() => buildM4RuntimePlan(items), [items]);
  const m4State = useMemo(
    () => deriveM4State(m4Plan, responses),
    [m4Plan, responses],
  );
  const m4CurrentItem = useMemo(
    () => getM4CurrentItem(m4Plan, m4State),
    [m4Plan, m4State],
  );
  const m4CurrentSection = m4Plan.sections[m4State.sectionIndex] ?? null;
  const m4CurrentLevel = m4CurrentSection?.levels[m4State.levelIndex] ?? null;
  const m4ActivePendingChoice =
    m4PendingChoice && m4PendingChoice.itemId === m4CurrentItem?.id
      ? m4PendingChoice.value
      : "";
  const m4CurrentChoices = useMemo(() => {
    if (!m4CurrentItem || !m4CurrentSection) {
      return [];
    }

    const sectionItems = m4CurrentSection.levels.flatMap((level) => level.items);
    return getM4ChoiceSet(m4CurrentItem, sectionItems, sessionId);
  }, [m4CurrentItem, m4CurrentSection, sessionId]);

  const currentProgress = useMemo(
    () => `${Math.min(currentIndex + 1, items.length)}/${items.length}`,
    [currentIndex, items.length],
  );

  useEffect(() => {
    if (!isM4 || m4AutoplayDone || m4State.completed) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        if (m4Playing) {
          return;
        }

        setM4Playing(true);
        try {
          await speakText(M4_EXPLANATION_TEXT);
        } finally {
          setM4Playing(false);
          setM4AutoplayDone(true);
        }
      })();
    }, M4_EXPLANATION_AUTOPLAY_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isM4, m4AutoplayDone, m4Playing, m4State.completed]);

  async function playM4Explanation() {
    if (m4Playing) {
      return;
    }

    setM4Playing(true);
    try {
      await speakText(M4_EXPLANATION_TEXT);
    } finally {
      setM4Playing(false);
      setM4AutoplayDone(true);
    }
  }

  async function playM4Pattern() {
    if (!m4CurrentItem || m4Playing || m4PlayedItemIds.includes(m4CurrentItem.id)) {
      return;
    }

    setM4Playing(true);
    let playbackSucceeded = false;

    try {
      const segments =
        m4CurrentItem.promptSequence && m4CurrentItem.promptSequence.length > 0
          ? m4CurrentItem.promptSequence
          : m4CurrentItem.prompt.split("-").map((segment) => segment.trim());

      for (let index = 0; index < segments.length; index += 1) {
        const result = await playPattern(segments[index] ?? "", {
          segmentDurationScale: M4_PATTERN_DURATION_SCALE,
          segmentGapMs: 0,
        });

        if (result.status !== "played") {
          playbackSucceeded = false;
          return;
        }

        playbackSucceeded = true;

        if (index < segments.length - 1) {
          await wait(M4_PATTERN_ELEMENT_GAP_MS);
        }
      }
    } finally {
      if (playbackSucceeded) {
        setM4PlayedItemIds((current) =>
          current.includes(m4CurrentItem.id) ? current : [...current, m4CurrentItem.id],
        );
      }
      setM4Playing(false);
    }
  }

  async function submitM4Answer() {
    if (!m4CurrentItem || !m4ActivePendingChoice) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    const updatedResponses = [...responses, m4ActivePendingChoice];
    const summary = getM4AccuracySummary(m4Plan, updatedResponses);
    const nextState = deriveM4State(m4Plan, updatedResponses);
    const payloadBase = {
      correctCount: summary.correctCount,
      itemCount: summary.itemCount,
      responseLog: JSON.stringify(updatedResponses),
      caregiverAssistCount: assistCount,
    };

    const isComplete = nextState.completed || !getM4CurrentItem(m4Plan, nextState);

    const response = await fetch(`/api/session/${sessionId}/module/${moduleCode}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        isComplete
          ? {
              type: "complete",
              ...payloadBase,
            }
          : {
              type: "progress",
              lastItemIndex: updatedResponses.length,
              ...payloadBase,
            },
      ),
    });

    if (!response.ok) {
      setSaving(false);
      setErrorMessage("문항 결과를 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    if (isComplete) {
      router.push(nextHref);
      router.refresh();
      return;
    }

    setResponses(updatedResponses);
    setM4PendingChoice(null);
    setSaving(false);
    router.refresh();
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

  if (isM4 && m4State.completed) {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.4rem] border border-[rgba(58,111,168,0.28)] bg-[rgba(58,111,168,0.08)] p-5">
          <p className="text-sm leading-7 text-[rgb(58,111,168)]">
            실제 검사가 끝나 다음 단계로 이동합니다.
          </p>
        </div>
        <Link
          href={nextHref}
          className="block rounded-[1.2rem] bg-[rgb(58,111,168)] px-4 py-3 text-center text-sm font-semibold text-white"
        >
          다음 단계로 이동
        </Link>
      </div>
    );
  }

  if (!isM4 && !currentItem) {
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
        progressLabel={
          isM4 && m4CurrentSection && m4CurrentLevel
            ? `${m4CurrentSection.title} ${m4CurrentLevel.length}개 ${m4State.attemptIndex + 1}/2`
            : currentProgress
        }
        emphasis={isM4 ? "strong" : "default"}
        tone={isM4 ? "cool" : "warm"}
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
          <div className="rounded-[1.4rem] border border-[rgba(58,111,168,0.28)] bg-[rgba(58,111,168,0.08)] p-4">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1 self-start text-sm leading-7 text-[rgb(70,92,116)]">
                <p>1) 소리의 패턴을 듣고 같은 걸 고릅니다.</p>
                <p>2) 길이 패턴을 먼저 하고, 다음에 높낮이 패턴을 합니다.</p>
                <p>3) 같은 걸 고른 후 선택 완료 버튼을 누르세요.</p>
                <p>4) 소리 듣기는 한 번만 나와요.</p>
              </div>
              <div className="flex shrink-0 items-start justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void playM4Explanation();
                  }}
                  disabled={m4Playing || saving}
                  className="rounded-full border border-[rgba(58,111,168,0.22)] bg-white px-4 py-2 text-sm font-semibold text-[rgb(58,111,168)] disabled:opacity-50"
                >
                  {m4Playing ? "듣는 중..." : "설명 듣기"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void playM4Pattern();
                  }}
                  disabled={m4Playing || saving || !m4CurrentItem || m4PlayedItemIds.includes(m4CurrentItem.id)}
                  className="rounded-[1.2rem] bg-[rgb(58,111,168)] px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {m4Playing ? "듣는 중..." : "소리 듣기"}
                </button>
              </div>
            </div>
          </div>

          {m4CurrentSection && m4CurrentLevel && m4CurrentItem ? (
            <article className="rounded-[1.4rem] border border-[rgba(58,111,168,0.28)] bg-[rgba(58,111,168,0.05)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[rgb(58,111,168)]">
                  {m4CurrentSection.title} · {m4CurrentLevel.length}개 패턴 · {m4State.attemptIndex + 1}/2
                </p>
              </div>

              {m4PlayedItemIds.includes(m4CurrentItem.id) ? (
                <div className="mt-4 grid gap-3">
                  {m4CurrentChoices.map((choice) => (
                    <button
                      key={choice.value}
                      type="button"
                      onClick={() =>
                        setM4PendingChoice({
                          itemId: m4CurrentItem.id,
                          value: choice.value,
                        })
                      }
                      disabled={saving || isPlaying}
                      className={`min-h-32 rounded-[1rem] border px-5 py-4 text-left text-sm ${
                        m4ActivePendingChoice === choice.value
                          ? "border-[rgb(58,111,168)] bg-[rgba(58,111,168,0.14)]"
                          : "border-[rgba(58,111,168,0.18)] bg-white"
                      }`}
                    >
                      {renderM4Choice(choice.value)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1rem] border border-dashed border-[rgba(58,111,168,0.28)] bg-white/70 px-4 py-5 text-center text-sm leading-7 text-[rgb(70,92,116)]">
                  소리를 끝까지 들은 뒤에 보기가 나타나요.
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  void submitM4Answer();
                }}
                disabled={!m4ActivePendingChoice || saving || isPlaying}
                className="mt-4 w-full rounded-[1.2rem] bg-[rgb(58,111,168)] px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "저장 중..." : "선택 완료"}
              </button>
            </article>
          ) : null}
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
            {currentItem?.choices.map((choice, index) => (
              <ChildChoiceCard
                key={choice}
                label={choice}
                imageKey={currentItem.choiceImageKeys?.[index]}
                onClick={() => {
                  void submitChoice(choice);
                }}
                disabled={saving || guidance.isPlaying}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              void recordAssist();
            }}
            className="mt-4 rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
          >
            보호자 추가 도움이 필요했음 기록
          </button>
        </article>
      )}
    </div>
  );
}
