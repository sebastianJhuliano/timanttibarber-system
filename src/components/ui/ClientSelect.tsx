import { Search, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Cliente } from '../../lib/types'

interface ClientSelectProps {
  clientes: Cliente[]
  value: string
  onChange: (id: string) => void
}

export function ClientSelect({ clientes, value, onChange }: ClientSelectProps) {
  const [open, setOpen] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const seleccionado = clientes.find((c) => c.id === value)

  const filtrados = busqueda.trim()
    ? clientes.filter((c) =>
        `${c.nombre} ${c.apellido}`.toLowerCase().includes(busqueda.toLowerCase()),
      )
    : clientes

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-300">Cliente</span>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(!open) }}
          onClick={() => setOpen(!open)}
          className="flex cursor-pointer items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
        >
          <Search size={16} className="mr-2 shrink-0 text-slate-500" />
          <span className="flex-1 truncate">
            {seleccionado ? `${seleccionado.nombre} ${seleccionado.apellido}` : 'Seleccionar cliente'}
          </span>
          <ChevronDown size={16} className="shrink-0 text-slate-500" />
        </div>
      </label>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="border-b border-slate-700 p-2">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-barber-500/30"
              autoFocus
            />
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {filtrados.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-500">Sin resultados</li>
            ) : (
              filtrados.map((c) => (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={c.id === value}
                  className={`cursor-pointer px-4 py-2.5 text-sm hover:bg-slate-800 ${
                    c.id === value ? 'bg-barber-500/10 text-barber-400' : 'text-slate-200'
                  }`}
                  onClick={() => {
                    onChange(c.id)
                    setOpen(false)
                    setBusqueda('')
                  }}
                >
                  {c.nombre} {c.apellido}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
