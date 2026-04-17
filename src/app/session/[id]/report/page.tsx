import Link from "next/link";
import { PrototypeBadge } from "@/components/prototype-badge";
import {
  buildLimitationsText,
  buildNextActionText,
  buildObservedText,
  getPrototypeGradeStatus,
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
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
          <PrototypeBadge />
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Parent-facing report
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            세션을 찾을 수 없습니다
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            보고서를 불러올 세션 정보가 없습니다. 새 세션을 만들거나 관리자
            화면에서 기존 세션을 확인해 주세요.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/child-info"
              className="flex-1 rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-center text-sm font-semibold text-white"
            >
              새 세션 만들기
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

  await touchSessionRoute(id, `/session/${id}/report`, null);

  const level = getReportLevel({
    moduleAttempts: session.moduleAttempts,
    qualityFlags: session.qualityFlags,
  });
  const snapshot = getSessionEngineSnapshot(session);
  const observedText = buildObservedText({
    moduleAttempts: session.moduleAttempts,
    qualityFlags: session.qualityFlags,
    ageYears: session.ageYears,
  });
  const limitationsText = buildLimitationsText();
  const nextActionText = buildNextActionText(level);
  const prototypeGradeStatus = getPrototypeGradeStatus(session);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <PrototypeBadge />
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Parent-facing report
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          비진단적 관찰 요약
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          이 화면은 보호자와 내부 테스트를 위한 프로토타입 요약입니다. 결과는
          관찰 수준의 안내이며 진단이나 규준 백분위를 의미하지 않습니다.
        </p>
        <div className="mt-6 rounded-[1.6rem] bg-[var(--accent-strong)] p-5 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-white/80">
            Current level
          </p>
          <p className="mt-2 text-2xl font-semibold">{getReportLevelCopy(level)}</p>
          {prototypeGradeStatus === "prototype_grade" ? (
            <p className="mt-3 text-sm leading-6 text-white/85">
              일부 활동은 내부 프로토타입 콘텐츠 기준으로 진행되어 이번 안내는
              참고용 관찰 요약에 더 가깝습니다.
            </p>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          {prototypeGradeStatus === "prototype_grade" ? (
            <article className="rounded-[1.4rem] border border-[var(--line)] bg-white/85 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                프로토타입 안내
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                이번 세션에는 예비 콘텐츠, 대체 오디오, 또는 축소된 프로토타입 범위의
                활동이 포함될 수 있어 결과는 부드러운 관찰 참고로 이해하는 것이
                적절합니다.
              </p>
            </article>
          ) : null}

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
