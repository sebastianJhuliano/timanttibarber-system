import type { ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral'

const styles: Record<BadgeVariant, string> = {
  success: 'bg-barber-500/20 text-barber-300 border-barber-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-300 border-red-500/30',
  neutral: 'bg-slate-700/50 text-slate-300 border-slate-600',
}

export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: BadgeVariant
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  )
}
