"use client";

import { useRef, useState } from "react";

type PlaybackButtonProps = {
  playbackType: "tts" | "pattern";
  prompt: string;
};

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function PlaybackButton({ playbackType, prompt }: PlaybackButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  async function playPattern(pattern: string) {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const context = audioContextRef.current;
    const segments = pattern.split("-").map((segment) => segment.trim());

    for (const segment of segments) {
      const duration = segment === "길음" ? 0.42 : 0.18;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 660;
      gain.gain.value = 0.08;

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + duration);
      await wait(duration * 1000 + 120);
    }
  }

  async function handlePlay() {
    setIsPlaying(true);

    try {
      if (playbackType === "pattern") {
        await playPattern(prompt);
      } else {
        const utterance = new SpeechSynthesisUtterance(prompt);
        utterance.lang = "ko-KR";

        await new Promise<void>((resolve) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        });
      }
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
