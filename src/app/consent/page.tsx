import Link from "next/link";

export default function ConsentPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Consent
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          보호자 동의 및 안내
        </h1>
        <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--muted)]">
          <p>
            이 프로토타입은 유아의 듣기 관련 과제를 짧게 관찰하기 위한
            비진단적 스크리닝 흐름입니다. 결과는 일상 관찰을 돕기 위한 정보이며
            청각, 언어, 주의, 발달 상태를 진단하지 않습니다.
          </p>
          <p>
            과제 수행은 기기 음량, 주변 소음, 피로, 낯섦, 보호자 도움 여부에
            영향을 받을 수 있습니다. 백분위 규준은 아직 제공되지 않습니다.
          </p>
          <p>
            동의 후 기본 정보를 입력하면 세션 기록이 생성되고, 그 뒤에 오디오
            확인과 연습 과제가 이어집니다.
          </p>
        </div>

        <div className="mt-6 rounded-[1.5rem] bg-[var(--card-strong)] p-4 text-sm leading-7 text-[var(--muted)]">
          다음 단계로 이동하면 보호자가 위 안내를 읽고 비진단적 성격을 이해한
          것으로 간주합니다.
        </div>

        <Link
          href="/child-info"
          className="mt-6 inline-flex w-full justify-center rounded-[1.3rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
        >
          동의하고 계속
        </Link>
      </section>
    </main>
  );
}
