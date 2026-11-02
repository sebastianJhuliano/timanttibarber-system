import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-slate-800 p-3 text-slate-400">
        <Icon size={28} />
      </div>
      <p className="font-medium text-slate-200">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  )
}
