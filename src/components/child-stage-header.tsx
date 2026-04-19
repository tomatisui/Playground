import type { ChildStageLabel } from "@/lib/child-ui-copy";

export function ChildStageHeader({
  stageLabel,
  instructionLine,
  progressLabel,
  emphasis = "default",
  tone = "warm",
}: {
  stageLabel: ChildStageLabel;
  instructionLine: string;
  progressLabel?: string;
  emphasis?: "default" | "strong";
  tone?: "warm" | "cool";
}) {
  const strongClasses =
    tone === "cool"
      ? "border-[rgba(58,111,168,0.42)] bg-[rgba(58,111,168,0.09)]"
      : "border-[rgba(201,111,59,0.34)] bg-[rgba(201,111,59,0.08)]";
  const strongTextClasses =
    tone === "cool" ? "text-sm text-[rgb(58,111,168)]" : "text-sm text-[var(--accent-strong)]";
  const progressClasses =
    tone === "cool"
      ? "rounded-full bg-[rgba(58,111,168,0.12)] px-3 py-1 text-xs font-semibold text-[rgb(58,111,168)]"
      : "rounded-full bg-[rgba(201,111,59,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]";

  return (
    <div
      className={`rounded-[1.4rem] border p-4 ${
        emphasis === "strong"
          ? strongClasses
          : "border-[var(--line)] bg-[var(--card-strong)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`font-semibold tracking-[0.14em] ${
              emphasis === "strong"
                ? strongTextClasses
                : "text-xs text-[var(--muted)]"
            }`}
          >
            {stageLabel}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-3xl">
            {instructionLine}
          </h2>
        </div>
        {progressLabel ? (
          <span className={progressClasses}>
            {progressLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
