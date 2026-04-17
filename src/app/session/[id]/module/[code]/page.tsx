import Link from "next/link";
import { notFound } from "next/navigation";
import { completePlaceholderModule } from "@/app/actions";
import { ModuleRunner } from "@/components/module-runner";
import { getModuleDefinition } from "@/lib/module-catalog";
import { parseResponseLog, getSessionWithDetails, getSessionEngineSnapshot, touchSessionRoute, upsertQualityFlag } from "@/lib/session-runtime";

export const dynamic = "force-dynamic";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ id: string; code: string }>;
}) {
  const { id, code } = await params;
  const session = await getSessionWithDetails(id);

  if (!session) {
    notFound();
  }

  const snapshot = getSessionEngineSnapshot(session);
  const definition = getModuleDefinition(code);

  if (!definition || !snapshot.expected_modules.includes(code as never)) {
    notFound();
  }

  const attempt =
    session.moduleAttempts.find((item) => item.moduleCode === code) ?? null;

  if (
    attempt &&
    attempt.lastItemIndex > 0 &&
    !attempt.completedAt
  ) {
    await upsertQualityFlag(
      session.id,
      "interrupted_session",
      `Session resumed in ${code} after progress had already started.`,
    );
  }

  await touchSessionRoute(session.id, `/session/${session.id}/module/${code}`, code);

  if (!definition.implemented) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Module placeholder
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            {definition.code} {definition.title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            {definition.placeholderCopy}
          </p>

          <form action={completePlaceholderModule} className="mt-6">
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="moduleCode" value={definition.code} />
            <button
              type="submit"
              className="w-full rounded-[1.3rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white"
            >
              플레이스홀더 완료 후 다음 단계로 이동
            </button>
          </form>
        </section>
      </main>
    );
  }

  const nextHref = snapshot.remaining_modules.length === 1 &&
    snapshot.remaining_modules[0] === code
    ? `/session/${session.id}/report`
    : `/session/${session.id}/practice`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Module runtime
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
              {definition.code} {definition.title}
            </h1>
          </div>
          <Link
            href={`/session/${session.id}/report`}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
          >
            보고서 보기
          </Link>
        </div>

        <div className="mt-6">
          <ModuleRunner
            sessionId={session.id}
            moduleCode={definition.code}
            playbackType={definition.playbackType ?? "tts"}
            title={`${definition.code} ${definition.title}`}
            instructions={definition.instructions ?? ""}
            items={definition.testItems ?? []}
            initialIndex={attempt?.completedAt ? (definition.testItems ?? []).length : attempt?.lastItemIndex ?? 0}
            initialResponses={parseResponseLog(attempt?.responseLog ?? null)}
            initialAssistCount={attempt?.caregiverAssistCount ?? 0}
            nextHref={nextHref}
          />
        </div>
      </section>
    </main>
  );
}
