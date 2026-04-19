import type { ChildStageLabel } from "@/lib/child-ui-copy";

export function ChildStageHeader({
  stageLabel,
  instructionLine,
  progressLabel,
  emphasis = "default",
}: {
  stageLabel: ChildStageLabel;
  instructionLine: string;
  progressLabel?: string;
  emphasis?: "default" | "strong";
}) {
  return (
    <div
      className={`rounded-[1.4rem] border p-4 ${
        emphasis === "strong"
          ? "border-[rgba(201,111,59,0.34)] bg-[rgba(201,111,59,0.08)]"
          : "border-[var(--line)] bg-[var(--card-strong)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`font-semibold tracking-[0.14em] ${
              emphasis === "strong"
                ? "text-sm text-[var(--accent-strong)]"
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
          <span className="rounded-full bg-[rgba(201,111,59,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
            {progressLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
