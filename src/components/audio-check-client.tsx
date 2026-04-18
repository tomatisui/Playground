"use client";

import { submitAudioCheck } from "@/app/actions";
import {
  ChildAudioGuidanceControls,
  useChildAudioGuidance,
} from "@/components/child-audio-guidance";

export function AudioCheckClient({ sessionId }: { sessionId: string }) {
  const guidance = useChildAudioGuidance({
    instructionText: "소리를 잘 듣고 준비가 되면 아래 버튼을 눌러요.",
    autoplayKey: `audio-check-${sessionId}`,
  });

  return (
    <>
      <div className="mt-6 rounded-[1.5rem] bg-[var(--card-strong)] p-4 text-sm leading-7 text-[var(--muted)]">
        예시 확인 항목:
        <br />
        1. 보호자가 재생 음성을 분명히 들을 수 있음
        <br />
        2. 아이가 소리가 나온다는 점을 이해함
        <br />
        3. 주변 소음이 과도하지 않음
        <div className="mt-4">
          <ChildAudioGuidanceControls
            onPlay={guidance.playGuidance}
            isPlaying={guidance.isPlaying}
            hasPlayedOnce={guidance.hasPlayedOnce}
          />
        </div>
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
