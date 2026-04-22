"use client";

function getToneClasses(seed: string) {
  const tones = [
    "from-rose-100 to-orange-50",
    "from-amber-100 to-yellow-50",
    "from-emerald-100 to-teal-50",
    "from-sky-100 to-cyan-50",
    "from-violet-100 to-fuchsia-50",
    "from-pink-100 to-rose-50",
  ];

  const value = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[value % tones.length];
}

export function ChildChoiceCard({
  label,
  imageKey,
  onClick,
  disabled,
  selected,
  hideLabel,
}: {
  label: string;
  imageKey?: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  hideLabel?: boolean;
}) {
  const toneClasses = getToneClasses(imageKey || label);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[1rem] border px-3 py-3 text-left transition disabled:opacity-50 ${
        selected
          ? "border-[var(--accent-strong)] bg-[rgba(201,111,59,0.12)]"
          : "border-[var(--line)] bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-gradient-to-br ${toneClasses}`}
        >
          <div className="h-6 w-6 rounded-full bg-white/80" />
          <div className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-white/60" />
        </div>
        {hideLabel ? null : (
          <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        )}
      </div>
    </button>
  );
}
