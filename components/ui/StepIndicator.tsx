const STEP_LABELS = ["정보입력", "진단", "증명", "검증"] as const

type StepIndicatorProps = {
  current: 1 | 2 | 3 | 4
}

export default function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <ol className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const isCurrent = step === current
        const isDone = step < current
        const isLast = step === STEP_LABELS.length

        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium " +
                  (isCurrent
                    ? "border-brand bg-brand text-white"
                    : isDone
                      ? "border-muted bg-muted/20 text-muted"
                      : "border-border text-muted")
                }
              >
                {isDone ? "✓" : step}
              </div>
              <span
                className={
                  "text-xs " +
                  (isCurrent ? "font-medium text-brand" : "text-muted" + (isDone ? "" : " opacity-60"))
                }
              >
                {label}
              </span>
            </div>

            {!isLast && (
              <div className={"mx-2 h-px flex-1 " + (isDone ? "bg-muted/40" : "bg-border")} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
