import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionWithDetails, touchSessionRoute } from "@/lib/session-runtime";

export const dynamic = "force-dynamic";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionWithDetails(id);

  if (!session) {
    redirect("/child-info");
  }

  await touchSessionRoute(session.id, `/session/${session.id}/consultation`, null);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Consultation
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          상담 안내
        </h1>
        <div className="mt-5 space-y-3 text-base leading-8 text-[var(--foreground)]">
          <p>볼륨 조절에 어려움이 있어 검사를 종료합니다.</p>
          <p>아래 방법으로 상담을 받아 주세요.</p>
        </div>

        <div className="mt-6 space-y-3 rounded-[1.5rem] border border-[var(--line)] bg-white/85 p-5">
          <p className="text-base leading-8">
            전화 상담:{" "}
            <a
              href="tel:070-4348-3567"
              className="font-semibold text-[var(--accent-strong)] underline underline-offset-4"
            >
              070-4348-3567
            </a>
          </p>
          <p className="text-base leading-8">
            카톡 상담: <span className="font-semibold">tomatis</span>
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href="tel:070-4348-3567"
            className="inline-flex w-full justify-center rounded-[1.3rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white"
          >
            전화 상담 연결
          </a>
          <Link
            href="/consent"
            className="inline-flex w-full justify-center rounded-[1.3rem] border border-[var(--line)] bg-white px-5 py-4 text-sm font-semibold"
          >
            처음으로
          </Link>
        </div>
      </section>
    </main>
  );
}
