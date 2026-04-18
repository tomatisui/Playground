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
};

export function useChildAudioGuidance({
  instructionText,
  instructionAudio,
  stimulusText,
  stimulusPlaybackType = "tts",
  autoplayKey,
  delayMs = 700,
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
      await speakText(instructionAudio || instructionText);
      if (stimulusText) {
        await wait(delayMs);
        await playPrompt(stimulusPlaybackType, stimulusText);
      }
      setHasPlayedOnce(true);
    } finally {
      setIsPlaying(false);
    }
  }, [delayMs, instructionAudio, instructionText, isPlaying, stimulusPlaybackType, stimulusText]);

  useEffect(() => {
    if (!autoplayKey || lastAutoplayKeyRef.current === autoplayKey) {
      return;
    }

    lastAutoplayKeyRef.current = autoplayKey;
    void playGuidance();
  }, [autoplayKey, playGuidance]);

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
}: {
  onPlay: () => Promise<void>;
  isPlaying: boolean;
  hasPlayedOnce: boolean;
  primaryLabel?: string;
  replayLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {!hasPlayedOnce ? (
        <button
          type="button"
          onClick={() => {
            void onPlay();
          }}
          disabled={isPlaying}
          className="rounded-[1.2rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPlaying ? "설명 재생 중..." : primaryLabel}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => {
          void onPlay();
        }}
        disabled={isPlaying}
        className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {isPlaying ? "재생 중..." : replayLabel}
      </button>
    </div>
  );
}
