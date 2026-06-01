interface Props {
  label: string
  active: boolean
  negative?: boolean
}

export function SignalChip({ label, active, negative = false }: Props) {
  const isGood = negative ? !active : active
  const cls = active
    ? isGood
      ? 'border-console-green/40 bg-console-green/10 text-console-green'
      : 'border-console-red/40 bg-console-red/10 text-console-red'
    : 'border-console-border bg-console-panel text-console-text-dim line-through opacity-50'
  const icon = active ? (isGood ? '✓' : '✗') : '–'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-3 py-1 font-mono text-[11px] font-medium ${cls}`}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  )
}
