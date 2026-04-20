"use client";

export function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export const SPEECH_PLAYBACK_TIMEOUT_MS = 4000;

export type SpeechPlaybackResult = {
  status: "ended" | "error" | "timeout" | "unavailable";
};

export async function speakText(
  text: string,
  { timeoutMs = SPEECH_PLAYBACK_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<SpeechPlaybackResult> {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return { status: "unavailable" };
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";

  return await new Promise<SpeechPlaybackResult>((resolve) => {
    let settled = false;
    let timeoutId = 0;

    const finish = (status: SpeechPlaybackResult["status"]) => {
      if (settled) {
        return;
      }

      settled = true;
      utterance.onend = null;
      utterance.onerror = null;
      window.clearTimeout(timeoutId);
      resolve({ status });
    };

    utterance.onend = () => finish("ended");
    utterance.onerror = () => finish("error");

    timeoutId = window.setTimeout(() => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cleanup errors and recover the UI lock.
      }
      finish("timeout");
    }, timeoutMs);

    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      finish("error");
    }
  });
}

export async function playPattern(
  pattern: string,
  {
    segmentDurationScale = 1,
    segmentGapMs = 120,
  }: { segmentDurationScale?: number; segmentGapMs?: number } = {},
) {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    return { status: "unavailable" as const };
  }

  const context = new AudioContextClass();
  const segments = pattern.split("-").map((segment) => segment.trim());

  for (const segment of segments) {
    const durationBase =
      segment === "길음" ? 0.42
      : segment === "짧음" ? 0.18
      : 0.24;
    const duration = durationBase * segmentDurationScale;
    const frequency =
      segment === "높음" ? 880
      : segment === "낮음" ? 440
      : 660;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.08;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    await wait(duration * 1000 + segmentGapMs);
  }

  await context.close();
  return { status: "played" as const };
}

export async function playPrompt(playbackType: "tts" | "pattern", prompt: string) {
  if (playbackType === "pattern") {
    await playPattern(prompt);
    return;
  }

  await speakText(prompt);
}

export async function playFeedbackTone(kind: "correct" | "incorrect") {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.connect(gain);
  gain.connect(context.destination);
  gain.gain.value = kind === "correct" ? 0.08 : 0.1;

  if (kind === "correct") {
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.linearRampToValueAtTime(1320, context.currentTime + 0.18);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.22);
    await wait(260);
  } else {
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(220, context.currentTime);
    oscillator.frequency.linearRampToValueAtTime(140, context.currentTime + 0.26);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
    await wait(340);
  }

  await context.close();
}
