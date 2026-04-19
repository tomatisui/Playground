"use client";

export function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function speakText(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";

  await new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export async function playPattern(pattern: string) {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const segments = pattern.split("-").map((segment) => segment.trim());

  for (const segment of segments) {
    const duration =
      segment === "길음" ? 0.42
      : segment === "짧음" ? 0.18
      : 0.24;
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
    await wait(duration * 1000 + 120);
  }

  await context.close();
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
