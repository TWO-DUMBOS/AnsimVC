type FieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  suffix?: string
  type?: "text" | "number"
}

export default function Field({ label, value, onChange, suffix, type = "text" }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center rounded-md border border-border bg-surface px-3 focus-within:border-brand">
        <input
          type={type}
          inputMode={type === "number" ? "numeric" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent py-2 outline-none"
        />
        {suffix && <span className="ml-2 shrink-0 text-sm text-muted">{suffix}</span>}
      </div>
    </label>
  )
}
