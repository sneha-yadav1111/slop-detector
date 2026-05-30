import { cn } from '@/lib/utils'

/** Shared Slop Detector mark — hex frame + density bars + scan axis */
export function Logo({
  className,
  size = 28,
  title = 'Slop Detector',
}: {
  className?: string
  size?: number
  title?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <polygon
        points="16,2 27.5,8.5 27.5,23.5 16,30 4.5,23.5 4.5,8.5"
        className="stroke-current"
        strokeWidth="1.75"
        fill="none"
      />
      <path
        d="M7.5 21.5h17"
        className="stroke-current"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path
        d="M9.5 16.5h13"
        className="stroke-current"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M12 11.5h5"
        className="stroke-current"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M16 9v14"
        className="stroke-current"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="16" cy="9" r="1.75" className="fill-current" />
      <path
        d="M16 9 L24 14"
        className="stroke-current"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  )
}

/** Logo inside the standard hex clip container used across the app */
export function LogoBadge({
  className,
  iconClassName,
  size = 28,
  variant = 'default',
}: {
  className?: string
  iconClassName?: string
  size?: number
  variant?: 'default' | 'solid' | 'muted'
}) {
  const shell =
    variant === 'solid'
      ? 'hex-icon bg-signal-cyan text-signal-bg'
      : variant === 'muted'
        ? 'hex-icon bg-signal-cyan/10 border border-signal-cyan/30 text-signal-cyan'
        : 'hex-icon bg-signal-cyan text-signal-bg'

  return (
    <div className={cn(shell, 'flex items-center justify-center', className)}>
      <Logo size={size} className={iconClassName} />
    </div>
  )
}
