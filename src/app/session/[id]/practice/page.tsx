import Link from "next/link";
import { redirect } from "next/navigation";
import { PracticeRunner } from "@/components/practice-runner";
import { SequencePracticeRunner } from "@/components/sequence-memory-runner";
import { getModuleDefinition } from "@/lib/module-catalog";
import { buildConsultationHref } from "@/lib/screening-flow";
import {
  getSessionEngineSnapshot,
  getSessionWithDetails,
  isConsultationEndedSession,
  touchSessionRoute,
} from "@/lib/session-runtime";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionWithDetails(id);

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Practice
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

  if (isConsultationEndedSession(session)) {
    redirect(buildConsultationHref(session.id));
  }

  const snapshot = getSessionEngineSnapshot(session);

  if (!snapshot.next_module) {
    await touchSessionRoute(id, `/session/${id}/report`, null);
    redirect(`/session/${id}/report`);
  }

  await touchSessionRoute(id, `/session/${id}/practice`, snapshot.next_module);

  const definition = getModuleDefinition(snapshot.next_module, session.ageYears);

  if (!definition) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Practice
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            연습 구성을 불러올 수 없습니다
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            다음 모듈의 설정이 누락되어 이 화면을 이어갈 수 없습니다. 관리자
            화면에서 세션 상태를 확인해 주세요.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex w-full justify-center rounded-[1.3rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white"
          >
            관리자 보기로 이동
          </Link>
        </section>
      </main>
    );
  }

  const attempt =
    session.moduleAttempts.find(
      (item) => item.moduleCode === snapshot.next_module,
    ) ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        {definition.implemented ? (
          (definition.practiceItems?.length ?? 0) > 0 ? (
            <div>
              {definition.moduleCode === "M3" || definition.moduleCode === "M3-R" ? (
                <SequencePracticeRunner
                  sessionId={session.id}
                  moduleCode={definition.moduleCode}
                  trainingMasteryThreshold={
                    definition.preLearning?.trainingMasteryThreshold ?? 0.5
                  }
                  familiarizationItems={definition.trainingPool ?? []}
                  practiceItems={definition.practiceItems ?? []}
                  initialPracticeRuns={attempt?.practiceRuns ?? 0}
                  initialPracticeFailures={attempt?.practiceFailures ?? 0}
                  moduleHref={`/session/${session.id}/module/${definition.moduleCode}`}
                />
              ) : (
                <PracticeRunner
                  sessionId={session.id}
                  moduleCode={definition.moduleCode}
                  playbackType={definition.playbackType ?? "tts"}
                  instructions={definition.instructions ?? ""}
                  instructionText={definition.instructionText ?? definition.instructions ?? ""}
                  instructionAudio={definition.instructionAudio}
                  items={definition.practiceItems ?? []}
                  trainingPool={definition.trainingPool ?? []}
                  trainingMasteryThreshold={
                    definition.preLearning?.trainingMasteryThreshold ?? 0.5
                  }
                  initialPracticeRuns={attempt?.practiceRuns ?? 0}
                  initialPracticeFailures={attempt?.practiceFailures ?? 0}
                  moduleHref={`/session/${session.id}/module/${definition.moduleCode}`}
                />
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                이 모듈의 연습 문항이 아직 비어 있습니다. 본 과제로 바로 이동해
                수동 테스트를 계속할 수 있습니다.
              </div>
              <Link
                href={`/session/${session.id}/module/${definition.moduleCode}`}
                className="inline-flex w-full justify-center rounded-[1.3rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white"
              >
                본 과제로 이동
              </Link>
            </div>
          )
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4 text-sm leading-7 text-[var(--muted)]">
              {definition.placeholderCopy}
            </div>
            <Link
              href={`/session/${session.id}/module/${definition.moduleCode}`}
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
