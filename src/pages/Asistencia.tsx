import { Check, DollarSign, Pencil, Plus, Trash2 } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { SearchInput } from '../components/ui/SearchInput'
import { useBarberData } from '../hooks/useBarberData'
import { etiquetaTipoPlan, formatearMoneda, hoyISO } from '../lib/dates'
import type { Cobro, CobroConCliente, TipoMovimiento, TipoPlan } from '../lib/types'

function formatearNumero(val: string): string {
  const num = val.replace(/\D/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('es-PY')
}

function parsearNumero(val: string): number {
  return parseFloat(val.replace(/\./g, '').replace(/,/g, '')) || 0
}

export function Asistencia() {
  const puedeFacturar = true
  const verMonto = true
  const { clientes, planes, cobros, planTipos, loading, refresh, saveCobro, deleteCobro } = useBarberData()
  const [busqueda, setBusqueda] = useState('')
  const busquedaDiferida = useDeferredValue(busqueda)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [filtroTipoCobro, setFiltroTipoCobro] = useState<TipoPlan | 'todos'>('todos')
  const [editandoCobro, setEditandoCobro] = useState<CobroConCliente | null>(null)
  const [montoEdit, setMontoEdit] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualTipo, setManualTipo] = useState<TipoMovimiento>('ingreso')
  const [manualMonto, setManualMonto] = useState('')
  const [manualDesc, setManualDesc] = useState('')

  const hoy = hoyISO()

  useEffect(() => {
    refresh()
  }, [refresh])

  const cobrosPendientesList = useMemo<CobroConCliente[]>(() => {
    const q = busquedaDiferida.toLowerCase().trim()
    return cobros
      .filter((c) => c.estado === 'pendiente')
      .map((c) => ({
        ...c,
        cliente: clientes.find((cl) => cl.id === c.clienteId),
        plan: planes.find((p) => p.id === c.planId),
      }))
      .filter((c) => {
        if (filtroTipoCobro !== 'todos' && c.plan?.tipo !== filtroTipoCobro) return false
        if (!q) return true
        const nombre = `${c.cliente?.nombre ?? ''} ${c.cliente?.apellido ?? ''}`.toLowerCase()
        const desc = (c.descripcion ?? '').toLowerCase()
        return nombre.includes(q) || desc.includes(q)
      })
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
  }, [cobros, clientes, planes, busquedaDiferida, filtroTipoCobro])

  const saldoPendienteTotal = useMemo(() => {
    return cobros
      .filter((c) => c.estado === 'pendiente')
      .reduce((sum, c) => sum + (c.monto || 0), 0)
  }, [cobros])

  const marcarPagado = async (cobro: Cobro) => {
    setGuardando(cobro.id)
    await saveCobro({
      ...cobro,
      estado: 'pagado',
      pagadoEn: new Date().toISOString(),
    })
    if (cobro.monto < cobro.montoPlan) {
      const restante: Cobro = {
        id: crypto.randomUUID(),
        clienteId: cobro.clienteId,
        planId: cobro.planId,
        fecha: new Date().toISOString().slice(0, 10),
        monto: cobro.montoPlan - cobro.monto,
        montoPlan: cobro.montoPlan - cobro.monto,
        estado: 'pendiente',
        creadoEn: new Date().toISOString(),
      }
      await saveCobro(restante)
    }
    setGuardando(null)
  }

  const guardarMonto = async () => {
    if (!editandoCobro) return
    const monto = parsearNumero(montoEdit)
    if (monto <= 0) return
    await saveCobro({
      ...editandoCobro,
      monto,
    })
    setEditandoCobro(null)
  }

  const eliminarCobro = async (cobro: Cobro) => {
    if (!confirm(`¿Eliminar cobro de ${formatearMoneda(cobro.monto)} Gs?`)) return
    await deleteCobro(cobro.id)
  }

  const guardarManual = async () => {
    const monto = parsearNumero(manualMonto)
    if (monto <= 0) return
    const cobro: Cobro = {
      id: crypto.randomUUID(),
      clienteId: '',
      planId: '',
      fecha: hoy,
      monto,
      montoPlan: monto,
      estado: 'pagado',
      tipo: manualTipo,
      descripcion: manualDesc.trim() || undefined,
      pagadoEn: new Date().toISOString(),
      creadoEn: new Date().toISOString(),
    }
    await saveCobro(cobro)
    setManualOpen(false)
    setManualMonto('')
    setManualDesc('')
  }

  return (
    <Layout title="Cobrar">
      {/* Resumen Saldo Pendiente por Cobrar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-slate-900 p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-md">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Saldo Pendiente por Cobrar</p>
            <p className="text-2xl font-black text-amber-400">{formatearMoneda(saldoPendienteTotal)} Gs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
            {cobrosPendientesList.length} factura(s) pendiente(s)
          </span>
        </div>
      </div>

      {puedeFacturar && (
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-400 hover:border-barber-500/50 hover:text-barber-400"
        >
          <Plus size={16} /> Movimiento manual
        </button>
      )}

      <div className="mb-3">
        <SearchInput
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por cliente o servicio..."
        />
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => setFiltroTipoCobro('todos')}
          className={`rounded-lg py-1.5 text-xs font-medium ${
            filtroTipoCobro === 'todos'
              ? 'bg-barber-500 text-white'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          Todos
        </button>
        {planTipos.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFiltroTipoCobro(t.id)}
            className={`rounded-lg py-1.5 text-xs font-medium ${
              filtroTipoCobro === t.id
                ? 'bg-barber-500 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {t.nombre}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-slate-400">Cargando...</p>
      ) : cobrosPendientesList.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Sin cobros pendientes"
          description="Las facturas pendientes aparecerán automáticamente al reservar turnos o crear planes."
        />
      ) : (
        <ul className="space-y-2">
          {cobrosPendientesList.map((c) => {
            const clienteNombre = c.cliente
              ? `${c.cliente.nombre} ${c.cliente.apellido}`.trim()
              : c.descripcion?.split('·')[0]?.trim() || 'Cliente'

            const detalleServicio = c.descripcion?.includes('·')
              ? c.descripcion.split('·').slice(1).join('·').trim()
              : c.descripcion || (c.plan ? etiquetaTipoPlan(c.plan.tipo) : 'Reserva de servicio')

            return (
              <li
                key={c.id}
                className="list-item rounded-2xl border border-slate-800 bg-slate-900 p-3.5 shadow-md transition-all hover:border-slate-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {clienteNombre}
                    </p>
                    <p className="text-xs font-medium text-barber-400 mt-0.5">
                      {detalleServicio}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Fecha: {c.fecha}
                    </p>
                  </div>
                  {verMonto && (
                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-emerald-400">
                        {formatearMoneda(c.monto)} Gs
                      </span>
                    </div>
                  )}
                </div>
                {puedeFacturar && (
                  <div className="mt-3 flex gap-2 pt-2 border-t border-slate-800/80">
                    <Button
                      size="sm"
                      className="flex-1 !py-2 !text-xs font-bold"
                      disabled={guardando === c.id}
                      onClick={() => marcarPagado(c)}
                    >
                      <Check size={14} className="inline mr-1" /> Cobrar / Marcar Pagado
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="!py-2 !text-xs"
                      onClick={() => {
                        setEditandoCobro(c)
                        setMontoEdit(formatearNumero(String(c.monto)))
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="!py-2 !text-xs text-red-400 hover:bg-red-500/10"
                      onClick={() => eliminarCobro(c)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={!!editandoCobro}
        onClose={() => setEditandoCobro(null)}
        title="Editar monto"
      >
        {editandoCobro && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              {editandoCobro.cliente?.nombre} {editandoCobro.cliente?.apellido}
            </p>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-300">Monto a cobrar</span>
              <input
                type="text"
                inputMode="numeric"
                value={montoEdit}
                onChange={(e) => setMontoEdit(formatearNumero(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:border-barber-500 focus:outline-none"
              />
            </label>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setEditandoCobro(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={guardarMonto}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={manualOpen}
        onClose={() => { setManualOpen(false); setManualMonto(''); setManualDesc('') }}
        title="Movimiento manual"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setManualTipo('ingreso')}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                manualTipo === 'ingreso'
                  ? 'bg-barber-500 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setManualTipo('egreso')}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                manualTipo === 'egreso'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Egreso
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-300">Monto</span>
            <input
              type="text"
              inputMode="numeric"
              value={manualMonto}
              onChange={(e) => setManualMonto(formatearNumero(e.target.value))}
              placeholder="0"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-barber-500 focus:outline-none focus:ring-2 focus:ring-barber-500/30"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-300">Descripción (opcional)</span>
            <input
              type="text"
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              placeholder="Ej: Pago de mensualidad"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-barber-500 focus:outline-none focus:ring-2 focus:ring-barber-500/30"
            />
          </label>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => { setManualOpen(false); setManualMonto(''); setManualDesc('') }}
            >
              Cancelar
            </Button>
            <Button className="flex-1" onClick={guardarManual} disabled={!manualMonto}>
              {manualTipo === 'ingreso' ? 'Registrar ingreso' : 'Registrar egreso'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}


