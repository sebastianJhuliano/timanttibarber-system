import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, id, className = '', ...props }: SelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s/g, '-')
  return (
    <label htmlFor={selectId} className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <select
        id={selectId}
        className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:border-barber-500 focus:outline-none focus:ring-2 focus:ring-barber-500/30 ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
