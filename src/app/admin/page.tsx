import Link from "next/link";
import {
  createAge5SampleRun,
  createAge6SampleRun,
  resetAllSessions,
  seedSampleSessions,
} from "@/app/actions";
import { PrototypeBadge } from "@/components/prototype-badge";
import {
  INTERNAL_BUILD_LABEL,
  INTERNAL_BUILD_NOTES,
  INTERNAL_BUILD_VERSION,
} from "@/lib/build-info";
import { prisma } from "@/lib/prisma";
import {
  getAllModuleCodes,
  getContentAssetStatus,
  getModuleAssetReadiness,
  getModuleDefinition,
  getModuleManifest,
  getModuleReadinessSummary,
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

  const moduleReadiness = getModuleReadinessSummary();
  const freezeSummary = {
    implemented: moduleReadiness.filter((module) => module.implemented).length,
    fallback: moduleReadiness.filter((module) => module.fallbackAudioInUse).length,
    reduced: moduleReadiness.filter((module) => module.reducedScope).length,
    acoustic: moduleReadiness.filter((module) => module.acousticContentNotFinal).length,
    provisional: moduleReadiness.filter((module) => module.provisionalContent).length,
  };

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
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Internal build {INTERNAL_BUILD_LABEL} · {INTERNAL_BUILD_VERSION}
            </p>
            <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
              {INTERNAL_BUILD_NOTES}
            </p>
          </div>
          <Link
            href="/consent"
            className="rounded-[1.2rem] bg-[var(--accent-strong)] px-4 py-3 text-center text-sm font-semibold text-white"
          >
            새 보호자 흐름 시작
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Module readiness
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {freezeSummary.implemented}/{moduleReadiness.length}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">All v0 modules are implemented.</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Fallback audio
            </p>
            <p className="mt-2 text-2xl font-semibold">{freezeSummary.fallback}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Modules currently using fallback assets.</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Reduced scope
            </p>
            <p className="mt-2 text-2xl font-semibold">{freezeSummary.reduced}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Modules marked reduced prototype scope.</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Acoustic not final
            </p>
            <p className="mt-2 text-2xl font-semibold">{freezeSummary.acoustic}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Acoustic prototype modules pending final audio.</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Sessions
            </p>
            <p className="mt-2 text-2xl font-semibold">{sessions.length}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Stored internal test sessions.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/85 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Prototype freeze summary
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-[var(--muted)]">
                  <tr>
                    <th className="pb-3 font-semibold">Module</th>
                    <th className="pb-3 font-semibold">Ready</th>
                    <th className="pb-3 font-semibold">Content</th>
                    <th className="pb-3 font-semibold">Fallback</th>
                    <th className="pb-3 font-semibold">Reduced</th>
                    <th className="pb-3 font-semibold">Acoustic</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleReadiness.map((module) => (
                    <tr key={module.moduleCode} className="border-t border-[var(--line)]">
                      <td className="py-3 font-semibold">
                        {module.moduleCode} {module.title}
                      </td>
                      <td className="py-3">{module.implemented ? "yes" : "no"}</td>
                      <td className="py-3">
                        {module.placeholder
                          ? "placeholder"
                          : module.provisionalContent
                            ? "provisional"
                            : "real"}
                      </td>
                      <td className="py-3">{module.fallbackAudioInUse ? "yes" : "no"}</td>
                      <td className="py-3">{module.reducedScope ? "yes" : "no"}</td>
                      <td className="py-3">{module.acousticContentNotFinal ? "yes" : "no"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/85 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Internal test utilities
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Internal-only helpers for local manual testing. These actions change stored session data.
            </p>
            <div className="mt-4 grid gap-3">
              <form action={seedSampleSessions}>
                <button
                  type="submit"
                  className="w-full rounded-[1.1rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white"
                >
                  샘플 세션 일괄 생성
                </button>
              </form>
              <form action={createAge5SampleRun}>
                <button
                  type="submit"
                  className="w-full rounded-[1.1rem] border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold"
                >
                  5세 샘플 런 생성
                </button>
              </form>
              <form action={createAge6SampleRun}>
                <button
                  type="submit"
                  className="w-full rounded-[1.1rem] border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold"
                >
                  6세 샘플 런 생성
                </button>
              </form>
              <form action={resetAllSessions}>
                <button
                  type="submit"
                  className="w-full rounded-[1.1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900"
                >
                  모든 세션 초기화
                </button>
              </form>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[1.5rem] border border-[var(--line)] bg-white/85 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Asset readiness matrix
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="pb-3 font-semibold">Module</th>
                  <th className="pb-3 font-semibold">Final local audio</th>
                  <th className="pb-3 font-semibold">Fallback in use</th>
                  <th className="pb-3 font-semibold">Provisional</th>
                  <th className="pb-3 font-semibold">Reduced scope</th>
                  <th className="pb-3 font-semibold">Acoustic not final</th>
                  <th className="pb-3 font-semibold">Missing audio refs</th>
                </tr>
              </thead>
              <tbody>
                {getAllModuleCodes().map((moduleCode) => {
                  const readiness = getModuleAssetReadiness(moduleCode);
                  const manifest = getModuleManifest(moduleCode);

                  return (
                    <tr key={moduleCode} className="border-t border-[var(--line)]">
                      <td className="py-3 font-semibold">
                        {moduleCode} {manifest?.title ?? "missing"}
                      </td>
                      <td className="py-3">{readiness.finalLocalAudioPresent ? "yes" : "no"}</td>
                      <td className="py-3">{readiness.fallbackAudioInUse ? "yes" : "no"}</td>
                      <td className="py-3">{readiness.provisionalContent ? "yes" : "no"}</td>
                      <td className="py-3">{readiness.reducedScope ? "yes" : "no"}</td>
                      <td className="py-3">{readiness.acousticContentNotFinal ? "yes" : "no"}</td>
                      <td className="py-3">
                        {readiness.missingLocalAudioCount}/{readiness.localAudioReferenceCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 space-y-4">
          {sessions.map((session) => {
            const snapshot = getSessionEngineSnapshot(session);
            const reportLevel = getReportLevel({
              moduleAttempts: session.moduleAttempts,
              qualityFlags: session.qualityFlags,
            });
            const prototypeGradeStatus = getPrototypeGradeStatus(session);

            return (
              <article
                key={session.id}
                className="rounded-[1.5rem] border border-[var(--line)] bg-white/85 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      {session.guardianRelationship || "Guardian"} · {session.ageYears}세
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold">{session.childLabel}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {session.guardianName || "Unnamed guardian"} · 현재 위치 {session.currentRoute || "없음"}
                    </p>
                  </div>

                  <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4 text-sm text-[var(--muted)]">
                    <p>Prototype grade: {prototypeGradeStatus}</p>
                    <p className="mt-2">Report level: {getReportLevelCopy(reportLevel)}</p>
                    <p className="mt-2">
                      Completed: {snapshot.completed_modules.length}/{snapshot.expected_modules.length}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4 text-sm text-[var(--muted)]">
                    <p className="font-semibold text-[var(--foreground)]">Session detail</p>
                    <p className="mt-2">Age: {session.ageYears}</p>
                    <p className="mt-2">Current route: {session.currentRoute || "없음"}</p>
                    <p className="mt-2">Expected modules: {snapshot.expected_modules.join(", ")}</p>
                    <p className="mt-2">
                      Completed modules:{" "}
                      {snapshot.completed_modules.length > 0
                        ? snapshot.completed_modules.join(", ")
                        : "없음"}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4 text-sm text-[var(--muted)]">
                    <p className="font-semibold text-[var(--foreground)]">Quality flags</p>
                    {session.qualityFlags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
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
                      <p className="mt-2">없음</p>
                    )}
                  </div>
                  <div className="rounded-[1.2rem] bg-[var(--card-strong)] p-4 text-sm text-[var(--muted)]">
                    <p className="font-semibold text-[var(--foreground)]">Practice / thresholds</p>
                    <p className="mt-2">
                      Active M2 threshold:{" "}
                      {getModuleManifest("M2")?.preLearning?.trainingMasteryThreshold ?? "missing"}
                    </p>
                    <p className="mt-2">
                      Next recommended module: {snapshot.next_module ?? "complete"}
                    </p>
                    <p className="mt-2">
                      Prototype content note: fallback or reduced-scope runs stay non-diagnostic.
                    </p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-left text-sm">
                    <thead className="text-[var(--muted)]">
                      <tr>
                        <th className="pb-3 font-semibold">Module</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Practice</th>
                        <th className="pb-3 font-semibold">Items</th>
                        <th className="pb-3 font-semibold">Fallback</th>
                        <th className="pb-3 font-semibold">Reduced / acoustic</th>
                        <th className="pb-3 font-semibold">Threshold / staircase</th>
                        <th className="pb-3 font-semibold">Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.expected_modules.map((moduleCode) => {
                        const attempt =
                          session.moduleAttempts.find((item) => item.moduleCode === moduleCode) ?? null;
                        const definition = getModuleDefinition(moduleCode, session.ageYears);
                        const readiness = getModuleAssetReadiness(moduleCode, session.ageYears);
                        const deliveredCount = Math.min(
                          attempt?.itemCount ?? 0,
                          definition?.testItems.length ?? 0,
                        );
                        const staircaseLevel =
                          moduleCode === "M1" && definition && deliveredCount > 0
                            ? definition.testItems[deliveredCount - 1]?.staircaseLevel ?? null
                            : null;

                        return (
                          <tr key={moduleCode} className="border-t border-[var(--line)] align-top">
                            <td className="py-3 font-semibold">
                              {moduleCode} {definition?.title ?? "missing"}
                            </td>
                            <td className="py-3">
                              {attempt?.status ?? "NOT_STARTED"}
                              {attempt?.completedAt ? " / complete" : ""}
                            </td>
                            <td className="py-3">
                              runs {attempt?.practiceRuns ?? 0}, failures {attempt?.practiceFailures ?? 0}
                            </td>
                            <td className="py-3">
                              {attempt?.itemCount ?? 0}/{definition?.testItems.length ?? 0}
                            </td>
                            <td className="py-3">
                              {getContentAssetStatus(moduleCode, session.ageYears)} /{" "}
                              {readiness.fallbackAudioInUse ? "fallback" : "final"}
                            </td>
                            <td className="py-3">
                              {readiness.reducedScope ? "reduced " : ""}
                              {readiness.acousticContentNotFinal ? "acoustic_not_final" : ""}
                              {!readiness.reducedScope && !readiness.acousticContentNotFinal
                                ? "none"
                                : ""}
                            </td>
                            <td className="py-3">
                              {moduleCode === "M2"
                                ? `threshold ${getModuleManifest("M2")?.preLearning?.trainingMasteryThreshold ?? "missing"}`
                                : moduleCode === "M1"
                                  ? `level ${staircaseLevel ?? "not_started"}`
                                  : "-"}
                            </td>
                            <td className="py-3 max-w-[280px] text-[var(--muted)]">
                              {attempt?.provisionalSummary || "아직 요약 없음"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
