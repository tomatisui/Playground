import { createSession } from "@/app/actions";
import { ChildInfoForm } from "@/components/child-info-form";
import { PrototypeBadge } from "@/components/prototype-badge";

function getSeoulTodayParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
  };
}

export default async function ChildInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const seoulToday = getSeoulTodayParts();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(63,41,19,0.08)] sm:p-8">
        <PrototypeBadge />
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

        {error ? (
          <div className="mt-5 rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
            {error === "missing-child-label"
              ? "아동 이름 또는 식별명을 입력해 주세요."
              : error === "missing-guardian-phone"
                ? "휴대폰 번호를 입력해 주세요."
                : error === "invalid-guardian-phone"
                  ? "휴대폰 번호는 11자리 숫자로 입력해 주세요."
                  : error === "missing-birth-date"
                    ? "태어난 연도, 달, 날짜를 모두 선택해 주세요."
                    : error === "invalid-age-range"
                      ? "선택한 생년월일이 현재 기준 만 5세 또는 만 6세 범위에 해당하지 않습니다."
                      : error === "duplicate-guardian-child"
                        ? "같은 휴대폰 번호와 같은 아동 이름이 이미 등록되어 있습니다. 아동 이름을 구분해서 다시 입력해 주세요."
              : "세션 정보가 없어서 처음부터 다시 시작해 주세요."}
          </div>
        ) : null}

        <ChildInfoForm action={createSession} seoulToday={seoulToday} />
      </section>
    </main>
  );
}
