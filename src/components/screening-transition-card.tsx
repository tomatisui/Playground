"use client";

import Link from "next/link";
import { ChildStageHeader } from "@/components/child-stage-header";
import type { ChildStageLabel } from "@/lib/child-ui-copy";

type ScreeningTransitionCardProps = {
  screenKey: string;
  stageLabel: ChildStageLabel;
  instructionLine: string;
  body: string;
  bullets?: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  tone?: "warm" | "cool";
  emphasis?: "default" | "strong";
  audioText?: string;
};

export function ScreeningTransitionCard({
  stageLabel,
  instructionLine,
  body,
  bullets = [],
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  tone = "warm",
  emphasis = "default",
}: ScreeningTransitionCardProps) {
  return (
    <div className="space-y-4">
      <ChildStageHeader
        stageLabel={stageLabel}
        instructionLine={instructionLine}
        tone={tone}
        emphasis={emphasis}
      />

      <div
        className={`rounded-[1.4rem] border p-5 ${
          tone === "cool"
            ? "border-[rgba(58,111,168,0.28)] bg-[rgba(58,111,168,0.08)]"
            : "border-[var(--line)] bg-[var(--card-strong)]"
        }`}
      >
        <p className="text-sm leading-7 text-[var(--foreground)]">{body}</p>
        {bullets.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--muted)]">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span className="mt-[0.48rem] h-1.5 w-1.5 rounded-full bg-[var(--accent-strong)]" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={primaryHref}
          className={`flex-1 rounded-[1.2rem] px-4 py-3 text-center text-sm font-semibold text-white ${
            tone === "cool"
              ? "bg-[rgb(58,111,168)]"
              : "bg-[var(--accent-strong)]"
          }`}
        >
          {primaryLabel}
        </Link>
        {secondaryLabel && secondaryHref ? (
          <Link
            href={secondaryHref}
            className="flex-1 rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-3 text-center text-sm font-semibold"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
