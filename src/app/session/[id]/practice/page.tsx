import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PracticeRunner } from "@/components/practice-runner";
import { getModuleDefinition } from "@/lib/module-catalog";
import { getSessionWithDetails, touchSessionRoute } from "@/lib/session-runtime";
import { getSessionEngineSnapshot } from "@/lib/session-runtime";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionWithDetails(id);

  if (!session) {
    notFound();
  }

  const snapshot = getSessionEngineSnapshot(session);

  if (!snapshot.next_module) {
    await touchSessionRoute(id, `/session/${id}/report`, null);
    redirect(`/session/${id}/report`);
  }

  await touchSessionRoute(id, `/session/${id}/practice`, snapshot.next_module);

  const definition = getModuleDefinition(snapshot.next_module);

  if (!definition) {
    notFound();
  }

  const attempt =
    session.moduleAttempts.find(
      (item) => item.moduleCode === snapshot.next_module,
    ) ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Practice
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          {definition.code} 연습
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          연습은 점수화하지 않습니다. 아이가 과제 형식을 이해하도록 도와주는
          단계입니다.
        </p>

        {definition.implemented ? (
          <div className="mt-6">
            <PracticeRunner
              sessionId={session.id}
              moduleCode={definition.code}
              playbackType={definition.playbackType ?? "tts"}
              instructions={definition.instructions ?? ""}
              items={definition.practiceItems ?? []}
              initialPracticeRuns={attempt?.practiceRuns ?? 0}
              initialPracticeFailures={attempt?.practiceFailures ?? 0}
              moduleHref={`/session/${session.id}/module/${definition.code}`}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4 text-sm leading-7 text-[var(--muted)]">
              {definition.placeholderCopy}
            </div>
            <Link
              href={`/session/${session.id}/module/${definition.code}`}
              className="inline-flex w-full justify-center rounded-[1.3rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white"
            >
              플레이스홀더 모듈로 이동
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
