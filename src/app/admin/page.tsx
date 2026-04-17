import Link from "next/link";
import { completeRecommendedModule, toggleModuleCompletion } from "@/app/actions";
import { PrototypeBadge } from "@/components/prototype-badge";
import { prisma } from "@/lib/prisma";
import {
  getContentAssetStatus,
  getModuleDefinition,
  getModuleManifest,
} from "@/lib/module-catalog";
import {
  getPrototypeGradeStatus,
  getSessionEngineSnapshot,
  getReportLevel,
  getReportLevelCopy,
} from "@/lib/session-runtime";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const sessions = await prisma.screeningSession.findMany({
    include: {
      moduleAttempts: {
        orderBy: [{ createdAt: "asc" }],
      },
      qualityFlags: {
        orderBy: [{ createdAt: "asc" }],
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <PrototypeBadge />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Admin
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
              세션 운영 대시보드
            </h1>
          </div>
          <Link
            href="/consent"
            className="rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-center text-sm font-semibold text-white"
          >
            새 보호자 흐름 시작
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {sessions.map((session) => {
            const snapshot = getSessionEngineSnapshot(session);
            const reportLevel = getReportLevel({
              moduleAttempts: session.moduleAttempts,
              qualityFlags: session.qualityFlags,
            });
            const prototypeGradeStatus = getPrototypeGradeStatus(session);
            const m5Definition = getModuleDefinition("M5", session.ageYears);
            const m5Manifest = getModuleManifest("M5");
            const m5Attempt =
              session.moduleAttempts.find((attempt) => attempt.moduleCode === "M5") ??
              null;

            return (
              <article
                key={session.id}
                className="rounded-[1.5rem] border border-[var(--line)] bg-white/85 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        {session.guardianRelationship || "Guardian"} · {session.ageYears}세
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold">{session.childLabel}</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {session.guardianName || "Unnamed guardian"} · 현재 위치 {session.currentRoute || "없음"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {snapshot.expected_modules.map((moduleCode) => {
                        const complete = snapshot.completed_modules.includes(moduleCode);

                        return (
                          <span
                            key={moduleCode}
                            className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] ${
                              complete
                                ? "bg-emerald-200 text-emerald-900"
                                : "bg-stone-200 text-stone-700"
                            }`}
                          >
                            {moduleCode}
                          </span>
                        );
                      })}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          Session visibility
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                          <p>Age: {session.ageYears}</p>
                          <p>Current route: {session.currentRoute || "없음"}</p>
                          <p>Expected modules: {snapshot.expected_modules.join(", ")}</p>
                          <p>
                            Completed modules:{" "}
                            {snapshot.completed_modules.length > 0
                              ? snapshot.completed_modules.join(", ")
                              : "없음"}
                          </p>
                          <p>Prototype grade: {prototypeGradeStatus}</p>
                        </div>
                      </div>

                      <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          Quality flags
                        </p>
                        {session.qualityFlags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {session.qualityFlags.map((flag) => (
                              <span
                                key={flag.id}
                                className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"
                              >
                                {flag.flagCode}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[var(--muted)]">없음</p>
                        )}
                      </div>

                      <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          Provisional level
                        </p>
                        <p className="mt-3 text-sm font-semibold">
                          {getReportLevelCopy(reportLevel)}
                        </p>
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          백분위 규준은 제공하지 않음
                        </p>
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          Placeholder usage:{" "}
                          {session.moduleAttempts.some((attempt) => {
                            const definition = getModuleDefinition(
                              attempt.moduleCode,
                              session.ageYears,
                            );
                            return definition?.placeholder;
                          })
                            ? "있음"
                            : "없음"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        Raw summaries
                      </p>
                      <div className="mt-3 space-y-2">
                        {session.moduleAttempts.length > 0 ? (
                          session.moduleAttempts.map((attempt) => {
                            const definition = getModuleDefinition(attempt.moduleCode);

                            return (
                              <div key={attempt.id} className="text-sm leading-7 text-[var(--muted)]">
                                <span className="font-semibold text-[var(--foreground)]">
                                  {definition ? `${definition.moduleCode} ${definition.title}` : attempt.moduleCode}
                                </span>
                                : {attempt.provisionalSummary || "아직 요약 없음"} · status {attempt.status}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-[var(--muted)]">아직 기록 없음</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        Placeholder module usage
                      </p>
                      <div className="mt-3 space-y-2">
                        {session.moduleAttempts.filter((attempt) => {
                          const definition = getModuleDefinition(
                            attempt.moduleCode,
                            session.ageYears,
                          );
                          return definition?.placeholder;
                        }).length > 0 ? (
                          session.moduleAttempts
                            .filter((attempt) => {
                              const definition = getModuleDefinition(
                                attempt.moduleCode,
                                session.ageYears,
                              );
                              return definition?.placeholder;
                            })
                            .map((attempt) => (
                              <p key={attempt.id} className="text-sm leading-7 text-[var(--muted)]">
                                {attempt.moduleCode}: placeholder flow used
                              </p>
                            ))
                        ) : (
                          <p className="text-sm text-[var(--muted)]">없음</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        M5 content debug
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                        <p>
                          Provisional prototype content:{" "}
                          {m5Manifest?.labels.includes("provisional_prototype_content")
                            ? "yes"
                            : "no"}
                        </p>
                        <p>
                          M5 items delivered: {m5Attempt?.itemCount ?? 0}
                          {m5Definition ? ` / ${m5Definition.testItems.length} configured` : ""}
                        </p>
                        <p>
                          M5 fallback audio used:{" "}
                          {getContentAssetStatus("M5", session.ageYears) === "real_assets"
                            ? "no"
                            : "yes"}
                        </p>
                        <p>
                          M5 content status: {getContentAssetStatus("M5", session.ageYears)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-md space-y-3">
                    <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--card)] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        Completion
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {snapshot.completed_modules.length}/{snapshot.expected_modules.length}
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Completed modules are compared directly against `expected_modules`.
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Next module content status:{" "}
                        {snapshot.next_module
                          ? getContentAssetStatus(snapshot.next_module, session.ageYears)
                          : "complete"}
                      </p>
                    </div>

                    <form action={completeRecommendedModule}>
                      <input type="hidden" name="sessionId" value={session.id} />
                      <button
                        type="submit"
                        className="w-full rounded-[1.1rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white"
                        disabled={!snapshot.next_module}
                      >
                        다음 추천 모듈 완료 처리
                      </button>
                    </form>

                    <div className="grid gap-2">
                      {snapshot.expected_modules.map((moduleCode) => {
                        const complete = snapshot.completed_modules.includes(moduleCode);

                        return (
                          <form
                            key={moduleCode}
                            action={toggleModuleCompletion}
                            className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3"
                          >
                            <input type="hidden" name="sessionId" value={session.id} />
                            <input type="hidden" name="moduleCode" value={moduleCode} />
                            <input type="hidden" name="shouldComplete" value={String(!complete)} />
                            <span className="text-sm font-semibold">
                              {moduleCode}
                              <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                                {getContentAssetStatus(moduleCode, session.ageYears)}
                              </span>
                            </span>
                            <button
                              type="submit"
                              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                                complete
                                  ? "bg-stone-200 text-stone-700"
                                  : "bg-emerald-200 text-emerald-900"
                              }`}
                            >
                              {complete ? "Reset" : "Complete"}
                            </button>
                          </form>
                        );
                      })}
                    </div>

                    <Link
                      href={`/session/${session.id}/report`}
                      className="block rounded-[1.1rem] border border-[var(--line)] bg-white px-4 py-3 text-center text-sm font-semibold"
                    >
                      보고서 보기
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
