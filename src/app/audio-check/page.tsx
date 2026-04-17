import Link from "next/link";
import { submitAudioCheck } from "@/app/actions";
import { PrototypeBadge } from "@/components/prototype-badge";
import { prisma } from "@/lib/prisma";

export default async function AudioCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 text-sm leading-7 text-[var(--muted)] shadow-[0_24px_80px_rgba(63,41,19,0.08)]">
          세션 정보가 없습니다. 먼저 <Link href="/child-info" className="font-semibold text-[var(--accent-strong)]">아동 정보 입력</Link>으로 이동해 주세요.
          <div className="mt-4">
            <Link
              href="/child-info"
              className="inline-flex rounded-[1rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white"
            >
              아동 정보 입력으로 이동
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const session = await prisma.screeningSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 text-sm leading-7 text-[var(--muted)] shadow-[0_24px_80px_rgba(63,41,19,0.08)]">
          세션을 찾을 수 없습니다.
          <div className="mt-4">
            <Link
              href="/child-info"
              className="inline-flex rounded-[1rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white"
            >
              새 세션 만들기
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <PrototypeBadge />
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Audio check
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          소리 확인
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          보호자가 기기 소리 또는 헤드폰 연결이 적절한지 먼저 확인합니다. 아이가
          작은 소리와 긴 소리를 들을 준비가 되었는지 점검해 주세요.
        </p>

        <div className="mt-6 rounded-[1.5rem] bg-[var(--card-strong)] p-4 text-sm leading-7 text-[var(--muted)]">
          예시 확인 항목:
          <br />
          1. 보호자가 재생 음성을 분명히 들을 수 있음
          <br />
          2. 아이가 소리가 나온다는 점을 이해함
          <br />
          3. 주변 소음이 과도하지 않음
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <form action={submitAudioCheck}>
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="passed" value="true" />
            <button
              type="submit"
              className="w-full rounded-[1.3rem] bg-emerald-700 px-5 py-4 text-sm font-semibold text-white"
            >
              소리 확인 통과
            </button>
          </form>

          <form action={submitAudioCheck}>
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="passed" value="false" />
            <button
              type="submit"
              className="w-full rounded-[1.3rem] bg-amber-600 px-5 py-4 text-sm font-semibold text-white"
            >
              소리 확인 어려움 있음
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
