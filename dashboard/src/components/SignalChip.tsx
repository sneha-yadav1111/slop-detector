interface Props {
  label: string
  active: boolean
  negative?: boolean
}

export function SignalChip({ label, active, negative = false }: Props) {
  const isGood = negative ? !active : active
  const cls = active
    ? isGood
      ? 'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-data tracking-wide rounded-sm border border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan'
      : 'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-data tracking-wide rounded-sm border border-signal-red/40 bg-signal-red/10 text-signal-red'
    : 'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-data tracking-wide rounded-sm border border-signal-border bg-transparent text-signal-text-mute line-through opacity-40'
  const icon = active ? (isGood ? '✓' : '✗') : '–'
  return (
    <span className={cls}>
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  )
}
