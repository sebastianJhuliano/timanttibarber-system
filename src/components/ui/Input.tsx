import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s/g, '-')
  return (
    <label htmlFor={inputId} className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-barber-500 focus:outline-none focus:ring-2 focus:ring-barber-500/30 ${className}`}
        {...props}
      />
    </label>
  )
}
