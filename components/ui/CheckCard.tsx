export type CheckItem = {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

type CheckCardProps = {
  items: CheckItem[]
}

export default function CheckCard({ items }: CheckCardProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      {items.map((item, i) => (
        <label
          key={item.id}
          htmlFor={item.id}
          className={
            "flex cursor-pointer items-center gap-3 px-3 py-3" +
            (i !== items.length - 1 ? " border-b border-border" : "")
          }
        >
          <input
            id={item.id}
            type="checkbox"
            checked={item.checked}
            onChange={(e) => item.onChange(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          <span className="text-sm">{item.label}</span>
        </label>
      ))}
    </div>
  )
}
