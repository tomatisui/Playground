"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChildAudioGuidanceControls,
  useChildAudioGuidance,
} from "@/components/child-audio-guidance";
import { ChildChoiceCard } from "@/components/child-choice-card";
import { ChildStageHeader } from "@/components/child-stage-header";
import { ScreeningTransitionCard } from "@/components/screening-transition-card";
import { playFeedbackTone, playPattern, speakText, wait } from "@/lib/audio-playback";
import { getChildInstructionLine } from "@/lib/child-ui-copy";
import { getTestStartCopy } from "@/lib/screening-flow";

type PracticeItem = {
  id: string;
  contentGroup?: string;
  prompt: string;
  choices: string[];
  choiceImageKeys?: string[];
  correctAnswer: string;
  promptSequence?: string[];
};

type TrainingToken = {
  label: string;
  imageKey?: string;
  localAudioPath?: string | null;
};

type M1FlowStage = "familiarization" | "recognition" | "practice";

type M1FlowState = {
  stage: M1FlowStage;
  familiarizationCompleted: boolean;
  recognitionCompleted: boolean;
  recognitionLowMastery: boolean;
  recognitionCorrectStreak: number;
  recognitionIncorrectCount: number;
};

type M5FlowStage =
  | "familiarization"
  | "recognition"
  | "practice_syllable"
  | "practice_phoneme";

type M5FlowState = {
  stage: M5FlowStage;
  familiarizationCompleted: boolean;
  recognitionCompleted: boolean;
  recognitionLowMastery: boolean;
  recognitionCorrectStreak: number;
  recognitionIncorrectCount: number;
  syllableAnswer: string;
};

type PracticeRunnerProps = {
  sessionId: string;
  moduleCode: string;
  playbackType: "tts" | "pattern";
  instructions: string;
  instructionText?: string;
  instructionAudio?: string | null;
  items: PracticeItem[];
  trainingPool?: TrainingToken[];
  trainingMasteryThreshold?: number;
  initialPracticeRuns: number;
  initialPracticeFailures: number;
  moduleHref: string;
  m1RecognitionItems?: PracticeItem[];
  m1InitialFlowState?: M1FlowState;
  m5RecognitionItems?: PracticeItem[];
  m5InitialFlowState?: M5FlowState;
  m4InitialFlowState?: {
    flowStage: M4PracticeStage | "length_test" | "pitch_test" | "complete";
    skipLength: boolean;
    skipPitch: boolean;
    lengthResponses: string[];
    pitchResponses: string[];
  };
};

type M4PracticeStage =
  | "length_familiarization"
  | "length_recognition"
  | "length_practice"
  | "length_test_transition"
  | "pitch_familiarization"
  | "pitch_recognition"
  | "pitch_practice"
  | "pitch_test_transition";

const M4_PATTERN_START_DELAY_MS = 1000;
const M4_RECOGNITION_SUCCESS_THRESHOLD = 3;
const M4_RECOGNITION_FAILURE_THRESHOLD = 3;
const M4_TTS_OPTIONS = {
  rate: 0.92,
  pitch: 0.96,
  preferLangPrefix: "ko",
} as const;

const M4_RECOGNITION_GUIDANCE = {
  length: "소리 듣기 버튼을 누르고 들리는 소리와 같은 그림을 골라요.",
  pitch: "소리 듣기 버튼을 누르고 들리는 소리와 같은 그림을 골라요.",
} as const;

const M4_FAMILIARIZATION_GUIDANCE =
  "그림 카드를 눌러 소리를 듣고 익혀요.";

const M4_RECOGNITION_COMPLETE_TEXT =
  "사전 학습을 완료했습니다. 이제 연습 단계로 이동 버튼을 누르세요.";

const M4_PRACTICE_EXPLANATION_TEXT =
  "소리 듣기 버튼을 누르고 끝까지 잘 들으세요. 소리가 어떤 순서로 나왔는지 그림에서 고르세요.";
const M4_PRACTICE_EXPLANATION_SEGMENTS = [
  "소리 듣기 버튼을 누르고 끝까지 잘 들으세요.",
  "소리가 어떤 순서로 나왔는지 그림에서 고르세요.",
] as const;

const M4_LENGTH_TOKENS = ["짧음", "길음"] as const;
const M4_PITCH_TOKENS = ["높음", "낮음"] as const;
const M1_RECOGNITION_SUCCESS_THRESHOLD = 3;
const M1_RECOGNITION_FAILURE_THRESHOLD = 3;
const M1_FAMILIARIZATION_GUIDANCE = "그림 카드를 눌러 단어를 듣고 익혀요.";
const M1_RECOGNITION_GUIDANCE = "소리 듣기 버튼을 누르고 들리는 소리와 같은 그림을 골라요.";
const M1_RECOGNITION_COMPLETE_TEXT =
  "사전 학습을 완료했습니다. 이제 연습 단계로 이동 버튼을 누르세요.";
const M5_RECOGNITION_SUCCESS_THRESHOLD = 3;
const M5_RECOGNITION_FAILURE_THRESHOLD = 3;
const M5_FAMILIARIZATION_GUIDANCE = "그림 카드를 눌러 단어를 듣고 익혀요.";
const M5_RECOGNITION_GUIDANCE = "소리 듣기 버튼을 누르고 들리는 소리와 같은 그림을 골라요.";
const M5_RECOGNITION_COMPLETE_TEXT =
  "사전 학습을 완료했습니다. 이제 연습 단계로 이동 버튼을 누르세요.";

function normalizeTokens(
  trainingPool: TrainingToken[],
  targetLabels: readonly string[],
) {
  const labels = trainingPool
    .filter((token) => targetLabels.includes(token.label))
    .map((token) => token.label);

  return labels.length > 0 ? labels : [...targetLabels];
}

const DEFAULT_M1_FLOW_STATE: M1FlowState = {
  stage: "familiarization",
  familiarizationCompleted: false,
  recognitionCompleted: false,
  recognitionLowMastery: false,
  recognitionCorrectStreak: 0,
  recognitionIncorrectCount: 0,
};

const DEFAULT_M5_FLOW_STATE: M5FlowState = {
  stage: "familiarization",
  familiarizationCompleted: false,
  recognitionCompleted: false,
  recognitionLowMastery: false,
  recognitionCorrectStreak: 0,
  recognitionIncorrectCount: 0,
  syllableAnswer: "",
};

function hashChoiceSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffleStableChoices<T>(values: T[], seedKey: string) {
  const shuffled = [...values];
  let seed = hashChoiceSeed(seedKey);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function PracticeRunner({
  sessionId,
  moduleCode,
  playbackType,
  instructions,
  instructionText,
  instructionAudio,
  items,
  trainingPool = [],
  trainingMasteryThreshold = 0.5,
  initialPracticeRuns,
  initialPracticeFailures,
  moduleHref,
  m1RecognitionItems = [],
  m1InitialFlowState,
  m5RecognitionItems = [],
  m5InitialFlowState,
  m4InitialFlowState,
}: PracticeRunnerProps) {
  const router = useRouter();
  const isM4 = moduleCode === "M4";
  const isM1 = moduleCode === "M1";
  const isM5 = moduleCode === "M5";
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [practiceRuns, setPracticeRuns] = useState(initialPracticeRuns);
  const [practiceFailures, setPracticeFailures] = useState(initialPracticeFailures);
  const [submitting, setSubmitting] = useState(false);
  const [roundState, setRoundState] = useState<"idle" | "passed" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const initialM1Flow = m1InitialFlowState ?? DEFAULT_M1_FLOW_STATE;
  const initialM5Flow = m5InitialFlowState ?? DEFAULT_M5_FLOW_STATE;
  const [m1Stage, setM1Stage] = useState<M1FlowStage>(
    isM1 ? initialM1Flow.stage : "familiarization",
  );
  const [m1Playing, setM1Playing] = useState(false);
  const [m1RecognitionTarget, setM1RecognitionTarget] = useState<string | null>(null);
  const [m1RecognitionRunCount, setM1RecognitionRunCount] = useState(0);
  const [m1RecognitionCorrectStreak, setM1RecognitionCorrectStreak] = useState(
    initialM1Flow.recognitionCorrectStreak,
  );
  const [m1RecognitionIncorrectCount, setM1RecognitionIncorrectCount] = useState(
    initialM1Flow.recognitionIncorrectCount,
  );
  const [m1RecognitionAdvanceReady, setM1RecognitionAdvanceReady] = useState(
    initialM1Flow.recognitionCompleted,
  );
  const [m1RecognitionLowMastery, setM1RecognitionLowMastery] = useState(
    initialM1Flow.recognitionLowMastery,
  );
  const [m1CompletionAnnounced, setM1CompletionAnnounced] = useState(false);
  const [m1AutoplayDone, setM1AutoplayDone] = useState(
    !isM1 || initialM1Flow.stage !== "recognition",
  );
  const [m5Stage, setM5Stage] = useState<M5FlowStage>(
    isM5 ? initialM5Flow.stage : "familiarization",
  );
  const [m5Playing, setM5Playing] = useState(false);
  const [m5RecognitionTarget, setM5RecognitionTarget] = useState<string | null>(null);
  const [m5RecognitionRunCount, setM5RecognitionRunCount] = useState(0);
  const [m5RecognitionCorrectStreak, setM5RecognitionCorrectStreak] = useState(
    initialM5Flow.recognitionCorrectStreak,
  );
  const [m5RecognitionIncorrectCount, setM5RecognitionIncorrectCount] = useState(
    initialM5Flow.recognitionIncorrectCount,
  );
  const [m5RecognitionAdvanceReady, setM5RecognitionAdvanceReady] = useState(
    initialM5Flow.recognitionCompleted,
  );
  const [m5RecognitionLowMastery, setM5RecognitionLowMastery] = useState(
    initialM5Flow.recognitionLowMastery,
  );
  const [m5CompletionAnnounced, setM5CompletionAnnounced] = useState(false);
  const [m5AutoplayDone, setM5AutoplayDone] = useState(
    !isM5 || initialM5Flow.stage !== "recognition",
  );
  const [m5SyllableAnswer, setM5SyllableAnswer] = useState(initialM5Flow.syllableAnswer);
  const [m4Playing, setM4Playing] = useState(false);
  const initialM4Stage =
    m4InitialFlowState?.flowStage === "length_test"
      ? "length_test_transition"
      : m4InitialFlowState?.flowStage === "pitch_test"
        ? "pitch_test_transition"
        : m4InitialFlowState?.flowStage === "complete"
          ? "pitch_test_transition"
          : m4InitialFlowState?.flowStage ?? "length_familiarization";
  const [m4Stage, setM4Stage] = useState<M4PracticeStage>(
    isM4 ? initialM4Stage : "length_familiarization",
  );
  const [m4RecognitionTarget, setM4RecognitionTarget] = useState<string | null>(null);
  const [m4RecognitionRunCount, setM4RecognitionRunCount] = useState(0);
  const [m4RecognitionCorrectStreak, setM4RecognitionCorrectStreak] = useState(0);
  const [m4RecognitionIncorrectCount, setM4RecognitionIncorrectCount] = useState(0);
  const [m4RecognitionAdvanceReady, setM4RecognitionAdvanceReady] = useState(false);
  const [m4CompletionAnnounced, setM4CompletionAnnounced] = useState(false);
  const [m4SkippedSections, setM4SkippedSections] = useState({
    length: m4InitialFlowState?.skipLength ?? false,
    pitch: m4InitialFlowState?.skipPitch ?? false,
  });
  const [m4PracticeAnswers, setM4PracticeAnswers] = useState({
    length: "",
    pitch: "",
  });
  const [m4PracticeChoicesVisible, setM4PracticeChoicesVisible] = useState({
    length: false,
    pitch: false,
  });
  const [m4AutoplayStages, setM4AutoplayStages] = useState<string[]>([]);
  const [m4StoredResponses, setM4StoredResponses] = useState({
    length: m4InitialFlowState?.lengthResponses ?? [],
    pitch: m4InitialFlowState?.pitchResponses ?? [],
  });
  const currentPracticeItem = items.find((item) => !answers[item.id]) ?? items[0];
  const guidance = useChildAudioGuidance({
    instructionText: instructionText ?? instructions,
    instructionAudio,
    stimulusText: currentPracticeItem?.prompt,
    stimulusPlaybackType: playbackType,
    autoplayKey: isM4 || isM1
      ? ""
      : currentPracticeItem
        ? `${moduleCode}-${currentPracticeItem.id}`
        : `${moduleCode}-practice`,
  });
  const isPlaying = isM4
    ? m4Playing
    : isM1
      ? m1Playing
      : isM5
        ? m5Playing
        : guidance.isPlaying;
  const testStartCopy = getTestStartCopy(
    moduleCode as "M1" | "M2" | "M3" | "M3-R" | "M4" | "M5",
  );

  const isComplete = useMemo(
    () => items.every((item) => answers[item.id]),
    [answers, items],
  );

  const m4LengthCards = normalizeTokens(trainingPool, M4_LENGTH_TOKENS);
  const m4PitchCards = normalizeTokens(trainingPool, M4_PITCH_TOKENS);
  const m4LengthPracticeItem =
    items.find((item) => item.contentGroup === "length_pattern") ?? null;
  const m4PitchPracticeItem =
    items.find((item) => item.contentGroup === "pitch_pattern") ?? null;
  const m4CurrentRecognitionKind =
    m4Stage === "length_recognition" ? "length"
    : m4Stage === "pitch_recognition" ? "pitch"
    : null;
  const m4CurrentPracticeKind =
    m4Stage === "length_practice" ? "length"
    : m4Stage === "pitch_practice" ? "pitch"
    : null;
  const m4CurrentRecognitionTokens =
    m4CurrentRecognitionKind === "length" ? m4LengthCards
    : m4CurrentRecognitionKind === "pitch" ? m4PitchCards
    : null;
  const m4CurrentPracticeItem =
    m4CurrentPracticeKind === "length" ? m4LengthPracticeItem
    : m4CurrentPracticeKind === "pitch" ? m4PitchPracticeItem
    : null;
  const m4StageInstructionLine =
    m4Stage === "length_familiarization" || m4Stage === "pitch_familiarization"
      ? "그림을 누르면 소리가 나와요"
      : m4Stage === "length_recognition" || m4Stage === "pitch_recognition"
        ? "소리를 듣고 같은 그림을 골라요"
        : "소리를 듣고 같은 걸 골라요";
  const showLegacyPracticeControls =
    roundState === "idle" || (roundState === "failed" && practiceFailures < 2);
  const isM4PracticeStage =
    m4Stage === "length_practice" || m4Stage === "pitch_practice";
  const m1RecognitionPool =
    m1RecognitionItems.length > 0
      ? m1RecognitionItems
      : trainingPool.slice(0, 2).map((token) => ({
          id: `m1-recognition-${token.label}`,
          prompt: token.label,
          choices: trainingPool.slice(0, 2).map((item) => item.label),
          choiceImageKeys: trainingPool.slice(0, 2).map((item) => item.imageKey),
          correctAnswer: token.label,
          promptSequence: [token.label],
        }));
  const m1CurrentRecognitionItem =
    m1RecognitionPool.length > 0
      ? m1RecognitionPool[m1RecognitionRunCount % m1RecognitionPool.length] ?? m1RecognitionPool[0]
      : null;
  const m1CardPool =
    trainingPool.length > 0
      ? trainingPool
      : [
          { label: "바", imageKey: "ba" },
          { label: "다", imageKey: "da" },
        ];
  const m5RecognitionPool =
    m5RecognitionItems.length > 0
      ? m5RecognitionItems
      : trainingPool.map((token) => ({
          id: `m5-recognition-${token.label}`,
          prompt: token.label,
          choices: trainingPool.map((item) => item.label),
          choiceImageKeys: trainingPool.map((item) => item.imageKey),
          correctAnswer: token.label,
          promptSequence: [token.label],
        }));
  const m5CurrentRecognitionItem =
    m5RecognitionPool.length > 0
      ? m5RecognitionPool[m5RecognitionRunCount % m5RecognitionPool.length] ??
        m5RecognitionPool[0]
      : null;
  const m5CardPool = trainingPool;
  const m5SyllableItem =
    items.find((item) => item.contentGroup === "M5-A") ?? items[0] ?? null;
  const m5PhonemeItem =
    items.find((item) => item.contentGroup === "M5-B") ?? items[1] ?? null;
  const m5SyllableChoices = useMemo(() => {
    if (!m5SyllableItem) {
      return [];
    }

    return shuffleStableChoices(
      m5SyllableItem.choices.map((choice, index) => ({
        value: choice,
        imageKey: m5SyllableItem.choiceImageKeys?.[index],
      })),
      `${sessionId}:practice:${m5SyllableItem.id}`,
    );
  }, [m5SyllableItem, sessionId]);
  const m5PhonemeChoices = useMemo(() => {
    if (!m5PhonemeItem) {
      return [];
    }

    return shuffleStableChoices(
      m5PhonemeItem.choices.map((choice, index) => ({
        value: choice,
        imageKey: m5PhonemeItem.choiceImageKeys?.[index],
      })),
      `${sessionId}:practice:${m5PhonemeItem.id}`,
    );
  }, [m5PhonemeItem, sessionId]);

  useEffect(() => {
    if (
      !isM4 ||
      !m4CurrentRecognitionKind ||
      m4AutoplayStages.includes(m4Stage)
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        if (m4Playing) {
          return;
        }

        setM4Playing(true);
        try {
          await speakText(
            M4_RECOGNITION_GUIDANCE[m4CurrentRecognitionKind],
            M4_TTS_OPTIONS,
          );
        } finally {
          setM4Playing(false);
          setM4AutoplayStages((current) =>
            current.includes(m4Stage) ? current : [...current, m4Stage],
          );
        }
      })();
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isM4, m4AutoplayStages, m4CurrentRecognitionKind, m4Playing, m4Stage]);

  useEffect(() => {
    if (
      !isM4 ||
      !m4RecognitionAdvanceReady ||
      m4CompletionAnnounced ||
      m4Playing
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setM4Playing(true);
        try {
          await speakText(M4_RECOGNITION_COMPLETE_TEXT, M4_TTS_OPTIONS);
        } finally {
          setM4Playing(false);
          setM4CompletionAnnounced(true);
        }
      })();
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isM4, m4CompletionAnnounced, m4Playing, m4RecognitionAdvanceReady]);

  useEffect(() => {
    if (
      !isM1 ||
      m1Stage !== "recognition" ||
      m1AutoplayDone ||
      m1Playing ||
      m1RecognitionAdvanceReady
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setM1Playing(true);
        try {
          await speakText(M1_RECOGNITION_GUIDANCE, { preferLangPrefix: "ko" });
        } finally {
          setM1Playing(false);
          setM1AutoplayDone(true);
        }
      })();
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isM1,
    m1AutoplayDone,
    m1Playing,
    m1RecognitionAdvanceReady,
    m1Stage,
  ]);

  useEffect(() => {
    if (
      !isM1 ||
      !m1RecognitionAdvanceReady ||
      m1RecognitionLowMastery ||
      m1CompletionAnnounced ||
      m1Playing
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setM1Playing(true);
        try {
          await speakText(M1_RECOGNITION_COMPLETE_TEXT, {
            preferLangPrefix: "ko",
          });
        } finally {
          setM1Playing(false);
          setM1CompletionAnnounced(true);
        }
      })();
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isM1,
    m1CompletionAnnounced,
    m1Playing,
    m1RecognitionAdvanceReady,
    m1RecognitionLowMastery,
  ]);

  useEffect(() => {
    if (
      !isM5 ||
      m5Stage !== "recognition" ||
      m5AutoplayDone ||
      m5Playing ||
      m5RecognitionAdvanceReady
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setM5Playing(true);
        try {
          await speakText(M5_RECOGNITION_GUIDANCE, { preferLangPrefix: "ko" });
        } finally {
          setM5Playing(false);
          setM5AutoplayDone(true);
        }
      })();
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isM5,
    m5AutoplayDone,
    m5Playing,
    m5RecognitionAdvanceReady,
    m5Stage,
  ]);

  useEffect(() => {
    if (
      !isM5 ||
      !m5RecognitionAdvanceReady ||
      m5RecognitionLowMastery ||
      m5CompletionAnnounced ||
      m5Playing
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setM5Playing(true);
        try {
          await speakText(M5_RECOGNITION_COMPLETE_TEXT, {
            preferLangPrefix: "ko",
          });
        } finally {
          setM5Playing(false);
          setM5CompletionAnnounced(true);
        }
      })();
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isM5,
    m5CompletionAnnounced,
    m5Playing,
    m5RecognitionAdvanceReady,
    m5RecognitionLowMastery,
  ]);

  async function saveM1FlowState(nextState: M1FlowState) {
    const response = await fetch(
      `/api/session/${sessionId}/module/${moduleCode}/progress`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "progress",
          lastItemIndex: 0,
          correctCount: 0,
          itemCount: 0,
          responseLog: JSON.stringify({
            kind: "m1-flow-state",
            ...nextState,
          }),
        }),
      },
    );

    return response.ok;
  }

  async function playM1Guidance(text: string) {
    if (m1Playing) {
      return;
    }

    setM1Playing(true);
    try {
      await speakText(text, { preferLangPrefix: "ko" });
    } finally {
      setM1Playing(false);
    }
  }

  async function playM1Token(token: string) {
    if (m1Playing) {
      return;
    }

    setM1Playing(true);
    try {
      await speakText(token, { preferLangPrefix: "ko" });
    } finally {
      setM1Playing(false);
    }
  }

  async function playM1RecognitionPrompt() {
    if (!m1CurrentRecognitionItem || m1Playing || m1RecognitionTarget) {
      return;
    }

    setM1Playing(true);
    try {
      await speakText(m1CurrentRecognitionItem.prompt, { preferLangPrefix: "ko" });
      setM1RecognitionTarget(m1CurrentRecognitionItem.correctAnswer);
      setM1RecognitionRunCount((current) => current + 1);
    } finally {
      setM1Playing(false);
    }
  }

  async function handleM1RecognitionChoice(choice: string) {
    if (!m1RecognitionTarget || m1Playing) {
      return;
    }

    const isCorrect = choice === m1RecognitionTarget;
    const nextCorrectStreak = isCorrect ? m1RecognitionCorrectStreak + 1 : 0;
    const nextIncorrectCount = isCorrect
      ? m1RecognitionIncorrectCount
      : m1RecognitionIncorrectCount + 1;
    const lowMastery = nextIncorrectCount >= M1_RECOGNITION_FAILURE_THRESHOLD;
    const completed =
      nextCorrectStreak >= M1_RECOGNITION_SUCCESS_THRESHOLD || lowMastery;

    setM1Playing(true);
    try {
      await playFeedbackTone(isCorrect ? "correct" : "incorrect");
    } finally {
      setM1Playing(false);
    }

    setM1RecognitionTarget(null);
    setM1RecognitionCorrectStreak(nextCorrectStreak);
    setM1RecognitionIncorrectCount(nextIncorrectCount);
    setM1RecognitionLowMastery(lowMastery);

    if (!completed) {
      return;
    }

    setM1RecognitionAdvanceReady(true);
    await saveM1FlowState({
      stage: "recognition",
      familiarizationCompleted: true,
      recognitionCompleted: true,
      recognitionLowMastery: lowMastery,
      recognitionCorrectStreak: nextCorrectStreak,
      recognitionIncorrectCount: nextIncorrectCount,
    });
  }

  async function saveM5FlowState(nextState: M5FlowState) {
    const response = await fetch(
      `/api/session/${sessionId}/module/${moduleCode}/progress`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "progress",
          lastItemIndex: 0,
          correctCount: 0,
          itemCount: 0,
          responseLog: JSON.stringify({
            kind: "m5-flow-state",
            ...nextState,
          }),
        }),
      },
    );

    return response.ok;
  }

  async function playM5Guidance(text: string) {
    if (m5Playing) {
      return;
    }

    setM5Playing(true);
    try {
      await speakText(text, { preferLangPrefix: "ko" });
    } finally {
      setM5Playing(false);
    }
  }

  async function playM5Token(token: string) {
    if (m5Playing) {
      return;
    }

    setM5Playing(true);
    try {
      await speakText(token, { preferLangPrefix: "ko" });
    } finally {
      setM5Playing(false);
    }
  }

  async function playM5RecognitionPrompt() {
    if (!m5CurrentRecognitionItem || m5Playing || m5RecognitionTarget) {
      return;
    }

    setM5Playing(true);
    try {
      await speakText(m5CurrentRecognitionItem.prompt, { preferLangPrefix: "ko" });
      setM5RecognitionTarget(m5CurrentRecognitionItem.correctAnswer);
      setM5RecognitionRunCount((current) => current + 1);
    } finally {
      setM5Playing(false);
    }
  }

  async function handleM5RecognitionChoice(choice: string) {
    if (!m5RecognitionTarget || m5Playing) {
      return;
    }

    const isCorrect = choice === m5RecognitionTarget;
    const nextCorrectStreak = isCorrect ? m5RecognitionCorrectStreak + 1 : 0;
    const nextIncorrectCount = isCorrect
      ? m5RecognitionIncorrectCount
      : m5RecognitionIncorrectCount + 1;
    const lowMastery = nextIncorrectCount >= M5_RECOGNITION_FAILURE_THRESHOLD;
    const completed =
      nextCorrectStreak >= M5_RECOGNITION_SUCCESS_THRESHOLD || lowMastery;

    setM5Playing(true);
    try {
      await playFeedbackTone(isCorrect ? "correct" : "incorrect");
    } finally {
      setM5Playing(false);
    }

    setM5RecognitionTarget(null);
    setM5RecognitionCorrectStreak(nextCorrectStreak);
    setM5RecognitionIncorrectCount(nextIncorrectCount);
    setM5RecognitionLowMastery(lowMastery);

    if (!completed) {
      return;
    }

    setM5RecognitionAdvanceReady(true);
    await saveM5FlowState({
      stage: "recognition",
      familiarizationCompleted: true,
      recognitionCompleted: true,
      recognitionLowMastery: lowMastery,
      recognitionCorrectStreak: nextCorrectStreak,
      recognitionIncorrectCount: nextIncorrectCount,
      syllableAnswer: "",
    });
  }

  function resetM4RecognitionState() {
    setM4RecognitionTarget(null);
    setM4RecognitionRunCount(0);
    setM4RecognitionCorrectStreak(0);
    setM4RecognitionIncorrectCount(0);
    setM4RecognitionAdvanceReady(false);
    setM4CompletionAnnounced(false);
  }

  function renderM4TokenVisual(token: string) {
    const isLength = token === "짧음" || token === "길음";

    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="flex min-h-16 items-center justify-center">
          {isLength ? (
            <div
              className={`rounded-full bg-[var(--accent-strong)] ${
                token === "길음" ? "h-3 w-24" : "h-3 w-12"
              }`}
            />
          ) : (
            <div
              className={`w-5 rounded-full bg-[var(--accent-strong)] ${
                token === "높음" ? "h-20" : "h-10"
              }`}
            />
          )}
        </div>
        <span>{token}</span>
      </div>
    );
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

  async function playM4Explanation(text: string) {
    if (m4Playing) {
      return;
    }

    setM4Playing(true);
    try {
      const segments =
        text === M4_PRACTICE_EXPLANATION_TEXT
          ? M4_PRACTICE_EXPLANATION_SEGMENTS
          : [text];

      for (let index = 0; index < segments.length; index += 1) {
        await speakText(segments[index] ?? "", M4_TTS_OPTIONS);

        if (index < segments.length - 1) {
          await wait(500);
        }
      }
    } finally {
      setM4Playing(false);
    }
  }

  async function playM4FamiliarizationToken(token: string) {
    if (m4Playing) {
      return;
    }

    const explanation =
      token === "짧음"
        ? "이 소리는 길이가 짧은 소리입니다."
        : token === "길음"
          ? "이 소리는 길이가 긴 소리입니다."
          : token === "높음"
            ? "이 소리는 높이가 높은 소리입니다."
            : "이 소리는 높이가 낮은 소리입니다.";

    setM4Playing(true);
    try {
      const result = await playPattern(token, {
        segmentDurationScale: 2,
        segmentGapMs: 240,
      });

      if (result.status !== "played") {
        return;
      }

      await wait(1000);
      await speakText(explanation, M4_TTS_OPTIONS);
    } finally {
      setM4Playing(false);
    }
  }

  async function playM4RecognitionPattern() {
    if (!m4CurrentRecognitionTokens || m4Playing || m4RecognitionTarget) {
      return;
    }

    const target =
      m4CurrentRecognitionTokens[
        m4RecognitionRunCount % m4CurrentRecognitionTokens.length
      ] ?? m4CurrentRecognitionTokens[0];

    setM4Playing(true);
    try {
      const result = await playPattern(target, {
        segmentDurationScale: 2,
        segmentGapMs: 240,
      });

      if (result.status !== "played") {
        return;
      }

      setM4RecognitionTarget(target);
      setM4RecognitionRunCount((current) => current + 1);
    } finally {
      setM4Playing(false);
    }
  }

  async function saveM4PracticeState({
    nextFlowStage,
    nextSkippedSections = m4SkippedSections,
    nextStoredResponses = m4StoredResponses,
  }: {
    nextFlowStage: M4PracticeStage | "length_test" | "pitch_test" | "complete";
    nextSkippedSections?: { length: boolean; pitch: boolean };
    nextStoredResponses?: { length: string[]; pitch: string[] };
  }) {
    const nextRuns = practiceRuns + 1;
    const lowMastery = nextSkippedSections.length || nextSkippedSections.pitch;

    setSubmitting(true);
    setErrorMessage("");

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
          practiceFailures,
          passed: true,
          trainingMasteryResult: lowMastery ? "low" : "ok",
          responseLog: JSON.stringify({
            kind: "m4-flow-state",
            flowStage: nextFlowStage,
            skipLength: nextSkippedSections.length,
            skipPitch: nextSkippedSections.pitch,
            lengthResponses: nextStoredResponses.length,
            pitchResponses: nextStoredResponses.pitch,
          }),
        }),
      },
    );

    if (!response.ok) {
      setSubmitting(false);
      setErrorMessage("연습 결과를 저장하지 못했습니다. 다시 시도해 주세요.");
      return false;
    }

    setPracticeRuns(nextRuns);
    setM4StoredResponses(nextStoredResponses);
    setSubmitting(false);
    return true;
  }

  async function handleM4RecognitionChoice(choice: string) {
    if (!m4CurrentRecognitionKind || !m4RecognitionTarget || m4Playing) {
      return;
    }

    const isCorrect = choice === m4RecognitionTarget;
    const nextCorrectStreak = isCorrect ? m4RecognitionCorrectStreak + 1 : 0;
    const nextIncorrectCount = isCorrect
      ? m4RecognitionIncorrectCount
      : m4RecognitionIncorrectCount + 1;

    setM4Playing(true);
    try {
      await playFeedbackTone(isCorrect ? "correct" : "incorrect");
    } finally {
      setM4Playing(false);
    }

    setM4RecognitionTarget(null);
    setM4RecognitionCorrectStreak(nextCorrectStreak);
    setM4RecognitionIncorrectCount(nextIncorrectCount);

    if (nextCorrectStreak >= M4_RECOGNITION_SUCCESS_THRESHOLD) {
      setM4RecognitionAdvanceReady(true);
      return;
    }

    if (nextIncorrectCount < M4_RECOGNITION_FAILURE_THRESHOLD) {
      return;
    }

    if (m4CurrentRecognitionKind === "length") {
      const nextSkippedSections = {
        ...m4SkippedSections,
        length: true,
      };
      setM4SkippedSections(nextSkippedSections);
      resetM4RecognitionState();
      const saved = await saveM4PracticeState({
        nextFlowStage: "pitch_familiarization",
        nextSkippedSections,
      });
      if (saved) {
        setM4Stage("pitch_familiarization");
      }
      return;
    }

    const nextSkippedSections = {
      ...m4SkippedSections,
      pitch: true,
    };
    setM4SkippedSections(nextSkippedSections);
    resetM4RecognitionState();

    const saved = await saveM4PracticeState({
      nextFlowStage: "pitch_test",
      nextSkippedSections,
    });
    if (saved) {
      router.push(moduleHref);
      router.refresh();
    }
  }

  async function advanceToLengthTestTransition() {
    const saved = await saveM4PracticeState({
      nextFlowStage: "length_test",
    });

    if (saved) {
      setM4Stage("length_test_transition");
    }
  }

  async function advanceToPitchTestTransition() {
    const saved = await saveM4PracticeState({
      nextFlowStage: "pitch_test",
    });

    if (saved) {
      setM4Stage("pitch_test_transition");
    }
  }

  async function playM4PracticePattern() {
    if (!m4CurrentPracticeItem || !m4CurrentPracticeKind || m4Playing) {
      return;
    }

    setM4Playing(true);
    try {
      await wait(M4_PATTERN_START_DELAY_MS);
      const segments =
        m4CurrentPracticeItem.promptSequence && m4CurrentPracticeItem.promptSequence.length > 0
          ? m4CurrentPracticeItem.promptSequence
          : m4CurrentPracticeItem.prompt.split("-").map((segment) => segment.trim());

      for (let index = 0; index < segments.length; index += 1) {
        const result = await playPattern(segments[index] ?? "", {
          segmentDurationScale: 2,
          segmentGapMs: 240,
        });

        if (result.status !== "played") {
          return;
        }

        if (index < segments.length - 1) {
          await wait(1000);
        }
      }

      setM4PracticeChoicesVisible((current) => ({
        ...current,
        [m4CurrentPracticeKind]: true,
      }));
    } finally {
      setM4Playing(false);
    }
  }

  async function advanceM5ToRecognition() {
    setSubmitting(true);
    setErrorMessage("");
    const nextState: M5FlowState = {
      stage: "recognition",
      familiarizationCompleted: true,
      recognitionCompleted: false,
      recognitionLowMastery: false,
      recognitionCorrectStreak: 0,
      recognitionIncorrectCount: 0,
      syllableAnswer: "",
    };
    const saved = await saveM5FlowState(nextState);
    setSubmitting(false);
    if (!saved) {
      setErrorMessage("진행 상태를 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    setM5Stage("recognition");
    setM5AutoplayDone(false);
  }

  async function advanceM5ToSyllablePractice() {
    setSubmitting(true);
    setErrorMessage("");
    const nextState: M5FlowState = {
      stage: "practice_syllable",
      familiarizationCompleted: true,
      recognitionCompleted: true,
      recognitionLowMastery: m5RecognitionLowMastery,
      recognitionCorrectStreak: m5RecognitionCorrectStreak,
      recognitionIncorrectCount: m5RecognitionIncorrectCount,
      syllableAnswer: m5SyllableAnswer,
    };
    const saved = await saveM5FlowState(nextState);
    setSubmitting(false);
    if (!saved) {
      setErrorMessage("진행 상태를 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    setM5Stage("practice_syllable");
  }

  async function advanceM5ToPhonemePractice() {
    if (!m5SyllableAnswer) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    const nextState: M5FlowState = {
      stage: "practice_phoneme",
      familiarizationCompleted: true,
      recognitionCompleted: true,
      recognitionLowMastery: m5RecognitionLowMastery,
      recognitionCorrectStreak: m5RecognitionCorrectStreak,
      recognitionIncorrectCount: m5RecognitionIncorrectCount,
      syllableAnswer: m5SyllableAnswer,
    };
    const saved = await saveM5FlowState(nextState);
    setSubmitting(false);
    if (!saved) {
      setErrorMessage("진행 상태를 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    setM5Stage("practice_phoneme");
  }

  async function submitM5Practice() {
    if (
      !m5SyllableItem ||
      !m5PhonemeItem ||
      !m5SyllableAnswer ||
      !answers[m5PhonemeItem.id]
    ) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const phonemeAnswer = answers[m5PhonemeItem.id];
    const nextAnswers = {
      [m5SyllableItem.id]: m5SyllableAnswer,
      [m5PhonemeItem.id]: phonemeAnswer,
    };
    const correctCount =
      (m5SyllableAnswer === m5SyllableItem.correctAnswer ? 1 : 0) +
      (phonemeAnswer === m5PhonemeItem.correctAnswer ? 1 : 0);
    const itemCount = 2;
    const passed = correctCount / itemCount >= trainingMasteryThreshold;
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
          trainingMasteryResult:
            m5RecognitionLowMastery ? "low" : passed ? "ok" : undefined,
          responseLog: JSON.stringify({
            kind: "m5-flow-state",
            stage: "practice_phoneme",
            familiarizationCompleted: true,
            recognitionCompleted: true,
            recognitionLowMastery: m5RecognitionLowMastery,
            recognitionCorrectStreak: m5RecognitionCorrectStreak,
            recognitionIncorrectCount: m5RecognitionIncorrectCount,
            syllableAnswer: m5SyllableAnswer,
          }),
        }),
      },
    );

    if (!response.ok) {
      setSubmitting(false);
      setErrorMessage("연습 결과를 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    setAnswers(nextAnswers);
    setPracticeRuns(nextRuns);
    setPracticeFailures(nextFailures);
    setSubmitting(false);
    setRoundState(passed ? "passed" : "failed");

    if (!passed && nextFailures < 2) {
      setAnswers({});
      setM5Stage("practice_syllable");
      setM5SyllableAnswer("");
    }
  }

  async function submitRound() {
    if (!isComplete) {
      return false;
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
          trainingMasteryResult:
            isM1
              ? m1RecognitionLowMastery
                ? "low"
                : passed
                  ? "ok"
                  : undefined
              : isM5
                ? m5RecognitionLowMastery
                  ? "low"
                  : passed
                    ? "ok"
                    : undefined
                : passed
                  ? "ok"
                  : undefined,
          responseLog:
            isM1
              ? JSON.stringify({
                  kind: "m1-flow-state",
                  stage: "practice",
                  familiarizationCompleted: true,
                  recognitionCompleted: true,
                  recognitionLowMastery: m1RecognitionLowMastery,
                  recognitionCorrectStreak: m1RecognitionCorrectStreak,
                  recognitionIncorrectCount: m1RecognitionIncorrectCount,
                })
              : isM5
                ? JSON.stringify({
                    kind: "m5-flow-state",
                    stage: "practice_phoneme",
                    familiarizationCompleted: true,
                    recognitionCompleted: true,
                    recognitionLowMastery: m5RecognitionLowMastery,
                    recognitionCorrectStreak: m5RecognitionCorrectStreak,
                    recognitionIncorrectCount: m5RecognitionIncorrectCount,
                    syllableAnswer: m5SyllableAnswer,
                  })
              : undefined,
        }),
      },
    );

    if (!response.ok) {
      setSubmitting(false);
      setErrorMessage("연습 결과를 저장하지 못했습니다. 다시 시도해 주세요.");
      return false;
    }

    setPracticeRuns(nextRuns);
    setPracticeFailures(nextFailures);
    setSubmitting(false);
    setRoundState(passed ? "passed" : "failed");

    if (passed) {
      return true;
    }

    if (nextFailures < 2) {
      setAnswers({});
    }

    return true;
  }

  if (
    isM4 &&
    (m4Stage === "length_test_transition" || m4Stage === "pitch_test_transition")
  ) {
    const isLengthTransition = m4Stage === "length_test_transition";
    return (
      <>
        {errorMessage ? (
          <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
            {errorMessage}
          </div>
        ) : null}
        <ScreeningTransitionCard
          screenKey={`test-start-${sessionId}-${moduleCode}-${m4Stage}`}
          stageLabel="검사"
          instructionLine={
            isLengthTransition
              ? "길이 연습이 끝났어요. 이제 길이 검사를 시작해요."
              : "높낮이 연습이 끝났어요. 이제 높낮이 검사를 시작해요."
          }
          body="준비가 되면 검사 시작 버튼을 눌러 주세요."
          primaryLabel="검사 시작"
          primaryHref={moduleHref}
          tone="cool"
          emphasis="strong"
        />
      </>
    );
  }

  if (isM4) {
    const stageLabel =
      m4Stage === "length_familiarization" || m4Stage === "pitch_familiarization"
        ? "먼저 들어보기"
        : "연습";

    const renderM4Card = (
      token: string,
      onClick: () => void,
      disabled: boolean,
    ) => (
      <button
        key={token}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="min-h-32 rounded-[1rem] border border-[var(--line)] bg-white px-4 py-4 text-sm font-semibold disabled:opacity-50"
      >
        {renderM4TokenVisual(token)}
      </button>
    );

    return (
      <div className="space-y-4">
        <ChildStageHeader stageLabel={stageLabel} instructionLine={m4StageInstructionLine} />

        {errorMessage ? (
          <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
            {errorMessage}
          </div>
        ) : null}

        {(m4Stage === "length_familiarization" || m4Stage === "pitch_familiarization") && (
          <>
            <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1 self-start text-sm leading-7 text-[var(--muted)]">
                  <p>검사에 나오는 소리를 먼저 익히는 단계예요.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void playM4Explanation(M4_FAMILIARIZATION_GUIDANCE);
                  }}
                  disabled={m4Playing}
                  className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {m4Playing ? "듣는 중..." : "안내 음성 듣기"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(m4Stage === "length_familiarization" ? m4LengthCards : m4PitchCards).map((token) =>
                renderM4Card(
                  token,
                  () => {
                    void playM4FamiliarizationToken(token);
                  },
                  m4Playing,
                ),
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setM4Stage(
                  m4Stage === "length_familiarization"
                    ? "length_recognition"
                    : "pitch_recognition",
                );
              }}
              className="w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
            >
              다음으로 이동
            </button>
          </>
        )}

        {(m4Stage === "length_recognition" || m4Stage === "pitch_recognition") && (
          <>
            <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1 self-start text-sm leading-7 text-[var(--muted)]">
                  <p>소리 듣기 버튼을 누르고 들리는 소리와 같은 그림을 골라요.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void playM4RecognitionPattern();
                  }}
                  disabled={m4Playing || !!m4RecognitionTarget || m4RecognitionAdvanceReady}
                  className="rounded-[1.2rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {m4Playing ? "듣는 중..." : "소리 듣기"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(m4CurrentRecognitionTokens ?? []).map((token) =>
                renderM4Card(
                  token,
                  () => {
                    void handleM4RecognitionChoice(token);
                  },
                  m4Playing || !m4RecognitionTarget || m4RecognitionAdvanceReady,
                ),
              )}
            </div>

            {m4RecognitionAdvanceReady ? (
              <button
                type="button"
                onClick={() => {
                  resetM4RecognitionState();
                  setM4Stage(
                    m4Stage === "length_recognition"
                      ? "length_practice"
                      : "pitch_practice",
                  );
                }}
                className="w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
              >
                연습 단계로 이동
              </button>
            ) : null}
          </>
        )}

        {isM4PracticeStage && m4CurrentPracticeItem && m4CurrentPracticeKind && (
          <>
            <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1 self-start text-sm leading-7 text-[var(--muted)]">
                  <p>소리 듣기 버튼을 누르고 끝까지 잘 들으세요.</p>
                  <p>소리가 어떤 순서로 나왔는지 그림에서 고르세요.</p>
                </div>
                <div className="flex shrink-0 items-start justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void playM4Explanation(M4_PRACTICE_EXPLANATION_TEXT);
                    }}
                    disabled={m4Playing}
                    className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {m4Playing ? "듣는 중..." : "설명 듣기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void playM4PracticePattern();
                    }}
                    disabled={m4Playing || submitting}
                    className="rounded-[1.2rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {m4Playing ? "듣는 중..." : "소리 듣기"}
                  </button>
                </div>
              </div>
            </div>

            {m4PracticeChoicesVisible[m4CurrentPracticeKind] ? (
              <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    {m4CurrentPracticeKind === "length" ? "길이 연습" : "높낮이 연습"}
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {m4CurrentPracticeItem.choices.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() =>
                        setM4PracticeAnswers((current) => ({
                          ...current,
                          [m4CurrentPracticeKind]: choice,
                        }))
                      }
                      disabled={m4Playing || submitting}
                      className={`min-h-28 rounded-[1rem] border px-4 py-3 text-left text-sm ${
                        m4PracticeAnswers[m4CurrentPracticeKind] === choice
                          ? "border-[var(--accent-strong)] bg-[rgba(201,111,59,0.12)]"
                          : "border-[var(--line)] bg-white"
                      }`}
                    >
                      {renderM4Choice(choice)}
                    </button>
                  ))}
                </div>
              </article>
            ) : (
              <div className="rounded-[1rem] border border-dashed border-[var(--line)] bg-white/80 px-4 py-5 text-center text-sm leading-7 text-[var(--muted)]">
                소리를 끝까지 들은 뒤에 보기가 나타나요.
              </div>
            )}

              <button
                type="button"
                onClick={async () => {
                  if (m4CurrentPracticeKind === "length") {
                    await advanceToLengthTestTransition();
                    return;
                  }

                  await advanceToPitchTestTransition();
                }}
                disabled={
                  !m4PracticeAnswers[m4CurrentPracticeKind] || submitting || m4Playing
              }
              className="w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
            >
              {submitting ? "저장 중..." : "선택 완료"}
            </button>
          </>
        )}
      </div>
    );
  }

  if (isM1) {
    const renderM1Card = (
      token: TrainingToken,
      onClick: () => void,
      disabled: boolean,
    ) => (
      <ChildChoiceCard
        key={token.label}
        label={token.label}
        imageKey={token.imageKey}
        hideLabel
        onClick={onClick}
        disabled={disabled}
      />
    );

    if (m1Stage === "familiarization") {
      return (
        <div className="space-y-4">
          <ChildStageHeader
            stageLabel="사전 학습 단계"
            instructionLine="그림을 누르면 말이 나와요"
          />

          {errorMessage ? (
            <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1 self-start text-sm leading-7 text-[var(--muted)]">
                <p>검사에 나오는 단어를 먼저 익히는 단계예요.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void playM1Guidance(M1_FAMILIARIZATION_GUIDANCE);
                }}
                disabled={m1Playing}
                className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {m1Playing ? "듣는 중..." : "안내 음성 듣기"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {m1CardPool.map((token) =>
              renderM1Card(
                token,
                () => {
                  void playM1Token(token.label);
                },
                m1Playing,
              ),
            )}
          </div>

          <button
            type="button"
            onClick={async () => {
              setSubmitting(true);
              setErrorMessage("");
              const nextState: M1FlowState = {
                stage: "recognition",
                familiarizationCompleted: true,
                recognitionCompleted: false,
                recognitionLowMastery: false,
                recognitionCorrectStreak: 0,
                recognitionIncorrectCount: 0,
              };
              const saved = await saveM1FlowState(nextState);
              setSubmitting(false);
              if (!saved) {
                setErrorMessage("진행 상태를 저장하지 못했습니다. 다시 시도해 주세요.");
                return;
              }
              setM1Stage("recognition");
              setM1AutoplayDone(false);
            }}
            disabled={submitting || m1Playing}
            className="w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
          >
            다음으로 이동
          </button>
        </div>
      );
    }

    if (m1Stage === "recognition") {
      return (
        <div className="space-y-4">
          <ChildStageHeader stageLabel="연습" instructionLine="소리를 듣고 같은 그림을 골라요" />

          {errorMessage ? (
            <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1 self-start text-sm leading-7 text-[var(--muted)]">
                <p>소리 듣기 버튼을 누르고 들리는 소리와 같은 그림을 골라요.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void playM1RecognitionPrompt();
                }}
                disabled={m1Playing || !!m1RecognitionTarget || m1RecognitionAdvanceReady}
                className="rounded-[1.2rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {m1Playing ? "듣는 중..." : "소리 듣기"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {m1CardPool.map((token) =>
              renderM1Card(
                token,
                () => {
                  void handleM1RecognitionChoice(token.label);
                },
                m1Playing || !m1RecognitionTarget || m1RecognitionAdvanceReady,
              ),
            )}
          </div>

          {m1RecognitionAdvanceReady ? (
            <button
              type="button"
              onClick={async () => {
                setSubmitting(true);
                setErrorMessage("");
                const nextState: M1FlowState = {
                  stage: "practice",
                  familiarizationCompleted: true,
                  recognitionCompleted: true,
                  recognitionLowMastery: m1RecognitionLowMastery,
                  recognitionCorrectStreak: m1RecognitionCorrectStreak,
                  recognitionIncorrectCount: m1RecognitionIncorrectCount,
                };
                const saved = await saveM1FlowState(nextState);
                setSubmitting(false);
                if (!saved) {
                  setErrorMessage("진행 상태를 저장하지 못했습니다. 다시 시도해 주세요.");
                  return;
                }
                setM1Stage("practice");
              }}
              disabled={submitting || m1Playing}
              className="w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
            >
              연습 단계로 이동
            </button>
          ) : null}
        </div>
      );
    }
  }

  if (isM5) {
    const renderM5Card = (
      token: TrainingToken,
      onClick: () => void,
      disabled: boolean,
    ) => (
      <ChildChoiceCard
        key={token.label}
        label={token.label}
        imageKey={token.imageKey}
        hideLabel
        onClick={onClick}
        disabled={disabled}
      />
    );

    if (m5Stage === "familiarization") {
      return (
        <div className="space-y-4">
          <ChildStageHeader
            stageLabel="사전 학습 단계"
            instructionLine="그림을 누르면 말이 나와요"
          />

          {errorMessage ? (
            <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1 self-start text-sm leading-7 text-[var(--muted)]">
                <p>검사에 나오는 단어를 먼저 익히는 단계예요.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void playM5Guidance(M5_FAMILIARIZATION_GUIDANCE);
                }}
                disabled={m5Playing}
                className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {m5Playing ? "듣는 중..." : "안내 음성 듣기"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {m5CardPool.map((token) =>
              renderM5Card(
                token,
                () => {
                  void playM5Token(token.label);
                },
                m5Playing,
              ),
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              void advanceM5ToRecognition();
            }}
            disabled={submitting || m5Playing}
            className="w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
          >
            다음으로 이동
          </button>
        </div>
      );
    }

    if (m5Stage === "recognition") {
      return (
        <div className="space-y-4">
          <ChildStageHeader stageLabel="연습" instructionLine="소리를 듣고 같은 그림을 골라요" />

          {errorMessage ? (
            <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1 self-start text-sm leading-7 text-[var(--muted)]">
                <p>소리 듣기 버튼을 누르고 들리는 소리와 같은 그림을 골라요.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void playM5RecognitionPrompt();
                }}
                disabled={m5Playing || !!m5RecognitionTarget || m5RecognitionAdvanceReady}
                className="rounded-[1.2rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {m5Playing ? "듣는 중..." : "소리 듣기"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {m5CardPool.map((token) =>
              renderM5Card(
                token,
                () => {
                  void handleM5RecognitionChoice(token.label);
                },
                m5Playing || !m5RecognitionTarget || m5RecognitionAdvanceReady,
              ),
            )}
          </div>

          {m5RecognitionAdvanceReady ? (
            <button
              type="button"
              onClick={() => {
                void advanceM5ToSyllablePractice();
              }}
              disabled={submitting || m5Playing}
              className="w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
            >
              연습 단계로 이동
            </button>
          ) : null}
        </div>
      );
    }

    if (m5Stage === "practice_syllable" && m5SyllableItem) {
      return (
        <div className="space-y-4">
          <ChildStageHeader stageLabel="연습" instructionLine="처음 소리가 다른 하나를 골라요" />

          {errorMessage ? (
            <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
            <ChildAudioGuidanceControls
              onPlay={guidance.playGuidance}
              isPlaying={guidance.isPlaying}
              hasPlayedOnce={guidance.hasPlayedOnce}
            />
          </div>

          <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">연습 1</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {m5SyllableChoices.map((choice) => (
                <ChildChoiceCard
                  key={choice.value}
                  label={choice.value}
                  imageKey={choice.imageKey}
                  hideLabel
                  selected={m5SyllableAnswer === choice.value}
                  onClick={() => setM5SyllableAnswer(choice.value)}
                  disabled={isPlaying}
                />
              ))}
            </div>
          </article>

          <button
            type="button"
            onClick={() => {
              void advanceM5ToPhonemePractice();
            }}
            disabled={!m5SyllableAnswer || submitting || isPlaying}
            className="w-full rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
          >
            다음 연습으로 이동
          </button>
        </div>
      );
    }

    if (m5Stage === "practice_phoneme" && m5PhonemeItem) {
      return (
        <div className="space-y-4">
          <ChildStageHeader stageLabel="연습" instructionLine="처음 소리가 다른 하나를 골라요" />

          {errorMessage ? (
            <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
            <ChildAudioGuidanceControls
              onPlay={guidance.playGuidance}
              isPlaying={guidance.isPlaying}
              hasPlayedOnce={guidance.hasPlayedOnce}
            />
          </div>

          <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">연습 2</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {m5PhonemeChoices.map((choice) => (
                <ChildChoiceCard
                  key={choice.value}
                  label={choice.value}
                  imageKey={choice.imageKey}
                  hideLabel
                  selected={answers[m5PhonemeItem.id] === choice.value}
                  onClick={() =>
                    setAnswers((current) => ({
                      ...current,
                      [m5PhonemeItem.id]: choice.value,
                    }))
                  }
                  disabled={isPlaying}
                />
              ))}
            </div>
          </article>

          {roundState === "failed" ? (
            <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
              연습에서 아직 어려움이 보였습니다.
              {practiceFailures >= 2
                ? " 두 번 이상 반복되어 품질 플래그로 기록되며, 보호자는 본 과제로 계속 진행할 수 있습니다."
                : " 같은 방식으로 한 번 더 연습해 보세요."}
            </div>
          ) : null}

          {showLegacyPracticeControls ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  void submitM5Practice();
                }}
                disabled={!answers[m5PhonemeItem.id] || submitting || isPlaying}
                className="flex-1 rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
              >
                {submitting ? "저장 중..." : "연습 결과 저장"}
              </button>

              {roundState === "failed" && practiceFailures < 2 ? (
                <button
                  type="button"
                  onClick={() => {
                    setRoundState("idle");
                    setAnswers({});
                    setM5SyllableAnswer("");
                    setM5Stage("practice_syllable");
                    router.refresh();
                  }}
                  className="flex-1 rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold"
                >
                  다시 연습
                </button>
              ) : null}
            </div>
          ) : null}

          {roundState === "passed" || practiceFailures >= 2 ? (
            <ScreeningTransitionCard
              screenKey={`test-start-${sessionId}-${moduleCode}`}
              stageLabel="검사"
              instructionLine={testStartCopy.title}
              body={testStartCopy.body}
              bullets={testStartCopy.bullets}
              primaryLabel={testStartCopy.primaryLabel}
              primaryHref={moduleHref}
              tone="cool"
              emphasis="strong"
            />
          ) : null}
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      <ChildStageHeader
        stageLabel="연습"
        instructionLine={getChildInstructionLine(moduleCode)}
      />
      <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
        <ChildAudioGuidanceControls
          onPlay={guidance.playGuidance}
          isPlaying={guidance.isPlaying}
          hasPlayedOnce={guidance.hasPlayedOnce}
        />
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
          <div className="mt-4 grid gap-2">
            {item.choices.map((choice, choiceIndex) =>
              isM1 ? (
                <ChildChoiceCard
                  key={choice}
                  label={choice}
                  imageKey={item.choiceImageKeys?.[choiceIndex]}
                  hideLabel
                  selected={answers[item.id] === choice}
                  onClick={() =>
                    setAnswers((current) => ({
                      ...current,
                      [item.id]: choice,
                    }))
                  }
                  disabled={isPlaying}
                />
              ) : (
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
                  }`}
                >
                  {choice}
                </button>
              ),
            )}
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

      {showLegacyPracticeControls ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={submitRound}
            disabled={!isComplete || submitting}
            className="flex-1 rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
          >
            {submitting ? "저장 중..." : "연습 결과 저장"}
          </button>

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
      ) : null}

      {roundState === "passed" || practiceFailures >= 2 ? (
        <ScreeningTransitionCard
          screenKey={`test-start-${sessionId}-${moduleCode}`}
          stageLabel="검사"
          instructionLine={testStartCopy.title}
          body={testStartCopy.body}
          bullets={testStartCopy.bullets}
          primaryLabel={testStartCopy.primaryLabel}
          primaryHref={moduleHref}
          tone="cool"
          emphasis="strong"
        />
      ) : null}
    </div>
  );
}
