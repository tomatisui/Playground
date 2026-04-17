import Link from "next/link";
import { PrototypeBadge } from "@/components/prototype-badge";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <PrototypeBadge />
        <span className="inline-flex rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
          Phase 2 runtime
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Preschool listening-risk screening prototype
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
          Guardian consent, child setup, audio check, practice, module runtime,
          non-diagnostic report, and admin review are all wired into one simple
          mobile-first prototype.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/consent"
            className="rounded-[1.3rem] bg-[var(--accent-strong)] px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
          >
            보호자 흐름 시작
          </Link>
          <Link
            href="/admin"
            className="rounded-[1.3rem] border border-[var(--line)] bg-white px-5 py-4 text-center text-sm font-semibold"
          >
            관리자 보기
          </Link>
        </div>
      </section>
    </main>
  );
}
