"use client";

import { submitAudioCheck } from "@/app/actions";
import {
  ChildAudioGuidanceControls,
  useChildAudioGuidance,
} from "@/components/child-audio-guidance";
import { ChildStageHeader } from "@/components/child-stage-header";

export function AudioCheckClient({ sessionId }: { sessionId: string }) {
  const guidance = useChildAudioGuidance({
    instructionText: "이 안내 음성을 들으면서 볼륨을 적절하게 조정하세요. 다 되면 아래 버튼을 누르세요.",
    autoplayKey: `audio-check-${sessionId}`,
  });

  return (
    <>
      <ChildStageHeader
        stageLabel="볼륨 조정 단계"
        instructionLine="소리를 들으면서 볼륨을 맞춰요"
      />

      <div className="mt-6 rounded-[1.5rem] border border-[var(--line)] bg-white/85 p-4">
        <div className="flex items-center justify-end">
          <ChildAudioGuidanceControls
            onPlay={guidance.playGuidance}
            isPlaying={guidance.isPlaying}
            hasPlayedOnce={guidance.hasPlayedOnce}
            primaryLabel="음성 샘플 듣기"
            replayLabel="음성 샘플 듣기"
          />
        </div>
        <p className="mt-4 text-sm leading-7 text-[var(--foreground)]">
          &apos;음성 샘플 듣기&apos; 버튼을 눌러서 음성을 들으면서 볼륨을 조정하세요.
          볼륨 조정을 완료하면 아래 &apos;볼륨 확인 완료&apos; 버튼을 눌러서 다음 단계로 넘어가요.
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
            볼륨 확인 완료
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
            볼륨 조절에 어려움이 있음
          </button>
        </form>
      </div>
    </>
  );
}
