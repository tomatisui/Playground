import { prisma } from "@/lib/prisma";

const statusTone = {
  BACKLOG: "bg-stone-200 text-stone-700",
  IN_PROGRESS: "bg-amber-200 text-amber-900",
  DONE: "bg-emerald-200 text-emerald-900",
} as const;

export default async function Home() {
  const [taskCount, inProgressCount, completedCount, tasks] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({ where: { status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { status: "DONE" } }),
    prisma.task.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 5,
    }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--card)] shadow-[0_24px_80px_rgba(63,41,19,0.08)] backdrop-blur">
          <div className="border-b border-[var(--line)] px-6 py-4 text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
            Next.js starter
          </div>
          <div className="space-y-8 px-6 py-8 sm:px-8 sm:py-10">
            <div className="space-y-4">
              <span className="inline-flex rounded-full bg-[var(--accent)] px-3 py-1 text-sm font-semibold text-white">
                TypeScript + Tailwind + Prisma + SQLite
              </span>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
                A clean full-stack base for building the app.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                The project is wired for App Router, Tailwind v4, a local SQLite
                database, and Prisma Client generation inside `src/generated/prisma`.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
                  Total tasks
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
                  {taskCount}
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
                  In progress
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
                  {inProgressCount}
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
                  Completed
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
                  {completedCount}
                </p>
              </article>
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-[var(--line)] bg-[#2f241d] p-6 text-stone-100 shadow-[0_24px_80px_rgba(63,41,19,0.16)]">
          <p className="text-sm uppercase tracking-[0.24em] text-stone-300">
            Quick start
          </p>
          <div className="mt-6 space-y-4 text-sm leading-7 text-stone-200">
            <p>Run the app with `npm run dev`.</p>
            <p>Initialize the local database with `npm run db:init`.</p>
            <p>Open Prisma Studio anytime with `npm run db:studio`.</p>
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,252,247,0.76)] p-6 shadow-[0_18px_60px_rgba(63,41,19,0.07)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
              Recent tasks
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Database-backed starter content
            </h2>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Add API routes, server actions, or admin screens on top of this model.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-5 py-10 text-center text-[var(--muted)]">
              No tasks yet. The SQLite database is ready and waiting for your first record.
            </div>
          ) : (
            tasks.map((task) => (
              <article
                key={task.id}
                className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--line)] bg-white/80 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="text-lg font-semibold">{task.title}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {task.description ?? "No description provided yet."}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold tracking-[0.18em] ${statusTone[task.status]}`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
