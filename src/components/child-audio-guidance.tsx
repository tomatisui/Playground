"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playPrompt, speakText, wait } from "@/lib/audio-playback";

type UseChildAudioGuidanceOptions = {
  instructionText: string;
  instructionAudio?: string | null;
  stimulusText?: string;
  stimulusPlaybackType?: "tts" | "pattern";
  autoplayKey: string;
  delayMs?: number;
  initialAutoplayDelayMs?: number;
};

export function useChildAudioGuidance({
  instructionText,
  instructionAudio,
  stimulusText,
  stimulusPlaybackType = "tts",
  autoplayKey,
  delayMs = 700,
  initialAutoplayDelayMs = 900,
}: UseChildAudioGuidanceOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const lastAutoplayKeyRef = useRef("");

  const playGuidance = useCallback(async () => {
    if (isPlaying) {
      return;
    }

    setIsPlaying(true);
    try {
      const instructionResult = await speakText(instructionAudio || instructionText);
      const instructionDidComplete = instructionResult.status === "ended";

      setHasPlayedOnce(true);

      if (!instructionDidComplete) {
        return;
      }

      if (stimulusText) {
        await wait(delayMs);
        await playPrompt(stimulusPlaybackType, stimulusText);
      }
    } finally {
      setIsPlaying(false);
    }
  }, [delayMs, instructionAudio, instructionText, isPlaying, stimulusPlaybackType, stimulusText]);

  useEffect(() => {
    if (!autoplayKey || lastAutoplayKeyRef.current === autoplayKey) {
      return;
    }

    lastAutoplayKeyRef.current = autoplayKey;
    let cancelled = false;

    void (async () => {
      await wait(initialAutoplayDelayMs);
      if (cancelled) {
        return;
      }
      await playGuidance();
    })();

    return () => {
      cancelled = true;
    };
  }, [autoplayKey, initialAutoplayDelayMs, playGuidance]);

  return {
    isPlaying,
    hasPlayedOnce,
    playGuidance,
  };
}

export function ChildAudioGuidanceControls({
  onPlay,
  isPlaying,
  hasPlayedOnce,
  primaryLabel = "설명 듣기",
  replayLabel = "다시 듣기",
  disableAfterPlayed = false,
}: {
  onPlay: () => Promise<void>;
  isPlaying: boolean;
  hasPlayedOnce: boolean;
  primaryLabel?: string;
  replayLabel?: string;
  disableAfterPlayed?: boolean;
}) {
  const shouldDisable = isPlaying || (disableAfterPlayed && hasPlayedOnce);

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => {
          void onPlay();
        }}
        disabled={shouldDisable}
        className={`${
          hasPlayedOnce
            ? "rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm"
            : "rounded-[1.2rem] bg-[var(--accent-strong)] px-5 py-4 text-sm text-white"
        } font-semibold disabled:opacity-50`}
      >
        {isPlaying ? "듣는 중..." : hasPlayedOnce ? replayLabel : primaryLabel}
      </button>
    </div>
  );
}
