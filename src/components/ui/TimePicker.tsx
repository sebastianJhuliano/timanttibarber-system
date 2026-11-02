import { useMemo, useCallback, useId } from 'react'

interface TimePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

function to12h(h24: number) {
  if (h24 === 0) return { hour: 12, period: 'AM' as const }
  if (h24 < 12) return { hour: h24, period: 'AM' as const }
  if (h24 === 12) return { hour: 12, period: 'PM' as const }
  return { hour: h24 - 12, period: 'PM' as const }
}

function to24h(hour12: number, period: 'AM' | 'PM') {
  if (period === 'AM') return hour12 === 12 ? 0 : hour12
  return hour12 === 12 ? 12 : hour12 + 12
}

function Wheel({ value, options, onChange, label, disabled }: {
  value: string
  options: string[]
  onChange: (v: string) => void
  label: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="relative flex-1">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="peer absolute inset-0 w-full appearance-none opacity-0"
        aria-label={label}
        disabled={disabled}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <div className={`pointer-events-none flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800 px-1 py-3.5 text-lg font-bold text-white transition-colors ${disabled ? 'opacity-50' : 'peer-hover:border-barber-400 peer-focus:border-barber-500 peer-focus:ring-2 peer-focus:ring-barber-500/40'}`}>
        {value}
      </div>
    </div>
  )
}

export function TimePicker({ label, value, onChange, disabled }: TimePickerProps) {
  const { hour, minute, period } = useMemo(() => {
    const [h, m] = value.split(':').map(Number)
    const { hour: h12, period: p } = to12h(h ?? 0)
    return { hour: h12, minute: m ?? 0, period: p }
  }, [value])

  const handleHourChange = useCallback(
    (v: string) => {
      const h24 = to24h(Number(v), period)
      onChange(`${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
    },
    [period, minute, onChange],
  )

  const handleMinuteChange = useCallback(
    (v: string) => {
      const h24 = to24h(hour, period)
      onChange(`${String(h24).padStart(2, '0')}:${v}`)
    },
    [period, hour, onChange],
  )

  const handlePeriodChange = useCallback(
    (v: string) => {
      const h24 = to24h(hour, v as 'AM' | 'PM')
      onChange(`${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
    },
    [hour, minute, onChange],
  )

  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
        <Wheel
          value={String(hour).padStart(2, '0')}
          options={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))}
          onChange={handleHourChange}
          label="Hora"
          disabled={disabled}
        />
        <span className="text-2xl font-bold text-slate-600">:</span>
        <Wheel
          value={String(minute).padStart(2, '0')}
          options={Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))}
          onChange={handleMinuteChange}
          label="Minuto"
          disabled={disabled}
        />
        <Wheel
          value={period}
          options={['AM', 'PM']}
          onChange={handlePeriodChange}
          label="Período"
          disabled={disabled}
        />
      </div>
    </label>
  )
}
