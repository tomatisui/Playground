import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildLimitationsText,
  buildNextActionText,
  buildObservedText,
  getReportLevel,
  getReportLevelCopy,
  getSessionEngineSnapshot,
  getSessionWithDetails,
  touchSessionRoute,
} from "@/lib/session-runtime";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionWithDetails(id);

  if (!session) {
    notFound();
  }

  await touchSessionRoute(id, `/session/${id}/report`, null);

  const level = getReportLevel({
    moduleAttempts: session.moduleAttempts,
    qualityFlags: session.qualityFlags,
  });
  const snapshot = getSessionEngineSnapshot(session);
  const observedText = buildObservedText({
    moduleAttempts: session.moduleAttempts,
    qualityFlags: session.qualityFlags,
  });
  const limitationsText = buildLimitationsText();
  const nextActionText = buildNextActionText(level);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Parent-facing report
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          비진단적 관찰 요약
        </h1>
        <div className="mt-6 rounded-[1.6rem] bg-[var(--accent-strong)] p-5 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-white/80">
            Current level
          </p>
          <p className="mt-2 text-2xl font-semibold">{getReportLevelCopy(level)}</p>
        </div>

        <div className="mt-6 space-y-4">
          <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              무엇이 관찰되었나요?
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {observedText}
            </p>
          </article>

          <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              해석의 한계
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {limitationsText}
            </p>
          </article>

          <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              다음 권장 행동
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {nextActionText}
            </p>
          </article>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/session/${session.id}/practice`}
            className="flex-1 rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-3 text-center text-sm font-semibold"
          >
            세션으로 돌아가기
          </Link>
          <Link
            href="/admin"
            className="flex-1 rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-center text-sm font-semibold text-white"
          >
            관리자 보기
          </Link>
        </div>

        <div className="mt-6 rounded-[1.4rem] bg-[var(--card-strong)] p-4 text-sm leading-7 text-[var(--muted)]">
          완료된 모듈: {snapshot.completed_modules.length}/{snapshot.expected_modules.length}
        </div>
      </section>
    </main>
  );
}
