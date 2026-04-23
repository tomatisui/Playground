import { redirect } from "next/navigation";
import { ScreeningTransitionCard } from "@/components/screening-transition-card";
import {
  buildConsultationHref,
  buildPracticeStartHref,
  getModuleKoreanLabel,
  getOverallOrderItems,
} from "@/lib/screening-flow";
import {
  getSessionWithDetails,
  isConsultationEndedSession,
  touchSessionRoute,
} from "@/lib/session-runtime";
import { getSessionEngineSnapshot } from "@/lib/session-runtime";
import { getExpectedModules } from "@/lib/screening-config";

export const dynamic = "force-dynamic";

export default async function SessionOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionWithDetails(id);

  if (!session) {
    redirect("/child-info");
  }

  if (isConsultationEndedSession(session)) {
    redirect(buildConsultationHref(session.id));
  }

  const snapshot = getSessionEngineSnapshot(session);

  if (!snapshot.next_module) {
    await touchSessionRoute(id, `/session/${id}/report`, null);
    redirect(`/session/${id}/report`);
  }

  await touchSessionRoute(id, `/session/${id}/overview`, null);

  const orderItems = getOverallOrderItems(session.ageYears).map(
    (item) => `${item.order}. ${item.label}`,
  );
  const qaModules =
    process.env.NODE_ENV === "development"
      ? getExpectedModules(session.ageYears)
      : [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <ScreeningTransitionCard
          screenKey={`overall-order-${session.id}-${session.ageYears}`}
          stageLabel="검사"
          instructionLine="전체 검사 순서를 먼저 볼게요"
          body={`이번 검사는 만 ${session.ageYears}세 기준으로 총 ${orderItems.length}개 활동을 차례대로 진행합니다.`}
          bullets={orderItems}
          primaryLabel="첫 번째 연습 시작"
          primaryHref={buildPracticeStartHref(session.id, snapshot.next_module)}
          audioText={`이번 검사는 총 ${orderItems.length}개 활동으로 진행합니다. ${orderItems.join(", ")}. 준비가 되면 첫 번째 연습을 시작합니다.`}
        />

        {qaModules.length > 0 ? (
          <div className="mt-5 rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              QA 바로가기
            </p>
            <p className="mt-1 text-xs leading-6 text-slate-600">
              개발 환경에서만 보이는 모듈 시작점 점프입니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {qaModules.map((moduleCode) => (
                <a
                  key={moduleCode}
                  href={buildPracticeStartHref(session.id, moduleCode)}
                  className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  {getModuleKoreanLabel(moduleCode)}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
