import { Search } from 'lucide-react'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <Search
        size={18}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-4 text-slate-100 placeholder:text-slate-500 focus:border-barber-500 focus:outline-none focus:ring-2 focus:ring-barber-500/30"
      />
    </div>
  )
}
