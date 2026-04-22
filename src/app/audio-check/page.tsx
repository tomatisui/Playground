import Link from "next/link";
import { redirect } from "next/navigation";
import { AudioCheckClient } from "@/components/audio-check-client";
import { buildConsultationHref } from "@/lib/screening-flow";
import { isConsultationEndedSession } from "@/lib/session-runtime";
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

  if (isConsultationEndedSession(session)) {
    redirect(buildConsultationHref(session.id));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <AudioCheckClient sessionId={session.id} />
      </section>
    </main>
  );
}
