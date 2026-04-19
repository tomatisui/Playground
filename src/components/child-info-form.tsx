"use client";

import { useMemo, useState } from "react";

type ChildInfoFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  seoulToday: {
    year: number;
    month: number;
    day: number;
  };
};

const RELATIONSHIP_OPTIONS = ["부모", "교사", "치료사", "그 외"] as const;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function getEligibleYears(today: { year: number }) {
  const currentYear = today.year;
  return [currentYear - 7, currentYear - 6, currentYear - 5];
}

function getAgeSnapshot(
  today: { year: number; month: number; day: number },
  year: number,
  month: number,
  day: number,
) {
  let ageYears = today.year - year;
  let ageMonths = today.month - month;
  const hasHadBirthdayThisMonth = today.day >= day;

  if (!hasHadBirthdayThisMonth) {
    ageMonths -= 1;
  }

  if (ageMonths < 0) {
    ageYears -= 1;
    ageMonths += 12;
  }

  return { ageYears, ageMonths };
}

function buildCalendarDays(year: number, month: number) {
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const dayCount = new Date(year, month, 0).getDate();
  const days: Array<number | null> = Array.from({ length: firstDayIndex }, () => null);

  for (let day = 1; day <= dayCount; day += 1) {
    days.push(day);
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

export function ChildInfoForm({ action, seoulToday }: ChildInfoFormProps) {
  const eligibleYears = useMemo(() => getEligibleYears(seoulToday), [seoulToday]);
  const [childLabel, setChildLabel] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState<string>("부모");
  const [birthYear, setBirthYear] = useState<number | "">("");
  const [birthMonth, setBirthMonth] = useState<number | "">("");
  const [birthDay, setBirthDay] = useState<number | "">("");

  const calendarDays = useMemo(() => {
    if (!birthYear || !birthMonth) {
      return [];
    }

    return buildCalendarDays(birthYear, birthMonth);
  }, [birthMonth, birthYear]);

  const ageGuide = useMemo(() => {
    if (!birthYear || !birthMonth || !birthDay) {
      return "생년월일을 선택하면 현재 기준 생활 연령을 안내합니다.";
    }

    const { ageYears, ageMonths } = getAgeSnapshot(
      seoulToday,
      birthYear,
      birthMonth,
      birthDay,
    );

    if (ageYears === 5 || ageYears === 6) {
      return `선택한 생년월일 기준 현재 생활 연령은 만 ${ageYears}세 ${ageMonths}개월입니다.`;
    }

    return "선택한 생년월일은 현재 기준 만 5세 또는 만 6세 범위에 해당하지 않습니다.";
  }, [birthDay, birthMonth, birthYear, seoulToday]);

  const ageSnapshot = useMemo(() => {
    if (!birthYear || !birthMonth || !birthDay) {
      return null;
    }

    return getAgeSnapshot(seoulToday, birthYear, birthMonth, birthDay);
  }, [birthDay, birthMonth, birthYear, seoulToday]);

  const normalizedPhone = guardianPhone.replace(/\D/g, "");
  const hasValidPhone = normalizedPhone.length === 11;
  const hasBirthDate = Boolean(birthYear && birthMonth && birthDay);
  const isAgeEligible =
    ageSnapshot !== null && (ageSnapshot.ageYears === 5 || ageSnapshot.ageYears === 6);
  const canSubmit =
    childLabel.trim().length > 0 &&
    guardianName.trim().length > 0 &&
    guardianRelationship.trim().length > 0 &&
    hasValidPhone &&
    hasBirthDate &&
    isAgeEligible;

  return (
    <form action={action} className="mt-6 space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">아동 이름 또는 식별명</span>
        <input
          name="childLabel"
          required
          minLength={1}
          value={childLabel}
          onChange={(event) => setChildLabel(event.target.value)}
          className="w-full rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-sm"
          placeholder="예: 민서"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">보호자 이름</span>
          <input
            name="guardianName"
            required
            value={guardianName}
            onChange={(event) => setGuardianName(event.target.value)}
            className="w-full rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-sm"
            placeholder="예: 김보호"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">휴대폰</span>
          <input
            name="guardianPhone"
            required
            inputMode="numeric"
            autoComplete="tel"
            value={guardianPhone}
            onChange={(event) => {
              setGuardianPhone(formatPhone(event.target.value));
            }}
            className="w-full rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-sm"
            placeholder="010-0000-0000"
          />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">관계</legend>
        <div className="grid gap-3 sm:grid-cols-4">
          {RELATIONSHIP_OPTIONS.map((option) => {
            const selected = guardianRelationship === option;

            return (
              <label
                key={option}
                className={`cursor-pointer rounded-[1rem] border px-4 py-3 text-center text-sm font-semibold transition ${
                  selected
                    ? "border-[var(--accent-strong)] bg-[rgba(201,111,59,0.12)] text-[var(--foreground)]"
                    : "border-[var(--line)] bg-white text-[var(--muted)]"
                }`}
              >
                <input
                  type="radio"
                  name="guardianRelationship"
                  value={option}
                  checked={selected}
                  onChange={() => setGuardianRelationship(option)}
                  className="sr-only"
                />
                {option}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">생년월일 선택</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              태어난 연도
            </span>
            <select
              value={birthYear}
              onChange={(event) => {
                const value = Number(event.target.value);
                setBirthYear(value || "");
                setBirthDay("");
              }}
              className="w-full rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-sm"
            >
              <option value="">연도 선택</option>
              {eligibleYears.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              태어난 달
            </span>
            <select
              value={birthMonth}
              onChange={(event) => {
                const value = Number(event.target.value);
                setBirthMonth(value || "");
                setBirthDay("");
              }}
              className="w-full rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-sm"
            >
              <option value="">달 선택</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/75 p-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[var(--muted)]">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {calendarDays.length > 0 ? (
              calendarDays.map((day, index) =>
                day ? (
                  <button
                    key={`${birthYear}-${birthMonth}-${day}`}
                    type="button"
                    onClick={() => setBirthDay(day)}
                    className={`aspect-square rounded-[0.9rem] border text-sm font-semibold transition ${
                      birthDay === day
                        ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-white"
                        : "border-[var(--line)] bg-white text-[var(--foreground)]"
                    }`}
                  >
                    {day}
                  </button>
                ) : (
                  <div key={`empty-${index}`} className="aspect-square rounded-[0.9rem]" />
                ),
              )
            ) : (
              <p className="col-span-7 text-sm leading-7 text-[var(--muted)]">
                먼저 연도와 달을 선택해 주세요.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4 text-sm leading-7 text-[var(--muted)]">
          {ageGuide}
        </div>
        {!isAgeEligible && hasBirthDate ? (
          <p className="text-xs leading-6 text-amber-800">
            생년월일은 현재 기준 만 5세 또는 만 6세 범위여야 합니다.
          </p>
        ) : null}
      </fieldset>

      {!canSubmit ? (
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4 text-xs leading-6 text-[var(--muted)]">
          {!childLabel.trim() ? <p>아동 이름 또는 식별명을 입력해 주세요.</p> : null}
          {!guardianName.trim() ? <p>보호자 이름을 입력해 주세요.</p> : null}
          {!hasValidPhone ? <p>휴대폰 번호는 11자리 숫자로 입력해 주세요.</p> : null}
          {!hasBirthDate ? <p>태어난 연도, 달, 날짜를 모두 선택해 주세요.</p> : null}
        </div>
      ) : null}

      <input type="hidden" name="birthYear" value={birthYear} />
      <input type="hidden" name="birthMonth" value={birthMonth} />
      <input type="hidden" name="birthDay" value={birthDay} />

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-[1.3rem] bg-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
      >
        세션 생성 후 오디오 확인으로 이동
      </button>
    </form>
  );
}
