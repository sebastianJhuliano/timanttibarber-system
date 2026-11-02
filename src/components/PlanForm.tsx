import { useEffect, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { Plus, UserX } from 'lucide-react'
import type { Cliente, Plan, PlanTipoConfig } from '../lib/types'
import { hoyISO } from '../lib/dates'
import { formatTelefono } from '../lib/whatsapp'
import { Button } from './ui/Button'
import { ClientSelect } from './ui/ClientSelect'
import { Input } from './ui/Input'
import { Select } from './ui/Select'

function formatearNumero(val: string): string {
  const num = val.replace(/\D/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('es-PY')
}

function parsearNumero(val: string): number {
  return parseFloat(val.replace(/\./g, '').replace(/,/g, '')) || 0
}

export interface PlanFormData {
  id?: string
  creadoEn?: string
  clienteId: string
  tipo: string
  fechaInicio: string
  fechaFin: string
  monto: number
  facturarAhora: boolean
  cantidad?: number
  hora?: string
}

interface PlanFormProps {
  clientes: Cliente[]
  tiposConfig: PlanTipoConfig[]
  initial?: Plan
  clienteIdPreseleccionado?: string
  puedeFacturarPlan?: boolean
  onSubmit: (data: PlanFormData) => void
  onCancel: () => void
  onClientesChange?: () => void
  onSaveCliente?: (cliente: Cliente) => Promise<void>
}

export function PlanForm({
  clientes,
  tiposConfig,
  initial,
  clienteIdPreseleccionado,
  puedeFacturarPlan = true,
  onSubmit,
  onCancel,
  onClientesChange,
  onSaveCliente,
}: PlanFormProps) {
  const [clienteId, setClienteId] = useState(
    initial?.clienteId ?? clienteIdPreseleccionado ?? clientes[0]?.id ?? '',
  )
  const [anonimo, setAnonimo] = useState(false)
  const [tipoId, setTipoId] = useState(initial?.tipo ?? tiposConfig[0]?.id ?? '')
  const [fechaInicio, setFechaInicio] = useState(initial?.fechaInicio ?? hoyISO())
  const [fechaFin, setFechaFin] = useState(
    initial?.fechaFin ?? format(addMonths(parseISO(hoyISO()), 1), 'yyyy-MM-dd'),
  )
  const [montoRaw, setMontoRaw] = useState(
    initial?.monto ? formatearNumero(initial.monto.toString()) : '',
  )
  const [facturarAhora, setFacturarAhora] = useState(puedeFacturarPlan)
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoApellido, setNuevoApellido] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')

  const tipoSeleccionado = tiposConfig.find((t) => t.id === tipoId)
  const duracion = tipoSeleccionado?.duracion
  // Sin duración = tipo de plan sin campo duracion (servicio de precio fijo)
  const sinDuracion = !duracion

  const calcularFinPorDefecto = (inicioStr: string) => {
    try {
      const inicio = parseISO(inicioStr)
      return format(addMonths(inicio, 1), 'yyyy-MM-dd')
    } catch {
      return inicioStr
    }
  }

  useEffect(() => {
    if (initial) return
    setMontoRaw(tipoSeleccionado ? formatearNumero(tipoSeleccionado.monto.toString()) : '')
    if (!sinDuracion) {
      const ini = tipoSeleccionado?.fechaInicioDefault || hoyISO()
      const fin = tipoSeleccionado?.fechaFinDefault || calcularFinPorDefecto(ini)
      setFechaInicio(ini)
      setFechaFin(fin)
    }
  }, [tipoId, initial])

  useEffect(() => {
    if (!puedeFacturarPlan) {
      setFacturarAhora(false)
    }
  }, [puedeFacturarPlan])

  const handleFechaInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaInicio = e.target.value
    setFechaInicio(nuevaInicio)
    if (!initial && !sinDuracion && nuevaInicio) {
      setFechaFin(calcularFinPorDefecto(nuevaInicio))
    }
  }

  const seleccionarAnonimo = () => {
    setAnonimo(true)
    setClienteId('')
    setCreandoCliente(false)
  }

  const seleccionarCliente = (id: string) => {
    setAnonimo(false)
    setClienteId(id)
  }

  const crearCliente = async () => {
    if (!nuevoNombre.trim() || !nuevoApellido.trim()) return
    const nuevo: Cliente = {
      id: crypto.randomUUID(),
      nombre: nuevoNombre.trim(),
      apellido: nuevoApellido.trim(),
      telefono: nuevoTelefono.trim(),
      creadoEn: new Date().toISOString(),
    }
    await onSaveCliente?.(nuevo)
    seleccionarCliente(nuevo.id)
    setCreandoCliente(false)
    setNuevoNombre('')
    setNuevoApellido('')
    setNuevoTelefono('')
    onClientesChange?.()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!montoRaw) return
    const fin = sinDuracion ? fechaInicio : (fechaFin || fechaInicio)
    onSubmit({
      id: initial?.id,
      creadoEn: initial?.creadoEn,
      clienteId,
      tipo: tipoId,
      fechaInicio,
      fechaFin: fin,
      monto: parsearNumero(montoRaw),
      facturarAhora,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {creandoCliente ? (
        <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nuevo cliente</p>
          <Input
            label="Nombre"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nombre"
            required
          />
          <Input
            label="Apellido"
            value={nuevoApellido}
            onChange={(e) => setNuevoApellido(e.target.value)}
            placeholder="Apellido"
            required
          />
          <Input
            label="Teléfono (opcional)"
            type="tel"
            value={nuevoTelefono}
            onChange={(e) => setNuevoTelefono(formatTelefono(e.target.value))}
            placeholder="0982 362 830"
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setCreandoCliente(false)}>
              Cancelar
            </Button>
            <Button type="button" className="flex-1" onClick={crearCliente} disabled={!nuevoNombre.trim() || !nuevoApellido.trim()}>
              Agregar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {anonimo ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-400">
              <UserX size={16} />
              <span className="flex-1 text-sm">Anónimo (sin cliente)</span>
              <button
                type="button"
                onClick={() => setAnonimo(false)}
                className="text-xs text-barber-400 hover:text-barber-300"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <ClientSelect
                clientes={clientes}
                value={clienteId}
                onChange={seleccionarCliente}
              />
              <div className="mt-1.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setCreandoCliente(true)}
                  className="flex items-center gap-1 text-xs text-barber-400 hover:text-barber-300"
                >
                  <Plus size={14} /> Nuevo cliente
                </button>
                <button
                  type="button"
                  onClick={seleccionarAnonimo}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
                >
                  <UserX size={14} /> Anónimo
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <Select
        label="Tipo de plan"
        value={tipoId}
        onChange={(e) => setTipoId(e.target.value)}
        options={tiposConfig.map((t) => ({ value: t.id, label: t.nombre }))}
      />

      <Input
        label="Fecha de inicio"
        type="date"
        value={fechaInicio}
        onChange={handleFechaInicioChange}
        required
      />

      {!sinDuracion && (
        <Input
          label="Fecha de fin"
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          min={fechaInicio}
          required
        />
      )}

      <Input
        label="Monto a cobrar"
        type="text"
        inputMode="numeric"
        value={montoRaw}
        onChange={(e) => setMontoRaw(formatearNumero(e.target.value))}
        placeholder="0"
        required
      />

      {puedeFacturarPlan && (
        <div className="space-y-2.5">
          <span className="text-sm font-medium text-slate-300">Opción de pago</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFacturarAhora(true)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                facturarAhora
                  ? 'bg-barber-500 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Facturar ahora
            </button>
            <button
              type="button"
              onClick={() => setFacturarAhora(false)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                !facturarAhora
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Dejar pendiente
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          {initial ? 'Guardar plan' : 'Asignar plan'}
        </Button>
      </div>
    </form>
  )
}
