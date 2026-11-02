import { AlertTriangle, ArrowLeft, Check, ChevronRight, Clock, Lock, MessageCircle, Plus, Scissors, Share2, Trash2, Unlock, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useBarberData } from '../hooks/useBarberData'
import type { EstadoSlot, JornadaReservas, OpcionCliente, TurnoSlot } from '../lib/types'
import { crearJornadaPorDefecto, generarSlotsJornada, DEFAULT_WHATSAPP_BARBERO, DEFAULT_MENSAJE_WHATSAPP, formatearTelefono, registrarCobroYClientePorReserva } from '../lib/reservasUtils'
import { hoyISO } from '../lib/dates'
import { whatsappUrl } from '../lib/whatsapp'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { TimePicker } from './ui/TimePicker'
import { Modal } from './ui/Modal'

type Vista = 'lista' | 'detalle'

export function ReservasModal({
  open,
  onClose,
  fechaInicial,
}: {
  open: boolean
  onClose: () => void
  fechaInicial?: string
}) {
  const { opcionesCliente, cobros, deleteCobro, refresh } = useBarberData()
  const [vista, setVista] = useState<Vista>('lista')
  const [jornadas, setJornadas] = useState<JornadaReservas[]>([])
  const [jornadaActiva, setJornadaActiva] = useState<JornadaReservas | null>(null)
  const [copiado, setCopiado] = useState(false)

  const [nuevaFecha, setNuevaFecha] = useState(hoyISO())
  const [creandoNueva, setCreandoNueva] = useState(false)

  const [slotSeleccionado, setSlotSeleccionado] = useState<TurnoSlot | null>(null)
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<OpcionCliente | null>(null)
  const [notasCliente, setNotasCliente] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editandoConfig, setEditandoConfig] = useState(false)

  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const recargarJornadas = async () => {
    try {
      const todas = await api.getTodasJornadas()
      setJornadas(
        todas.sort((a, b) => {
          if (a.creadoEn && b.creadoEn) {
            return b.creadoEn.localeCompare(a.creadoEn)
          }
          return b.fecha.localeCompare(a.fecha)
        }),
      )
    } catch (e) {
      console.error('Error al recargar jornadas:', e)
    }
  }

  useEffect(() => {
    if (!open) return
    recargarJornadas()
    if (fechaInicial) {
      ;(async () => {
        try {
          if (fechaInicial.length === 36) {
            const j = await api.getJornadaReservas(fechaInicial)
            if (j) {
              setJornadaActiva(j)
              setVista('detalle')
              return
            }
          }
        } catch (e) {
          console.error('Error al cargar jornada:', e)
        }
        const nueva = crearJornadaPorDefecto(fechaInicial)
        setJornadaActiva(nueva)
        setVista('detalle')
      })()
    } else {
      setVista('lista')
      setJornadaActiva(null)
    }
    setCreandoNueva(false)
  }, [open, fechaInicial])

  // Auto-refresh cada 5 seg cuando se ve el detalle; se pausa si el usuario está editando
  useEffect(() => {
    if (!open || vista !== 'detalle' || !jornadaActiva || editandoConfig) {
      if (refreshRef.current) { clearInterval(refreshRef.current); refreshRef.current = null }
      return
    }
    const fetchRemota = async () => {
      if (document.hidden) return
      try {
        const fresca = await api.getJornadaReservasRemota(jornadaActiva.id)
        if (fresca) {
          setJornadaActiva(fresca)
          recargarJornadas()
        }
      } catch (e) {
        console.error('Error al refrescar jornada:', e)
      }
    }
    refreshRef.current = setInterval(fetchRemota, 5000)
    return () => {
      if (refreshRef.current) { clearInterval(refreshRef.current); refreshRef.current = null }
    }
  }, [open, vista, jornadaActiva?.id, editandoConfig])

  const guardarJornada = async (j: JornadaReservas) => {
    try {
      await api.saveJornadaReservas(j)
      setJornadaActiva(j)
      await recargarJornadas()
    } catch (e) {
      console.error('Error al guardar jornada:', e)
      alert('Error al guardar los cambios. Revisá tu conexión.')
    }
  }

  const crearNuevaJornada = async () => {
    try {
      const nueva = crearJornadaPorDefecto(nuevaFecha)
      await api.saveJornadaReservas(nueva)
      await recargarJornadas()
      abrirDetalle(nueva)
      setCreandoNueva(false)
    } catch (e) {
      console.error('Error al crear jornada:', e)
      alert('No se pudo crear la jornada. Verificá tu conexión.')
    }
  }

  const eliminarJornada = async (id: string) => {
    if (!confirm(`¿Eliminar esta jornada?`)) return
    const jEliminada = jornadas.find((j) => j.id === id)
    setJornadas((prev) => prev.filter((j) => j.id !== id))
    if (jornadaActiva?.id === id) {
      setVista('lista')
      setJornadaActiva(null)
    }
    try {
      await api.deleteJornadaReservas(id)
    } catch (e) {
      console.error('Error eliminando jornada en Firebase:', e)
      alert('No se pudo eliminar la jornada. Verificá tu conexión.')
      if (jEliminada) setJornadas((prev) => [...prev, jEliminada])
    }
    recargarJornadas()
  }

  const abrirDetalle = (j: JornadaReservas) => {
    setJornadaActiva({ ...j })
    setVista('detalle')
  }

  const handleRegenerar = async () => {
    if (!jornadaActiva || jornadaActiva.configurado) return
    setEditandoConfig(false)
    const nuevosSlots = generarSlotsJornada(
      jornadaActiva.horaInicio,
      jornadaActiva.horaFin,
      jornadaActiva.intervaloMinutos,
      jornadaActiva.slots,
    )
    await guardarJornada({ ...jornadaActiva, slots: nuevosSlots, configurado: true })
  }

  const togglePublico = async () => {
    if (!jornadaActiva) return
    await guardarJornada({ ...jornadaActiva, permitirReservaPublica: !jornadaActiva.permitirReservaPublica })
  }

  const copiarEnlace = () => {
    if (!jornadaActiva) return
    navigator.clipboard.writeText(`${window.location.origin}/reservas?id=${jornadaActiva.id}`)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3500)
  }

  const abrirReservaManual = (slot: TurnoSlot) => {
    setSlotSeleccionado(slot)
    setNombreCliente(slot.clienteNombre ?? '')
    setTelefonoCliente(slot.clienteTelefono ?? '')
    setNotasCliente(slot.notas ?? '')
    const op = opcionesCliente.find((o) => o.nombre === slot.opcionNombre)
    setOpcionSeleccionada(op || (opcionesCliente.length > 0 ? opcionesCliente[0] : null))
  }

  const confirmarReservaManual = async () => {
    if (!slotSeleccionado || !nombreCliente.trim() || !jornadaActiva || guardando) return
    setGuardando(true)
    try {
      const { cobro } = await registrarCobroYClientePorReserva({
        clienteNombre: nombreCliente.trim(),
        clienteTelefono: telefonoCliente.trim() || undefined,
        fecha: jornadaActiva.fecha,
        horaInicio: slotSeleccionado.horaInicio,
        opcionNombre: opcionSeleccionada?.nombre,
        opcionPrecio: opcionSeleccionada?.precio,
        notas: notasCliente.trim() || undefined,
      })

      const nuevosSlots = jornadaActiva.slots.map((s) =>
        s.id === slotSeleccionado.id
          ? {
              ...s,
              estado: 'reservado' as EstadoSlot,
              clienteNombre: nombreCliente.trim(),
              clienteTelefono: telefonoCliente.trim() || undefined,
              opcionNombre: opcionSeleccionada?.nombre,
              opcionPrecio: opcionSeleccionada?.precio,
              notas: notasCliente.trim() || undefined,
              cobroId: cobro.id,
            }
          : s,
      )
      await guardarJornada({ ...jornadaActiva, slots: nuevosSlots })
      await refresh().catch(() => {})

      setSlotSeleccionado(null)
      setNombreCliente('')
      setTelefonoCliente('')
      setNotasCliente('')
      setOpcionSeleccionada(null)
    } catch (e) {
      console.error('Error al reservar turno:', e)
      alert('Error al guardar la reserva. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const liberarSlot = async (slotId: string) => {
    if (!jornadaActiva) return
    const targetSlot = jornadaActiva.slots.find((s) => s.id === slotId)
    const nuevosSlots = jornadaActiva.slots.map((s) =>
      s.id === slotId
        ? {
            ...s,
            estado: 'disponible' as EstadoSlot,
            clienteNombre: undefined,
            clienteTelefono: undefined,
            opcionNombre: undefined,
            opcionPrecio: undefined,
            notas: undefined,
            cobroId: undefined,
          }
        : s,
    )
    await guardarJornada({ ...jornadaActiva, slots: nuevosSlots })

    // Eliminar cobro pendiente asociado
    if (targetSlot?.cobroId) {
      await deleteCobro(targetSlot.cobroId).catch(() => {})
    } else if (targetSlot?.clienteNombre) {
      // Fallback: buscar por descripción
      const qNombre = targetSlot.clienteNombre.toLowerCase()
      const cobroPendiente = cobros.find(
        (c) =>
          c.estado === 'pendiente' &&
          c.fecha === jornadaActiva.fecha &&
          (c.descripcion?.toLowerCase().includes(qNombre) || c.descripcion?.toLowerCase().includes(targetSlot.horaInicio))
      )
      if (cobroPendiente) {
        await deleteCobro(cobroPendiente.id).catch(() => {})
      }
    }

    await refresh().catch(() => {})
    setSlotSeleccionado(null)
  }

  const toggleBloqueoSlot = async (slotId: string) => {
    if (!jornadaActiva) return
    const nuevosSlots = jornadaActiva.slots.map((s) => {
      if (s.id !== slotId) return s
      const nEstado: EstadoSlot = s.estado === 'bloqueado' ? 'disponible' : 'bloqueado'
      return { ...s, estado: nEstado, clienteNombre: undefined, clienteTelefono: undefined, opcionNombre: undefined, opcionPrecio: undefined, notas: undefined }
    })
    await guardarJornada({ ...jornadaActiva, slots: nuevosSlots })
    await refresh().catch(() => {})
  }

  const reservadasCount = jornadaActiva?.slots.filter((s) => s.estado === 'reservado').length ?? 0
  const disponiblesCount = jornadaActiva?.slots.filter((s) => s.estado === 'disponible').length ?? 0

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); setVista('lista'); setCreandoNueva(false) }}
      title={vista === 'detalle' && jornadaActiva ? `Turnos — ${jornadaActiva.fecha}` : '📅 Agenda de Reservas'}
    >
      {/* ── LISTA DE JORNADAS ── */}
      {vista === 'lista' && (
        <div className="space-y-3">
          {!creandoNueva ? (
            <button
              type="button"
              onClick={() => { setNuevaFecha(hoyISO()); setCreandoNueva(true) }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-barber-500/50 py-2.5 text-sm font-semibold text-barber-400 hover:bg-barber-500/10"
            >
              <Plus size={16} /> Nueva jornada
            </button>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nueva jornada</p>
              <Input label="Fecha" type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setCreandoNueva(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={crearNuevaJornada}>Crear</Button>
              </div>
            </div>
          )}

          {jornadas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center">
              <Clock size={28} className="mx-auto mb-2 text-slate-600" />
              <p className="text-sm text-slate-400">No hay jornadas creadas</p>
              <p className="text-xs text-slate-600 mt-1">Creá una para publicar tus turnos</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {jornadas.map((j) => {
                const reservadas = j.slots.filter((s) => s.estado === 'reservado')
                const disponibles = j.slots.filter((s) => s.estado === 'disponible').length
                const esHoy = j.fecha === hoyISO()
                return (
                  <div key={j.id} className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
                    <button type="button" onClick={() => abrirDetalle(j)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{j.fecha}</span>
                        {esHoy && (
                          <span className="rounded-full bg-barber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-barber-400">HOY</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs">
                        <span className="text-slate-400">{j.horaInicio} – {j.horaFin}</span>
                        <span className="text-emerald-400">{disponibles} libres</span>
                        {reservadas.length > 0 && (
                          <span className="font-medium text-red-400">{reservadas.length} reservados</span>
                        )}
                      </div>
                      {reservadas.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {reservadas.map((s) => (
                            <span key={s.id} className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
                              {s.horaInicio} · {s.clienteNombre || 'Reservado'}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
                      <button type="button" onClick={() => eliminarJornada(j.id)} className="rounded-lg p-1.5 text-slate-600 hover:bg-red-500/10 hover:text-red-400" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                      <button type="button" onClick={() => abrirDetalle(j)} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DETALLE DE JORNADA ── */}
      {vista === 'detalle' && jornadaActiva && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setVista('lista')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white">
              <ArrowLeft size={14} /> Volver
            </button>
            <div className="flex-1" />
            {jornadaActiva.configurado && jornadaActiva.whatsappConfigurado ? (
              <button type="button" onClick={copiarEnlace} className="flex items-center gap-1.5 rounded-xl bg-barber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-barber-600">
                {copiado ? <Check size={14} /> : <Share2 size={14} />}
                {copiado ? '¡Copiado!' : 'Copiar enlace'}
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 italic">Configurá horario y WhatsApp para obtener el enlace</span>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Configurar horario</p>
            <div className="grid grid-cols-2 gap-2">
              <TimePicker label="Desde" value={jornadaActiva.horaInicio} onChange={(v) => { setEditandoConfig(true); setJornadaActiva({ ...jornadaActiva, horaInicio: v }) }} disabled={!!jornadaActiva.configurado} />
              <TimePicker label="Hasta" value={jornadaActiva.horaFin} onChange={(v) => { setEditandoConfig(true); setJornadaActiva({ ...jornadaActiva, horaFin: v }) }} disabled={!!jornadaActiva.configurado} />
            </div>

            {jornadaActiva.configurado && (
              <p className="text-[11px] text-amber-400 flex items-center gap-1">
                <AlertTriangle size={12} /> Horario bloqueado — creá una nueva jornada si necesitás cambiarlo.
              </p>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Duración / Intervalo del turno</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[{ label: '30 min', val: 30 }, { label: '45 min', val: 45 }, { label: '1 hora', val: 60 }, { label: '1h 30m', val: 90 }, { label: '2 horas', val: 120 }].map((item) => (
                  <button key={item.val} type="button" onClick={() => { setEditandoConfig(true); setJornadaActiva({ ...jornadaActiva, intervaloMinutos: item.val }) }}
                    className={`flex-1 min-w-[55px] rounded-lg py-1.5 text-xs font-semibold ${jornadaActiva.intervaloMinutos === item.val ? 'bg-barber-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'} ${jornadaActiva.configurado ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!!jornadaActiva.configurado}>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 shrink-0">O ingresar minutos:</span>
                <input type="number" min={5} max={480} step={5} value={jornadaActiva.intervaloMinutos}
                  onChange={(e) => { setEditandoConfig(true); setJornadaActiva({ ...jornadaActiva, intervaloMinutos: parseInt(e.target.value) || 30 }) }}
                  className={`w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:border-barber-500 focus:outline-none ${jornadaActiva.configurado ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!!jornadaActiva.configurado} />
                <span className="text-xs text-slate-400">min</span>
              </div>
            </div>

            {!jornadaActiva.configurado && (
              <Button size="sm" className="w-full text-xs font-bold" onClick={handleRegenerar}>
                Aplicar / Generar horario
              </Button>
            )}
          </div>

          {(!jornadaActiva.configurado || !jornadaActiva.whatsappConfigurado) && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-[11px] leading-relaxed text-amber-300/80">
                Presioná <strong>"Aplicar / Generar horario"</strong> para confirmar el horario y <strong>"Guardar configuración WhatsApp"</strong> para los datos de WhatsApp. Cuando ambos estén confirmados, el enlace estará disponible y la configuración quedará bloqueada permanentemente.
              </p>
            </div>
          )}

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div>
              <p className="text-sm font-medium text-white">Permitir reserva pública</p>
              <p className="text-xs text-slate-400">
                {jornadaActiva.permitirReservaPublica ? 'Los clientes pueden reservar directamente' : 'Solo ver horarios (reserva por WhatsApp)'}
              </p>
            </div>
            <div onClick={togglePublico} className={`relative h-6 w-11 rounded-full transition-colors ${jornadaActiva.permitirReservaPublica ? 'bg-barber-500' : 'bg-slate-700'}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${jornadaActiva.permitirReservaPublica ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>

          {/* ── Configuración WhatsApp ── */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">WhatsApp</p>
            <Input
              label="Número del barbero"
              value={jornadaActiva.whatsappBarbero ?? DEFAULT_WHATSAPP_BARBERO}
              onChange={(e) => { setEditandoConfig(true); setJornadaActiva({ ...jornadaActiva, whatsappBarbero: formatearTelefono(e.target.value) }) }}
              placeholder="Ej: 0971 138 195"
              disabled={!!jornadaActiva.whatsappConfigurado}
            />
            <div>
              <Input
                label="Mensaje predeterminado"
                value={jornadaActiva.mensajeWhatsapp ?? DEFAULT_MENSAJE_WHATSAPP}
                onChange={(e) => { setEditandoConfig(true); setJornadaActiva({ ...jornadaActiva, mensajeWhatsapp: e.target.value }) }}
                placeholder="Ej: Reservado para las {hora}"
                disabled={!!jornadaActiva.whatsappConfigurado}
              />
              <p className="mt-1 text-[10px] text-slate-500">Variables: <code className="text-barber-400">{'{hora}'}</code> <code className="text-barber-400">{'{fecha}'}</code> <code className="text-barber-400">{'{nombre}'}</code></p>
            </div>
            {!jornadaActiva.whatsappConfigurado && (
              <Button size="sm" className="w-full text-xs font-bold" onClick={() => { setEditandoConfig(false); guardarJornada({ ...jornadaActiva, whatsappConfigurado: true }) }}>
                Guardar configuración WhatsApp
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-emerald-400 font-medium">{disponiblesCount} disponibles</span>
            <span className="text-red-400 font-medium">{reservadasCount} reservados</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {jornadaActiva.slots.map((slot) => {
              const esReservado = slot.estado === 'reservado'
              const esBloqueado = slot.estado === 'bloqueado'
              return (
                <div key={slot.id} className={`relative flex flex-col justify-between rounded-xl border p-2.5 transition-all ${
                  esReservado ? 'border-red-500/40 bg-red-500/10 text-red-200' : esBloqueado ? 'border-amber-600/40 bg-amber-600/10 text-amber-300' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500'}`}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-bold tracking-tight">{slot.horaInicio} - {slot.horaFin}</span>
                    <button
                      type="button"
                      onClick={() => toggleBloqueoSlot(slot.id)}
                      title={esBloqueado ? 'Desbloquear este horario' : 'Bloquear este horario (no disponible al público)'}
                      className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                        esBloqueado
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/40'
                          : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-amber-300'
                      }`}
                    >
                      {esBloqueado ? <><Unlock size={11} /> Desbloquear</> : <><Lock size={11} /> Bloquear</>}
                    </button>
                  </div>
                  <div className="mt-2">
                    {esReservado ? (
                      <div>
                        <p className="text-xs font-semibold truncate text-red-300">{slot.clienteNombre || 'Reservado'}</p>
                        {slot.opcionNombre && (
                          <p className="text-[10px] text-amber-300 font-medium truncate mt-0.5">
                            ✂️ {slot.opcionNombre} {slot.opcionPrecio ? `(${slot.opcionPrecio.toLocaleString('es-PY')} Gs)` : ''}
                          </p>
                        )}
                        {slot.notas && (
                          <p className="text-[9px] text-slate-300 italic truncate mt-0.5">
                            📝 {slot.notas}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirReservaManual(slot)}
                            className="rounded bg-slate-700/80 px-2 py-0.5 text-[10px] font-semibold text-slate-200 hover:bg-slate-600"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Eliminar la reserva de ${slot.clienteNombre || 'este turno'}? El horario quedará libre nuevamente.`)) {
                                liberarSlot(slot.id)
                              }
                            }}
                            className="flex items-center gap-0.5 rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 hover:bg-red-500/30"
                          >
                            <X size={10} /> Eliminar
                          </button>
                        </div>
                      </div>
                    ) : esBloqueado ? (
                      <div>
                        <span className="text-[11px] font-semibold text-amber-400">🔒 Bloqueado</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">No visible al público</p>
                      </div>
                    ) : (
                      <button type="button" onClick={() => abrirReservaManual(slot)} className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30">
                        <Plus size={12} /> Reservar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Lista Detallada de Reservas del Día ── */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Scissors size={14} className="text-barber-400" />
                Reservas Confirmadas del Día ({reservadasCount})
              </h3>
              {reservadasCount > 0 && (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {reservadasCount} turno(s) reservado(s)
                </span>
              )}
            </div>

            {jornadaActiva.slots.filter((s) => s.estado === 'reservado').length === 0 ? (
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 text-center">
                <Clock size={22} className="mx-auto mb-1.5 text-slate-600" />
                <p className="text-xs font-semibold text-slate-400">Sin reservas registradas para este día</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Las reservas online o manuales aparecerán detalladas aquí con el cliente, corte y observaciones.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {jornadaActiva.slots
                  .filter((s) => s.estado === 'reservado')
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 shadow-md hover:border-slate-700 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-barber-500/20 px-2 py-0.5 text-xs font-bold text-barber-400 border border-barber-500/30">
                              ⏰ {slot.horaInicio} - {slot.horaFin}
                            </span>
                            <span className="text-sm font-bold text-white truncate">
                              👤 {slot.clienteNombre || 'Cliente sin nombre'}
                            </span>
                          </div>
                          {slot.clienteTelefono && (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                              📞 {slot.clienteTelefono}
                              <a
                                href={whatsappUrl(slot.clienteTelefono, '')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-emerald-400 hover:text-emerald-300 text-[11px] font-medium ml-1"
                              >
                                <MessageCircle size={12} className="inline mr-0.5" /> WhatsApp
                              </a>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => abrirReservaManual(slot)}
                            className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Liberar reserva de ${slot.clienteNombre || 'este turno'}?`)) {
                                liberarSlot(slot.id)
                              }
                            }}
                            className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Liberar
                          </button>
                        </div>
                      </div>

                      {/* Servicio y Nota Opcional */}
                      <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800/80 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="font-semibold flex items-center gap-1.5 text-amber-300">
                            <Scissors size={13} className="text-amber-400" />
                            {slot.opcionNombre || 'Servicio general'}
                          </span>
                          <span className="font-bold text-emerald-400">
                            {slot.opcionPrecio ? `${slot.opcionPrecio.toLocaleString('es-PY')} Gs` : 'Sin costo asignado'}
                          </span>
                        </div>
                        {slot.notas && (
                          <div className="pt-1.5 border-t border-slate-900 text-[11px] text-slate-300 flex items-start gap-1">
                            <span className="shrink-0">📝</span>
                            <p className="italic leading-tight">
                              <strong>Nota:</strong> {slot.notas}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {slotSeleccionado && (
        <Modal open={!!slotSeleccionado} onClose={() => setSlotSeleccionado(null)} title={`Turno ${slotSeleccionado.horaInicio} - ${slotSeleccionado.horaFin}`}>
          <div className="space-y-3">
            <Input label="Nombre del cliente" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} placeholder="Ej: Carlos" required />
            <Input label="Teléfono / WhatsApp (opcional)" value={telefonoCliente} onChange={(e) => setTelefonoCliente(e.target.value)} placeholder="Ej: 0981 123 456" />

            {opcionesCliente.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  ¿Qué desea hacerse?
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {opcionesCliente.map((op) => {
                    const esSeleccionado = opcionSeleccionada?.id === op.id
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setOpcionSeleccionada(op)}
                        className={`w-full flex items-center justify-between gap-2 rounded-lg border p-2 text-left text-xs transition-all ${
                          esSeleccionado
                            ? 'border-barber-500 bg-barber-500/15 text-white ring-1 ring-barber-500'
                            : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Scissors size={14} className={esSeleccionado ? 'text-barber-400' : 'text-slate-500'} />
                          <span className="font-semibold truncate">{op.nombre}</span>
                        </div>
                        <span className={`font-bold shrink-0 ${esSeleccionado ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {op.precio > 0 ? `${op.precio.toLocaleString('es-PY')} Gs` : 'Sin costo'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Nota u observación (opcional)
              </label>
              <textarea
                value={notasCliente}
                onChange={(e) => setNotasCliente(e.target.value)}
                placeholder="Ej: Cliente preferencial / Detalle especial"
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-barber-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {slotSeleccionado.estado === 'reservado' && (
                <Button type="button" variant="ghost" className="text-red-400" onClick={() => liberarSlot(slotSeleccionado.id)}>Liberar turno</Button>
              )}
              <Button type="button" className="flex-1" onClick={confirmarReservaManual} disabled={!nombreCliente.trim() || guardando}>{guardando ? 'Guardando...' : 'Guardar Reserva'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  )
}


