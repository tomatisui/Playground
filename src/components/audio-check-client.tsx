"use client";

import { submitAudioCheck } from "@/app/actions";
import {
  ChildAudioGuidanceControls,
  useChildAudioGuidance,
} from "@/components/child-audio-guidance";
import { ChildStageHeader } from "@/components/child-stage-header";

export function AudioCheckClient({ sessionId }: { sessionId: string }) {
  const guidance = useChildAudioGuidance({
    instructionText: "소리를 잘 듣고 준비가 되면 아래 버튼을 눌러요.",
    autoplayKey: `audio-check-${sessionId}`,
  });

  return (
    <>
      <ChildStageHeader
        stageLabel="오디오 확인"
        instructionLine="소리를 잘 들으면 시작해요"
      />

      <div className="mt-6 rounded-[1.5rem] border border-[var(--line)] bg-white/85 p-4">
        <div className="flex items-center justify-end">
          <ChildAudioGuidanceControls
            onPlay={guidance.playGuidance}
            isPlaying={guidance.isPlaying}
            hasPlayedOnce={guidance.hasPlayedOnce}
          />
        </div>
        <p className="mt-4 text-sm leading-7 text-[var(--foreground)]">
          준비가 되면 아래 버튼을 눌러 시작해요.
        </p>
        <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
          보호자 참고: 소리가 또렷하게 들리고 주변이 너무 시끄럽지 않은지만
          짧게 확인해 주세요.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <form action={submitAudioCheck}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="passed" value="true" />
          <button
            type="submit"
            disabled={guidance.isPlaying}
            className="w-full rounded-[1.3rem] bg-emerald-700 px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            소리 확인 통과
          </button>
        </form>

        <form action={submitAudioCheck}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="passed" value="false" />
          <button
            type="submit"
            disabled={guidance.isPlaying}
            className="w-full rounded-[1.3rem] bg-amber-600 px-5 py-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            소리 확인 어려움 있음
          </button>
        </form>
      </div>
    </>
  );
}
