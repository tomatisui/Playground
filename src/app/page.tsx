import { completeRecommendedModule, toggleModuleCompletion } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import {
  AGE_MODULES,
  MODULE_DETAILS,
  MODULE_PRIORITY,
  getCompletionSnapshot,
  getParentFacingSummary,
} from "@/lib/screening-config";

export const dynamic = "force-dynamic";

function formatModuleLabel(moduleCode: keyof typeof MODULE_DETAILS) {
  const moduleDetail = MODULE_DETAILS[moduleCode];
  return `${moduleDetail.code} ${moduleDetail.title}`;
}

export default async function Home() {
  const sessions = await prisma.screeningSession.findMany({
    include: {
      moduleAttempts: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ ageYears: "asc" }, { childLabel: "asc" }],
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <div className="flex flex-col gap-4">
          <span className="inline-flex w-fit rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            Mobile-first prototype
          </span>
          <div className="space-y-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Preschool listening-risk screening workflow
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              This prototype supports a non-diagnostic screening workflow for ages
              5 and 6. Age-specific module structure is frozen in config, module
              completion is tracked by session, and parent-facing language stays
              descriptive rather than diagnostic.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-[1.5rem] bg-[var(--card-strong)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Implementation order
              </p>
              <p className="mt-2 text-lg font-semibold">
                Engine, M3, M4, M5, M3-R, M2, M1
              </p>
            </article>
            <article className="rounded-[1.5rem] bg-[var(--card-strong)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Completion rule
              </p>
              <p className="mt-2 text-lg font-semibold">
                Compare completed modules to `expected_modules`
              </p>
            </article>
            <article className="rounded-[1.5rem] bg-[var(--card-strong)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Deferred for now
              </p>
              <p className="mt-2 text-lg font-semibold">
                Percentile norms are intentionally not implemented
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {(Object.entries(AGE_MODULES) as Array<[string, (typeof AGE_MODULES)[5]]>).map(
          ([ageKey, ageConfig]) => (
            <article
              key={ageKey}
              className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,252,247,0.8)] p-5 shadow-[0_18px_60px_rgba(63,41,19,0.07)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    Frozen structure
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    {ageConfig.label}
                  </h2>
                </div>
                <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  {ageConfig.expected_modules.length} modules
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {ageConfig.expected_modules.map((moduleCode) => (
                  <div
                    key={moduleCode}
                    className="rounded-[1.25rem] border border-[var(--line)] bg-white/80 p-4"
                  >
                    <p className="text-sm font-semibold">
                      {formatModuleLabel(moduleCode)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {MODULE_DETAILS[moduleCode].summary}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ),
        )}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[2rem] border border-[var(--line)] bg-[#2f241d] p-5 text-stone-100 shadow-[0_24px_80px_rgba(63,41,19,0.16)]">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-300">
            Common session engine
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            Shared rules across age bands
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-stone-200">
            <p>
              Expected modules come from age-based config only. Age 5 includes
              M1, M2, M3, M4, and mandatory M5. Age 6 adds mandatory M5 and
              age-specific M3-R.
            </p>
            <p>
              Admin completion uses the same engine to compare a session&apos;s
              completed modules against `expected_modules`. A session becomes
              complete only when all expected modules are present.
            </p>
            <p>
              Simplest safe assumption: each module is tracked as complete or not
              complete in this prototype. Detailed scoring and percentile norms are
              intentionally deferred.
            </p>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-300">
              Priority queue
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MODULE_PRIORITY.map((moduleCode, index) => (
                <span
                  key={moduleCode}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.14em]"
                >
                  {index + 1}. {moduleCode}
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_18px_60px_rgba(63,41,19,0.07)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Parent-facing guidance
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            Non-diagnostic result language
          </h2>
          <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[var(--card-strong)] p-4">
            <p className="text-sm leading-7 text-[var(--muted)]">
              This listening screen is designed to organize classroom observations
              and task completion. It may highlight whether follow-up support or
              observation could be helpful, but it does not diagnose hearing,
              language, attention, or learning conditions.
            </p>
            <p className="text-sm leading-7 text-[var(--muted)]">
              Percentile norms are not shown in this prototype. Results are framed
              as completed activities and follow-up needs only.
            </p>
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,252,247,0.82)] p-5 shadow-[0_18px_60px_rgba(63,41,19,0.07)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Admin completion view
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Session progress against expected modules
            </h2>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Completion status is driven by age-band configuration, not hardcoded per
            screen.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {sessions.map((session) => {
            const snapshot = getCompletionSnapshot(
              session.ageYears,
              session.moduleAttempts,
            );

            return (
              <article
                key={session.id}
                className="rounded-[1.5rem] border border-[var(--line)] bg-white/80 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        {session.classroomLabel ?? "Prototype session"}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold">
                        {session.childLabel}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {session.ageYears}-year-old screening track
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {snapshot.expected_modules.map((moduleCode) => {
                        const isComplete =
                          snapshot.completed_modules.includes(moduleCode);

                        return (
                          <span
                            key={moduleCode}
                            className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] ${
                              isComplete
                                ? "bg-emerald-200 text-emerald-900"
                                : "bg-stone-200 text-stone-700"
                            }`}
                          >
                            {moduleCode}
                          </span>
                        );
                      })}
                    </div>

                    <div className="rounded-[1.25rem] bg-[var(--card-strong)] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        Parent-facing summary
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        {getParentFacingSummary(snapshot.is_complete)}
                      </p>
                    </div>
                  </div>

                  <div className="w-full max-w-md space-y-3">
                    <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--card)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          Completion
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] ${
                            snapshot.is_complete
                              ? "bg-emerald-200 text-emerald-900"
                              : "bg-amber-200 text-amber-900"
                          }`}
                        >
                          {snapshot.completed_modules.length}/
                          {snapshot.expected_modules.length}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                        {snapshot.is_complete
                          ? "All expected modules are complete for this age band."
                          : snapshot.next_module
                            ? `Next recommended module: ${formatModuleLabel(snapshot.next_module)}.`
                            : "No next module is recommended yet."}
                      </p>
                      {snapshot.unexpected_modules.length > 0 ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--accent-strong)]">
                          Unexpected completions detected:{" "}
                          {snapshot.unexpected_modules.join(", ")}
                        </p>
                      ) : null}
                    </div>

                    <form action={completeRecommendedModule}>
                      <input type="hidden" name="sessionId" value={session.id} />
                      <button
                        type="submit"
                        className="w-full rounded-[1.1rem] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!snapshot.next_module}
                      >
                        Mark recommended next module complete
                      </button>
                    </form>

                    <div className="grid gap-2">
                      {snapshot.expected_modules.map((moduleCode) => {
                        const isComplete =
                          snapshot.completed_modules.includes(moduleCode);

                        return (
                          <form
                            key={moduleCode}
                            action={toggleModuleCompletion}
                            className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--line)] bg-white/70 px-4 py-3"
                          >
                            <input type="hidden" name="sessionId" value={session.id} />
                            <input type="hidden" name="moduleCode" value={moduleCode} />
                            <input
                              type="hidden"
                              name="shouldComplete"
                              value={String(!isComplete)}
                            />
                            <div>
                              <p className="text-sm font-semibold">
                                {formatModuleLabel(moduleCode)}
                              </p>
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                {isComplete
                                  ? "Completed for admin tracking"
                                  : "Pending for admin tracking"}
                              </p>
                            </div>
                            <button
                              type="submit"
                              className={`rounded-full px-3 py-2 text-xs font-semibold tracking-[0.14em] ${
                                isComplete
                                  ? "bg-stone-200 text-stone-700"
                                  : "bg-emerald-200 text-emerald-900"
                              }`}
                            >
                              {isComplete ? "Reset" : "Complete"}
                            </button>
                          </form>
                        );
                      })}
                    </div>
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
