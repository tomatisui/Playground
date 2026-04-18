import Link from "next/link";
import { completePlaceholderModule } from "@/app/actions";
import { ModuleRunner } from "@/components/module-runner";
import { PrototypeBadge } from "@/components/prototype-badge";
import { SequenceModuleRunner } from "@/components/sequence-memory-runner";
import { getContentAssetStatus, getModuleDefinition } from "@/lib/module-catalog";
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
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
          <PrototypeBadge />
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Module runtime
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            세션을 찾을 수 없습니다
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            세션 링크가 만료되었거나 잘못된 주소일 수 있습니다. 새 세션을 만들어
            다시 시작해 주세요.
          </p>
          <Link
            href="/child-info"
            className="mt-6 inline-flex w-full justify-center rounded-[1.3rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white"
          >
            새 세션 만들기
          </Link>
        </section>
      </main>
    );
  }

  const snapshot = getSessionEngineSnapshot(session);
  const definition = getModuleDefinition(code, session.ageYears);

  if (!definition || !snapshot.expected_modules.includes(code as never)) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
          <PrototypeBadge />
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Module runtime
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            모듈 구성을 불러올 수 없습니다
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            이 세션 연령대에 맞지 않거나 설정이 누락된 모듈입니다. 연습 화면으로
            돌아가거나 관리자 화면에서 세션 상태를 확인해 주세요.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/session/${id}/practice`}
              className="flex-1 rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-center text-sm font-semibold text-white"
            >
              연습 화면으로 이동
            </Link>
            <Link
              href="/admin"
              className="flex-1 rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-3 text-center text-sm font-semibold"
            >
              관리자 보기
            </Link>
          </div>
        </section>
      </main>
    );
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
          <PrototypeBadge />
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Module placeholder
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            {definition.moduleCode} {definition.title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            {definition.placeholderCopy}
          </p>

          <form action={completePlaceholderModule} className="mt-6">
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="moduleCode" value={definition.moduleCode} />
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
        <PrototypeBadge />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Module runtime
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
              {definition.moduleCode} {definition.title}
            </h1>
          </div>
          <Link
            href={`/session/${session.id}/report`}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
          >
            보고서 보기
          </Link>
        </div>
        <div className="mt-4 rounded-[1.2rem] bg-[var(--card-strong)] p-4 text-sm leading-7 text-[var(--muted)]">
          콘텐츠 상태: {getContentAssetStatus(code, session.ageYears)}
        </div>

        {(definition.testItems?.length ?? 0) > 0 ? (
          <div className="mt-6">
            {definition.moduleCode === "M3" || definition.moduleCode === "M3-R" ? (
              <SequenceModuleRunner
                sessionId={session.id}
                moduleCode={definition.moduleCode}
                title={`${definition.moduleCode} ${definition.title}`}
                instructions={definition.instructions ?? ""}
                instructionText={definition.instructionText ?? definition.instructions ?? ""}
                instructionAudio={definition.instructionAudio}
                visibleChoiceCount={definition.visibleChoiceCount ?? 6}
                items={definition.testItems ?? []}
                initialIndex={attempt?.completedAt ? (definition.testItems ?? []).length : attempt?.lastItemIndex ?? 0}
                initialResponses={parseResponseLog(attempt?.responseLog ?? null)}
                initialAssistCount={attempt?.caregiverAssistCount ?? 0}
                nextHref={nextHref}
              />
            ) : (
              <ModuleRunner
                sessionId={session.id}
                moduleCode={definition.moduleCode}
                playbackType={definition.playbackType ?? "tts"}
                title={`${definition.moduleCode} ${definition.title}`}
                instructions={definition.instructions ?? ""}
                items={definition.testItems ?? []}
                initialIndex={attempt?.completedAt ? (definition.testItems ?? []).length : attempt?.lastItemIndex ?? 0}
                initialResponses={parseResponseLog(attempt?.responseLog ?? null)}
                initialAssistCount={attempt?.caregiverAssistCount ?? 0}
                nextHref={nextHref}
              />
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
              이 모듈의 본 문항 구성이 아직 비어 있어 실행할 수 없습니다. 관리자
              확인 또는 다른 세션 테스트를 권장합니다.
            </div>
            <Link
              href={`/session/${session.id}/practice`}
              className="inline-flex w-full justify-center rounded-[1.3rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white"
            >
              연습 화면으로 돌아가기
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
