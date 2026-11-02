import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { APP_NAME } from '../lib/constants'

export function Layout({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-24">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-barber-500">
              {APP_NAME}
            </p>
            <h1 className="truncate text-xl font-bold text-white">{title}</h1>
          </div>
          {action && (
            <div className="flex shrink-0 items-center gap-1">
              {action}
            </div>
          )}
        </div>
      </header>
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  )
}
