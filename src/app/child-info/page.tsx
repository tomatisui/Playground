import { createSession } from "@/app/actions";

export default function ChildInfoPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Child info
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          아동 기본 정보
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          세션 기록은 평가 시작 전에 생성됩니다. 가장 단순한 보호자/아동 기본
          정보만 받습니다.
        </p>

        <form action={createSession} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">아동 이름 또는 식별명</span>
            <input
              name="childLabel"
              required
              className="w-full rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-sm"
              placeholder="예: 민서"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">보호자 이름</span>
            <input
              name="guardianName"
              className="w-full rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-sm"
              placeholder="예: 김보호"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">관계</span>
            <input
              name="guardianRelationship"
              className="w-full rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-sm"
              placeholder="예: 어머니"
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">연령 선택</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-4">
                <input type="radio" name="ageYears" value="5" defaultChecked />
                <span className="ml-3 text-sm font-semibold">만 5세</span>
              </label>
              <label className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-4">
                <input type="radio" name="ageYears" value="6" />
                <span className="ml-3 text-sm font-semibold">만 6세</span>
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            className="w-full rounded-[1.3rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
          >
            세션 생성 후 오디오 확인으로 이동
          </button>
        </form>
      </section>
    </main>
  );
}
