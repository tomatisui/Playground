import { redirect } from "next/navigation";
import { ScreeningTransitionCard } from "@/components/screening-transition-card";
import {
  getSessionEngineSnapshot,
  getSessionWithDetails,
  isConsultationEndedSession,
  touchSessionRoute,
} from "@/lib/session-runtime";
import {
  ModuleCode,
} from "@/lib/screening-config";
import {
  buildAllTestsCompleteHref,
  buildConsultationHref,
  getAllTestsCompleteCopy,
  getModuleKoreanLabel,
  getPracticeStartCopy,
} from "@/lib/screening-flow";

export const dynamic = "force-dynamic";

function isModuleCode(value: string): value is ModuleCode {
  return ["M1", "M2", "M3", "M3-R", "M4", "M5"].includes(value);
}

export default async function SessionTransitionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    screen?: string;
    module?: string;
    previous?: string;
  }>;
}) {
  const { id } = await params;
  const { screen, module, previous } = await searchParams;
  const session = await getSessionWithDetails(id);

  if (!session) {
    redirect("/child-info");
  }

  if (isConsultationEndedSession(session)) {
    redirect(buildConsultationHref(session.id));
  }

  const snapshot = getSessionEngineSnapshot(session);

  if (screen === "all-tests-complete") {
    const copy = getAllTestsCompleteCopy();
    await touchSessionRoute(id, `/session/${id}/transition?screen=all-tests-complete`, null);

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
          <ScreeningTransitionCard
            screenKey={`all-complete-${session.id}`}
            stageLabel="검사"
            instructionLine={copy.title}
            body={copy.body}
            bullets={copy.bullets}
            primaryLabel={copy.primaryLabel}
            primaryHref={`/session/${session.id}/report`}
            audioText={copy.audioText}
            tone="cool"
            emphasis="strong"
          />
        </section>
      </main>
    );
  }

  const targetModule =
    module && isModuleCode(module)
      ? module
      : snapshot.next_module;

  if (!targetModule) {
    redirect(buildAllTestsCompleteHref(session.id));
  }

  const previousModule =
    previous && isModuleCode(previous) ? previous : null;
  const copy = getPracticeStartCopy(targetModule, previousModule);
  const practiceHref =
    process.env.NODE_ENV === "development" && module && isModuleCode(module)
      ? `/session/${session.id}/practice?module=${targetModule}`
      : `/session/${session.id}/practice`;

  await touchSessionRoute(
    id,
    `/session/${id}/transition?screen=practice-start&module=${targetModule}${
      previousModule ? `&previous=${previousModule}` : ""
    }`,
    targetModule,
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <ScreeningTransitionCard
          screenKey={`practice-start-${session.id}-${targetModule}-${previousModule ?? "first"}`}
          stageLabel="연습"
          instructionLine={copy.title}
          body={copy.body}
          bullets={copy.bullets}
          primaryLabel={copy.primaryLabel}
          primaryHref={practiceHref}
          audioText={copy.audioText}
          secondaryLabel={previousModule ? `${getModuleKoreanLabel(previousModule)} 다시 보기` : undefined}
          secondaryHref={undefined}
        />
      </section>
    </main>
  );
}
