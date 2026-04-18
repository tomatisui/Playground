"use client";

import { useState } from "react";
import { playPrompt } from "@/lib/audio-playback";

type PlaybackButtonProps = {
  playbackType: "tts" | "pattern";
  prompt: string;
};

export function PlaybackButton({ playbackType, prompt }: PlaybackButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  async function handlePlay() {
    setIsPlaying(true);

    try {
      await playPrompt(playbackType, prompt);
    } finally {
      setIsPlaying(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
      disabled={isPlaying}
    >
      {isPlaying ? "재생 중..." : "문항 듣기"}
    </button>
  );
}
