import { AlertTriangle, ArrowLeft, CalendarPlus, Check, ChevronRight, Clock, Pencil, Plus, Scissors, Settings, Share2, Trash2 } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { Layout } from '../components/Layout'
import { PlanCard } from '../components/PlanCard'
import { PlanForm } from '../components/PlanForm'
import { ReservasModal } from '../components/ReservasModal'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { SearchInput } from '../components/ui/SearchInput'
import { Pagination } from '../components/ui/Pagination'
import { useBarberData } from '../hooks/useBarberData'
import { usePagination } from '../hooks/usePagination'
import { api } from '../lib/api'
import { crearCobroDesdePlan } from '../lib/cobros'
import { formatearMoneda, hoyISO, planEstaActivo, planPorVencer, planSinDuracion, planVenceHoy } from '../lib/dates'
import { crearJornadaPorDefecto } from '../lib/reservasUtils'
import type { Cobro, JornadaReservas, OpcionCliente, Plan, PlanConCliente, PlanTipoConfig, TurnoSlot } from '../lib/types'

function formatearNumero(val: string): string {
  const num = val.replace(/\D/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('es-PY')
}

function parsearNumero(val: string): number {
  return parseFloat(val.replace(/\./g, '').replace(/,/g, '')) || 0
}

export function Planes() {
  const { clientes, planes, cobros, planTipos, opcionesCliente, loading, refresh, savePlan, deletePlan, saveCobro, saveCliente, savePlanTipos, saveOpcionesCliente } = useBarberData()
  const [busqueda, setBusqueda] = useState('')
  const busquedaDiferida = useDeferredValue(busqueda)
  const [modalOpen, setModalOpen] = useState(false)
  const [reservasModalOpen, setReservasModalOpen] = useState(false)
  const [reservaFechaInicial, setReservaFechaInicial] = useState<string | undefined>(undefined)
  const [copiadoFecha, setCopiadoFecha] = useState<string | null>(null)
  const [filtroTab, setFiltroTab] = useState<'activos' | 'reservas'>('activos')
  const [refreshTick, setRefreshTick] = useState(0)
  const [nuevaFechaForm, setNuevaFechaForm] = useState(hoyISO())

  const [nuevaOpcionNombre, setNuevaOpcionNombre] = useState('')
  const [nuevaOpcionPrecio, setNuevaOpcionPrecio] = useState('')

  const handleAgregarOpcionCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaOpcionNombre.trim()) return
    const precioNum = parsearNumero(nuevaOpcionPrecio)
    const nuevaOpcion: OpcionCliente = {
      id: crypto.randomUUID(),
      nombre: nuevaOpcionNombre.trim(),
      precio: precioNum,
    }
    const nuevas = [...opcionesCliente, nuevaOpcion]
    await saveOpcionesCliente(nuevas)
    setNuevaOpcionNombre('')
    setNuevaOpcionPrecio('')
  }

  const handleEliminarOpcionCliente = async (id: string) => {
    const nuevas = opcionesCliente.filter((o) => o.id !== id)
    await saveOpcionesCliente(nuevas)
  }

  const [editando, setEditando] = useState<Plan | null>(null)
  const [vistaConfig, setVistaConfig] = useState(false)
  const [editandoTipo, setEditandoTipo] = useState<PlanTipoConfig | null>(null)
  const [tipoNombre, setTipoNombre] = useState('')
  const [tipoMonto, setTipoMonto] = useState('')
  const [tieneDuracion, setTieneDuracion] = useState(false)
  const [tipoFechaInicio, setTipoFechaInicio] = useState(hoyISO())
  const [tipoFechaFin, setTipoFechaFin] = useState(() =>
    format(addMonths(parseISO(hoyISO()), 1), 'yyyy-MM-dd'),
  )
  const [creandoTipo, setCreandoTipo] = useState(false)

  const [jornadasReservas, setJornadasReservas] = useState<JornadaReservas[]>([])

  useEffect(() => {
    api.getTodasJornadas().then((todas) => {
      const ordenadas = todas.sort((a, b) => {
        if (a.creadoEn && b.creadoEn) {
          return b.creadoEn.localeCompare(a.creadoEn)
        }
        return b.fecha.localeCompare(a.fecha)
      })
      setJornadasReservas(ordenadas)
    })
  }, [reservasModalOpen, filtroTab, refreshTick])

  const planesConCliente = useMemo<PlanConCliente[]>(
    () =>
      planes.map((p) => ({
        ...p,
        cliente: clientes.find((c) => c.id === p.clienteId),
      })),
    [planes, clientes],
  )

  const alertas = planesConCliente.filter((p) => {
    const tipoConfig = planTipos.find((t) => t.id === p.tipo)
    const sinDuracion = tipoConfig !== undefined ? tipoConfig.duracion === null : planSinDuracion(p)
    if (sinDuracion) return false
    return planEstaActivo(p) && (planVenceHoy(p) || planPorVencer(p, 3))
  })

  const filtrados = useMemo(() => {
    const list = planesConCliente.filter((p) => {
      const tipoConfig = planTipos.find((t) => t.id === p.tipo)
      const sinDuracion = tipoConfig !== undefined ? tipoConfig.duracion === null : planSinDuracion(p)
      if (sinDuracion) {
        return cobros.some((c) => c.planId === p.id && c.estado === 'pendiente')
      }
      return planEstaActivo(p)
    })
    const q = busquedaDiferida.toLowerCase().trim()
    if (!q) return list
    return list.filter((p) => {
      const nombre = `${p.cliente?.nombre ?? ''} ${p.cliente?.apellido ?? ''}`.toLowerCase()
      return nombre.includes(q)
    })
  }, [planesConCliente, busquedaDiferida, planTipos, cobros])

  const { paginated, page, setPage, totalPages, total, pageSize } = usePagination(filtrados)

  const copiarEnlaceJornada = (id: string) => {
    const url = `${window.location.origin}/reservas?id=${id}`
    navigator.clipboard.writeText(url)
    setCopiadoFecha(id)
    setTimeout(() => setCopiadoFecha(null), 3000)
  }

  const eliminarJornada = async (id: string, deletedJ: JornadaReservas | undefined) => {
    const reservadas = deletedJ ? deletedJ.slots.filter((s) => s.estado === 'reservado').length : 0
    const msg = reservadas > 0
      ? `Esta jornada tiene ${reservadas} turno(s) reservado(s). ¿Eliminar de todas formas?`
      : '¿Eliminar esta jornada?'
    if (!confirm(msg)) return
    setJornadasReservas((prev) => prev.filter((j) => j.id !== id))
    try {
      await api.deleteJornadaReservas(id)
    } catch (e) {
      console.error('Error eliminando jornada en Firebase:', e)
      alert('No se pudo eliminar la jornada. Verificá tu conexión.')
      if (deletedJ) setJornadasReservas((prev) => [...prev, deletedJ])
    }
    setRefreshTick((t) => t + 1)
    refresh()
  }

  const crearNuevaJornadaDirecta = async () => {
    try {
      const j = crearJornadaPorDefecto(nuevaFechaForm)
      await api.saveJornadaReservas(j)
      setRefreshTick((t) => t + 1)
    } catch (e) {
      console.error('Error al crear jornada:', e)
      alert('No se pudo crear la jornada. Verificá tu conexión.')
    }
  }

  const abrirReservaDetalle = (id: string) => {
    setReservaFechaInicial(id)
    setReservasModalOpen(true)
  }

  const guardar = async (
    data: { id?: string; creadoEn?: string; clienteId: string; tipo: string; fechaInicio: string; fechaFin: string; monto: number; facturarAhora: boolean; cantidad?: number; hora?: string },
  ) => {
    try {
      const isNew = !data.id
      const plan: Plan = {
        id: data.id ?? crypto.randomUUID(),
        creadoEn: data.creadoEn ?? new Date().toISOString(),
        clienteId: data.clienteId,
        tipo: data.tipo,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        monto: data.monto,
        cantidad: data.cantidad,
        hora: data.hora,
      }
      await savePlan(plan)

      if (isNew) {
        const activoExistente = planes.find((p) => {
          if (p.clienteId !== plan.clienteId || p.id === plan.id) return false
          if (!planEstaActivo(p)) return false
          const tipoCfg = planTipos.find((t) => t.id === p.tipo)
          const sinDuracion = tipoCfg !== undefined ? tipoCfg.duracion === null : planSinDuracion(p)
          return !sinDuracion
        })
        if (activoExistente) {
          const nombre = clientes.find((c) => c.id === plan.clienteId)
          const msg = `"${nombre?.nombre ?? ''} ${nombre?.apellido ?? ''}" ya tiene un plan activo.\n¿Crear otro de todas formas?`
          if (!confirm(msg)) return
        }
        const cobro: Cobro = {
          ...crearCobroDesdePlan(plan),
        }
        if (data.facturarAhora) {
          cobro.estado = 'pagado'
          cobro.pagadoEn = new Date().toISOString()
        }
        await saveCobro(cobro)
      } else if (!isNew) {
        const pendiente = cobros.find(
          (c) => c.planId === plan.id && c.estado === 'pendiente',
        )
        if (pendiente) {
          await saveCobro({
            ...pendiente,
            monto: plan.monto,
            montoPlan: plan.monto,
          })
        }
      }

      setModalOpen(false)
      setEditando(null)
    } catch (e) {
      alert('Error al guardar el plan: ' + (e instanceof Error ? e.message : 'desconocido'))
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este plan?')) return
    await deletePlan(id)
  }

  const cobrar = async (planId: string) => {
    const yaPagado = cobros.some((c) => c.planId === planId && c.estado === 'pagado')
    if (yaPagado) return
    let pendientes = cobros.filter(
      (c) => c.planId === planId && c.estado === 'pendiente',
    )
    if (pendientes.length === 0) {
      const plan = planes.find((p) => p.id === planId)
      if (!plan) return
      const cobro = {
        ...crearCobroDesdePlan(plan),
      }
      await saveCobro(cobro)
      pendientes = [cobro]
    }
    const total = pendientes.reduce((s, c) => s + c.monto, 0)
    if (!confirm(`¿Cobrar ${pendientes.length} factura(s) pendiente(s) por ${formatearMoneda(total)} Gs?`)) return
    for (const c of pendientes) {
      await saveCobro({
        ...c,
        estado: 'pagado',
        pagadoEn: new Date().toISOString(),
      })
    }
  }

  const abrirNuevoTipo = () => {
    setEditandoTipo(null)
    setTipoNombre('')
    setTipoMonto('')
    setTieneDuracion(false)
    setTipoFechaInicio(hoyISO())
    setTipoFechaFin(format(addMonths(parseISO(hoyISO()), 1), 'yyyy-MM-dd'))
    setCreandoTipo(true)
  }

  const abrirEditarTipo = (t: PlanTipoConfig) => {
    setEditandoTipo(t)
    setTipoNombre(t.nombre)
    setTipoMonto(formatearNumero(t.monto.toString()))
    setTieneDuracion(!!t.duracion)
    setTipoFechaInicio(t.fechaInicioDefault ?? hoyISO())
    setTipoFechaFin(
      t.fechaFinDefault ?? format(addMonths(parseISO(hoyISO()), 1), 'yyyy-MM-dd'),
    )
    setCreandoTipo(true)
  }

  const guardarTipo = async () => {
    if (!tipoNombre.trim()) return
    const monto = parsearNumero(tipoMonto)
    if (monto <= 0) return
    const duracion: PlanTipoConfig['duracion'] = tieneDuracion
      ? { tipo: 'meses', valor: 1 }
      : null
    let nuevos: PlanTipoConfig[]
    if (editandoTipo) {
      nuevos = planTipos.map((t) =>
        t.id === editandoTipo.id
          ? {
              ...t,
              nombre: tipoNombre.trim(),
              monto,
              duracion,
              ...(tieneDuracion ? { fechaInicioDefault: tipoFechaInicio, fechaFinDefault: tipoFechaFin } : {}),
            }
          : t,
      )
    } else {
      const id = tipoNombre.trim().toLowerCase().replace(/\s+/g, '_')
      nuevos = [
        ...planTipos,
        {
          id,
          nombre: tipoNombre.trim(),
          monto,
          duracion,
          ...(tieneDuracion ? { fechaInicioDefault: tipoFechaInicio, fechaFinDefault: tipoFechaFin } : {}),
        },
      ]
    }
    setCreandoTipo(false)
    setEditandoTipo(null)
    await savePlanTipos(nuevos)
  }

  const eliminarTipo = (id: string) => {
    if (planTipos.length <= 1) {
      alert('Debe haber al menos un tipo de plan.')
      return
    }
    if (!confirm('¿Eliminar este tipo de plan?')) return
    const nuevos = planTipos.filter((t) => t.id !== id)
    savePlanTipos(nuevos)
  }

  if (vistaConfig) {
    return (
      <Layout
        title="Tipos de plan"
        action={
          <Button size="sm" variant="secondary" onClick={() => setVistaConfig(false)}>
            <ArrowLeft size={16} className="inline" /> Volver
          </Button>
        }
      >
        <p className="mb-4 text-xs text-slate-400">
          Definí los tipos de plan disponibles y sus montos por defecto.
        </p>

        <Button size="sm" onClick={abrirNuevoTipo} className="mb-4 w-full">
          <Plus size={16} className="inline" /> Nuevo tipo
        </Button>

        {creandoTipo && (
          <div className="mb-4 space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {editandoTipo ? 'Editar tipo' : 'Nuevo tipo'}
            </p>
            <Input
              label="Nombre"
              value={tipoNombre}
              onChange={(e) => setTipoNombre(e.target.value)}
              placeholder="Ej: Mensual Premium"
              required
            />
            <Input
              label="Monto por defecto"
              type="text"
              inputMode="numeric"
              value={tipoMonto}
              onChange={(e) => setTipoMonto(formatearNumero(e.target.value))}
              placeholder="100000"
              required
            />
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2.5">
                <div
                  onClick={() => {
                    const nextVal = !tieneDuracion
                    setTieneDuracion(nextVal)
                    if (nextVal && !tipoFechaFin) {
                      setTipoFechaFin(format(addMonths(parseISO(tipoFechaInicio), 1), 'yyyy-MM-dd'))
                    }
                  }}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    tieneDuracion ? 'bg-barber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      tieneDuracion ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span className="text-sm font-medium text-slate-300">Poner duración</span>
              </label>

              {tieneDuracion && (
                <div className="mt-2 space-y-3 rounded-xl border border-slate-700 bg-slate-800/50 p-3">
                  <Input
                    label="Fecha de inicio"
                    type="date"
                    value={tipoFechaInicio}
                    onChange={(e) => {
                      const nInicio = e.target.value
                      setTipoFechaInicio(nInicio)
                      if (nInicio) {
                        setTipoFechaFin(format(addMonths(parseISO(nInicio), 1), 'yyyy-MM-dd'))
                      }
                    }}
                    required
                  />
                  <Input
                    label="Fecha de fin"
                    type="date"
                    value={tipoFechaFin}
                    onChange={(e) => setTipoFechaFin(e.target.value)}
                    min={tipoFechaInicio}
                    required
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => { setCreandoTipo(false); setEditandoTipo(null) }}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1" onClick={guardarTipo} disabled={!tipoNombre.trim() || !tipoMonto}>
                Guardar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {planTipos.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2"
            >
              <span className="min-w-0 flex-1 text-sm font-medium text-white">{t.nombre}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {t.duracion ? 'Con duración' : 'Sin duración'}
              </span>
              <span className="shrink-0 text-sm text-barber-400">{formatearMoneda(t.monto)}</span>
              <button
                type="button"
                onClick={() => abrirEditarTipo(t)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => eliminarTipo(t.id)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      title="Planes y Reservas"
      action={
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setVistaConfig(true)}>
            <Settings size={16} />
          </Button>
          <Button size="sm" onClick={() => { setEditando(null); setModalOpen(true) }}>
            <CalendarPlus size={18} className="inline" /> Nuevo plan
          </Button>
        </div>
      }
    >
      {alertas.length > 0 && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle size={16} />
            <span className="text-sm font-semibold">Atención: {alertas.length} plan(es) por vencer</span>
          </div>
          <div className="mt-1 space-y-0.5">
            {alertas.slice(0, 3).map((p) => (
              <p key={p.id} className="text-xs text-amber-200/80">
                {p.cliente?.nombre} {p.cliente?.apellido} — vence {p.fechaFin}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Tabs de Filtro: Planes Activos vs Lista de Reservas */}
      <div className="mb-4 flex rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          type="button"
          onClick={() => setFiltroTab('activos')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all ${
            filtroTab === 'activos'
              ? 'bg-barber-500 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Planes activos ({filtrados.length})
        </button>
        <button
          type="button"
          onClick={() => setFiltroTab('reservas')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all ${
            filtroTab === 'reservas'
              ? 'bg-barber-500 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📅 Lista de reservas ({jornadasReservas.length})
        </button>
      </div>

      {/* VISTA 1: PLANES ACTIVOS */}
      {filtroTab === 'activos' && (
        <>
          <div className="mb-4">
            <SearchInput
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Buscar por cliente..."
            />
          </div>

          {loading ? (
            <p className="text-center text-slate-400">Cargando...</p>
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="Sin planes"
              description="Asigna un plan a un cliente con el botón Nuevo plan"
            />
          ) : (
            <div className="space-y-1.5">
              {paginated.map((p) => {
                const pagado = cobros.some((c) => c.planId === p.id && c.estado === 'pagado')
                return (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    showWhatsapp
                    cobrado={pagado}
                    tiposConfig={planTipos}
                    onEdit={() => { setEditando(p); setModalOpen(true) }}
                    onDelete={() => eliminar(p.id)}
                    onCobrar={!pagado ? () => cobrar(p.id) : undefined}
                  />
                )
              })}
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* VISTA 2: LISTA DE RESERVAS */}
      {filtroTab === 'reservas' && (
        <div className="space-y-3">
          {/* Card de creación rápida de jornada por fecha */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Crear / Habilitar nueva jornada de reservas
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={nuevaFechaForm}
                onChange={(e) => setNuevaFechaForm(e.target.value)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-barber-500 focus:outline-none"
              />
              <Button size="sm" onClick={crearNuevaJornadaDirecta}>
                <Plus size={16} className="mr-1 inline" /> Crear jornada
              </Button>
            </div>
          </div>

          {/* Card de Opciones del cliente */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Opciones del cliente (servicios / cortes)
              </p>
              <span className="text-[11px] font-medium text-barber-400">
                {opcionesCliente.length} disponibles
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {opcionesCliente.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-1">No hay opciones cargadas aún</p>
              ) : (
                opcionesCliente.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Scissors size={14} className="text-barber-400 shrink-0" />
                      <span className="font-semibold text-white truncate">{op.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-emerald-400">
                        {op.precio > 0 ? `${op.precio.toLocaleString('es-PY')} Gs` : 'Sin costo'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEliminarOpcionCliente(op.id)}
                        className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                        title="Eliminar opción"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Formulario para agregar nueva opción */}
            <form onSubmit={handleAgregarOpcionCliente} className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <p className="text-[11px] font-medium text-slate-400">Cargar nueva opción:</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Nombre del corte o servicio"
                  value={nuevaOpcionNombre}
                  onChange={(e) => setNuevaOpcionNombre(e.target.value)}
                  className="min-w-0 flex-1 basis-[120px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-barber-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Precio Gs"
                  value={nuevaOpcionPrecio}
                  onChange={(e) => setNuevaOpcionPrecio(formatearNumero(e.target.value))}
                  className="min-w-0 w-28 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-barber-500 focus:outline-none"
                />
                <Button size="sm" type="submit" disabled={!nuevaOpcionNombre.trim()}>
                  <Plus size={14} className="mr-1 inline" /> Cargar
                </Button>
              </div>
            </form>
          </div>

          {jornadasReservas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
              <Clock size={32} className="mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">No hay reservas ni jornadas configuradas</p>
              <p className="text-xs text-slate-500 mt-1">
                Elegí una fecha arriba y toca en "Crear jornada" para habilitar los turnos de ese día.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {jornadasReservas.map((j) => {
                const reservadas = j.slots.filter((s: TurnoSlot) => s.estado === 'reservado')
                const disponibles = j.slots.filter((s: TurnoSlot) => s.estado === 'disponible').length
                const esHoy = j.fecha === hoyISO()

                return (
                  <div
                    key={j.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">{j.fecha}</span>
                          {esHoy && (
                            <span className="rounded-full bg-barber-500/20 px-2 py-0.5 text-[10px] font-bold text-barber-400">
                              HOY
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Horario: {j.horaInicio} – {j.horaFin} ({j.intervaloMinutos} min por turno)
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copiarEnlaceJornada(j.id)}
                          className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                          title="Copiar enlace de WhatsApp"
                        >
                          {copiadoFecha === j.id ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                          {copiadoFecha === j.fecha ? '¡Copiado!' : 'Enlace'}
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarJornada(j.id, j)}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-red-500/10 hover:text-red-400"
                          title="Eliminar jornada"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
                      <span className="text-emerald-400 font-medium">{disponibles} casillas libres</span>
                      <span className="text-red-400 font-medium">{reservadas.length} turnos reservados</span>
                    </div>

                    {reservadas.length > 0 && (
                      <div className="mt-1 flex flex-col gap-1.5">
                        {reservadas.map((s: TurnoSlot) => (
                          <div
                            key={s.id}
                            className="flex flex-col gap-0.5 rounded-lg bg-red-500/10 p-2 text-xs text-red-200 border border-red-500/20"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-red-300">{s.horaInicio} - {s.horaFin}</span>
                              <span>•</span>
                              <span className="font-semibold text-white">{s.clienteNombre || 'Reservado'}</span>
                            </div>
                            {s.opcionNombre && (
                              <span className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                                ✂️ {s.opcionNombre} {s.opcionPrecio ? `(${s.opcionPrecio.toLocaleString('es-PY')} Gs)` : ''}
                              </span>
                            )}
                            {s.notas && (
                              <span className="text-[10px] text-slate-300 italic">
                                📝 Nota: {s.notas}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => abrirReservaDetalle(j.id)}
                      className="mt-1 flex items-center justify-center gap-1 rounded-lg bg-slate-800/60 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      Ver / Configurar turnos <ChevronRight size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null) }}
        title={editando ? 'Editar plan' : 'Nuevo plan'}
      >
        <PlanForm
          clientes={clientes}
          tiposConfig={planTipos}
          initial={editando ?? undefined}
          puedeFacturarPlan={true}
          onSubmit={guardar}
          onCancel={() => { setModalOpen(false); setEditando(null) }}
          onClientesChange={refresh}
          onSaveCliente={saveCliente}
        />
      </Modal>

      <ReservasModal
        open={reservasModalOpen}
        onClose={() => { setReservasModalOpen(false); setReservaFechaInicial(undefined); setRefreshTick((t) => t + 1) }}
        fechaInicial={reservaFechaInicial}
      />
    </Layout>
  )
}



