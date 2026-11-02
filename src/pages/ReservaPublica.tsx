import { AlertTriangle, CheckCircle2, Clock, MessageCircle, Scissors } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { JornadaReservas, OpcionCliente, TurnoSlot } from '../lib/types'
import { hoyISO } from '../lib/dates'
import { APP_NAME } from '../lib/constants'
import {
  DEFAULT_WHATSAPP_BARBERO,
  construirMensajeWhatsapp,
  formatearWaMe,
  registrarCobroYClientePorReserva,
} from '../lib/reservasUtils'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'

const REFRESH_INTERVAL_MS = 5000 // 5 segundos

export function ReservaPublica() {
  const [searchParams] = useSearchParams()
  const jornadaId = searchParams.get('id')
  const fechaParam = searchParams.get('fecha')
  const fecha = fechaParam || hoyISO()
  const [jornada, setJornada] = useState<JornadaReservas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [opciones, setOpciones] = useState<OpcionCliente[]>([])

  // Booking Modal
  const [slotTarget, setSlotTarget] = useState<TurnoSlot | null>(null)
  const [nombre, setNombre] = useState('')
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<OpcionCliente | null>(null)
  const [nota, setNota] = useState('')
  const [errorConflicto, setErrorConflicto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [confirmado, setConfirmado] = useState<{
    slot: TurnoSlot
    cliente: string
    opcionNombre?: string
    opcionPrecio?: number
    nota?: string
    waUrl: string
  } | null>(null)

  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cargar opciones del cliente
  useEffect(() => {
    api.getOpcionesClienteRemota().then((opcs) => {
      setOpciones(opcs)
    })
  }, [])

  /** Carga desde Firebase */
  const cargarJornada = useCallback(async () => {
    try {
      let j: JornadaReservas | null = null
      if (jornadaId) {
        j = await api.getJornadaReservasRemota(jornadaId)
      }
      if (!j) {
        j = await api.getJornadaReservasPorFecha(fecha)
      }
      setJornada(j)
      setCargando(false)
      return j
    } catch (e) {
      console.error('Error al cargar jornada:', e)
      setCargando(false)
      return null
    }
  }, [jornadaId, fecha])

  // Carga inicial + auto-refresh cada 10 segundos
  useEffect(() => {
    cargarJornada()
    refreshRef.current = setInterval(cargarJornada, REFRESH_INTERVAL_MS)
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
  }, [cargarJornada])

  const barberPhoneClean = formatearWaMe(jornada?.whatsappBarbero || DEFAULT_WHATSAPP_BARBERO)

  const handleSeleccionarSlot = async (slot: TurnoSlot) => {
    if (!jornada) return

    if (!jornada.permitirReservaPublica) {
      const msgText = construirMensajeWhatsapp(
        jornada.mensajeWhatsapp,
        slot.horaInicio,
        fecha,
        '',
      )
      window.location.href = `https://wa.me/${barberPhoneClean}?text=${encodeURIComponent(msgText)}`
      return
    }

    // Refrescar antes de abrir el modal para verificar disponibilidad
    const jornadaFresca = await cargarJornada()
    const slotActual = jornadaFresca?.slots.find((s) => s.id === slot.id)
    if (!slotActual || slotActual.estado !== 'disponible') {
      setErrorConflicto(true)
      return
    }

    setSlotTarget(slotActual)
    setNombre('')
    setNota('')
    setOpcionSeleccionada(opciones.length > 0 ? opciones[0] : null)
    setErrorConflicto(false)
  }

  const handleConfirmarReserva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jornada || !slotTarget || !nombre.trim() || guardando) return

    setGuardando(true)
    setErrorConflicto(false)

    try {
      // Re-verificar desde Firebase que el slot sigue disponible
      const jornadaFresca = await api.getJornadaReservasRemota(jornada.id)
      if (!jornadaFresca) {
        setGuardando(false)
        return
      }

      const slotActual = jornadaFresca.slots.find((s) => s.id === slotTarget.id)
      if (!slotActual || slotActual.estado !== 'disponible') {
        setJornada(jornadaFresca)
        setErrorConflicto(true)
        setGuardando(false)
        setSlotTarget(null)
        return
      }

      const { cobro } = await registrarCobroYClientePorReserva({
        clienteNombre: nombre.trim(),
        fecha,
        horaInicio: slotTarget.horaInicio,
        opcionNombre: opcionSeleccionada?.nombre,
        opcionPrecio: opcionSeleccionada?.precio,
        notas: nota.trim() || undefined,
      })

      const nuevosSlots = jornadaFresca.slots.map((s) => {
        if (s.id === slotTarget.id) {
          return {
            ...s,
            estado: 'reservado' as const,
            clienteNombre: nombre.trim(),
            opcionNombre: opcionSeleccionada?.nombre,
            opcionPrecio: opcionSeleccionada?.precio,
            notas: nota.trim() || undefined,
            cobroId: cobro.id,
          }
        }
        return s
      })

      const jornadaActualizada: JornadaReservas = {
        ...jornadaFresca,
        slots: nuevosSlots,
      }

      await api.saveJornadaReservas(jornadaActualizada)
      setJornada(jornadaActualizada)

      const mensajeText = construirMensajeWhatsapp(
        jornadaFresca.mensajeWhatsapp,
        slotTarget.horaInicio,
        fecha,
        nombre.trim(),
        opcionSeleccionada?.nombre,
        opcionSeleccionada?.precio,
        nota.trim() || undefined,
      )
      const waUrl = `https://wa.me/${barberPhoneClean}?text=${encodeURIComponent(mensajeText)}`

      window.open(waUrl, '_blank')

      setConfirmado({
        slot: slotTarget,
        cliente: nombre.trim(),
        opcionNombre: opcionSeleccionada?.nombre,
        opcionPrecio: opcionSeleccionada?.precio,
        nota: nota.trim() || undefined,
        waUrl,
      })
      setSlotTarget(null)
    } catch (e) {
      console.error('Error al confirmar reserva:', e)
      alert('Ocurrió un error al confirmar la reserva. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-slate-950 text-slate-100 selection:bg-barber-500 selection:text-white">
      {/* Custom Background Image Layer */}
      <div 
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 transition-opacity duration-500"
        style={{ backgroundImage: `url('/fondo-reservas.jpg'), url('/fondo-reservas.png')` }}
      />

      {/* Dark Overlay Gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/50 to-slate-950" />

      {/* Background Decorative Ambient Glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[350px] w-[500px] rounded-full bg-gradient-to-tr from-amber-600/20 via-barber-500/20 to-emerald-500/10 blur-[100px] opacity-70" />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-64 w-64 rounded-full bg-barber-600/10 blur-[80px]" />
      <div className="pointer-events-none absolute bottom-10 -left-32 h-64 w-64 rounded-full bg-emerald-600/10 blur-[80px]" />

      {/* Subtle Barber Diagonal Lines Pattern Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 0, transparent 20px)` 
        }} 
      />

      <div className="relative mx-auto min-h-dvh max-w-lg px-4 py-8 flex flex-col justify-between" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div>
          {/* Header Branding */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-barber-500/30 to-barber-600/10 text-barber-400 border border-barber-500/40 shadow-xl shadow-barber-500/10 backdrop-blur-md">
              <img 
                src="/icon.png" 
                alt={APP_NAME} 
                className="h-full w-full object-cover" 
                onError={(e) => {
                  // Fallback to Scissors icon if image not found yet
                  e.currentTarget.style.display = 'none'
                  if (e.currentTarget.nextElementSibling) {
                    ;(e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'
                  }
                }}
              />
              <div className="hidden h-full w-full items-center justify-center">
                <Scissors size={36} />
              </div>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-white drop-shadow-md">{APP_NAME}</h1>
            <p className="text-xs font-medium text-slate-400 tracking-wide mt-1">Reserva de Turnos Online</p>
          </div>

          {/* Slots List */}
          {!jornada || jornada.slots.length === 0 ? (
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 text-center backdrop-blur-md shadow-xl">
              {cargando ? (
                <>
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-barber-500 border-t-transparent" />
                  <p className="text-sm font-bold text-slate-300">Cargando horarios...</p>
                </>
              ) : (
                <>
                  <Clock size={36} className="mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-bold text-slate-300">No hay horarios disponibles</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Armando aún no ha publicado la agenda para este día.
                  </p>
                </>
              )}
            </div>
          ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Turnos disponibles ({fecha})
            </h2>
            <span className="text-xs text-emerald-400 font-medium">
              {jornada.slots.filter((s) => s.estado === 'disponible').length} libres
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {jornada.slots.map((slot) => {
              const esReservado = slot.estado === 'reservado'
              const esBloqueado = slot.estado === 'bloqueado'
              const esDisponible = slot.estado === 'disponible'

              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!esDisponible}
                  onClick={() => handleSeleccionarSlot(slot)}
                  className={`group relative flex flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition-all ${
                    esReservado
                      ? 'border-slate-800 bg-slate-900/50 text-slate-500 cursor-not-allowed opacity-60'
                      : esBloqueado
                      ? 'border-slate-800 bg-slate-900/30 text-slate-600 cursor-not-allowed opacity-40'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500 hover:bg-emerald-500/20 active:scale-[0.98]'
                  }`}
                >
                  <span
                    className={`text-base font-extrabold tracking-tight ${
                      esReservado ? 'line-through decoration-red-500/60' : ''
                    }`}
                  >
                    {slot.horaInicio} - {slot.horaFin}
                  </span>

                  <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider">
                    {esReservado ? (
                      <span className="text-red-400">Reservado</span>
                    ) : esBloqueado ? (
                      'No disponible'
                    ) : (
                      <span className="text-emerald-400">Tocar para reservar</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {jornada && !jornada.permitirReservaPublica && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
              <MessageCircle size={24} className="mx-auto mb-2 text-emerald-400" />
              <p className="text-xs font-semibold text-emerald-300">Reservas por WhatsApp</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Tocá un horario disponible para enviar un mensaje a Armando
              </p>
              <a
                href={`https://wa.me/${barberPhoneClean}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                <MessageCircle size={14} />
                {jornada.whatsappBarbero || DEFAULT_WHATSAPP_BARBERO}
              </a>
            </div>
          )}
        </div>
      )}
    </div>

      {/* Aviso de conflicto */}
      {errorConflicto && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 animate-pulse">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">
            <strong>Este turno ya fue reservado</strong> por otra persona. La página se actualizó con los turnos disponibles.
          </p>
        </div>
      )}

      {/* Modal para ingresar datos de reserva */}
      {slotTarget && (
        <Modal
          open={!!slotTarget}
          onClose={() => setSlotTarget(null)}
          title={`Reservar turno ${slotTarget.horaInicio} - ${slotTarget.horaFin}`}
        >
          <form onSubmit={handleConfirmarReserva} className="space-y-4">
            <p className="text-xs text-slate-400">
              Ingresá tu nombre y elegí qué te querés hacer para reservar tu turno.
            </p>

            <Input
              label="Tu Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Juan Pérez"
              required
            />

            {/* Opciones del cliente (¿Qué desea hacerse?) */}
            {opciones.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  ¿Qué deseas hacerte?
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {opciones.map((op) => {
                    const esSeleccionado = opcionSeleccionada?.id === op.id
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setOpcionSeleccionada(op)}
                        className={`w-full flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition-all ${
                          esSeleccionado
                            ? 'border-barber-500 bg-barber-500/15 text-white ring-1 ring-barber-500 shadow-md'
                            : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Scissors
                            size={16}
                            className={esSeleccionado ? 'text-barber-400' : 'text-slate-500'}
                          />
                          <span className="text-sm font-semibold truncate">{op.nombre}</span>
                        </div>
                        <span
                          className={`text-xs font-bold shrink-0 ${
                            esSeleccionado ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {op.precio > 0 ? `${op.precio.toLocaleString('es-PY')} Gs` : 'Sin costo'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Nota opcional */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Nota u observación (opcional)
              </label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej: Llego 5 min antes / Algún detalle especial"
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-barber-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setSlotTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500" disabled={guardando}>
                <MessageCircle size={16} className="mr-1.5 inline" />
                {guardando ? 'Reservando...' : 'Reservar lugar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Éxito / Confirmación por WhatsApp */}
      {confirmado && (
        <Modal
          open={!!confirmado}
          onClose={() => setConfirmado(null)}
          title="¡Turno Reservado! 🎉"
        >
          <div className="text-center space-y-4 py-2">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-white">
                {confirmado.cliente}, tu turno fue registrado para:
              </p>
              <p className="mt-1 text-lg font-bold text-barber-400">
                {confirmado.slot.horaInicio} - {confirmado.slot.horaFin} ({fecha})
              </p>
              {confirmado.opcionNombre && (
                <p className="mt-2 text-xs font-semibold text-amber-300 bg-amber-500/10 py-1.5 px-3 rounded-lg inline-block border border-amber-500/20">
                  ✂️ {confirmado.opcionNombre} {confirmado.opcionPrecio ? `(${confirmado.opcionPrecio.toLocaleString('es-PY')} Gs)` : ''}
                </p>
              )}
              {confirmado.nota && (
                <p className="mt-1 text-xs text-slate-300 italic">
                  📝 Nota: {confirmado.nota}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Se abrió WhatsApp para notificar a Armando. Si no se abrió automáticamente, tocá el botón de abajo:
            </p>

            <a
              href={confirmado.waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:bg-emerald-500 active:scale-95"
            >
              <MessageCircle size={20} />
              Enviar mensaje a WhatsApp
            </a>
          </div>
        </Modal>
      )}

      {/* Footer Branding */}
      <div className="mt-8 text-center text-slate-600 text-[11px]">
        <p>© {new Date().getFullYear()} {APP_NAME} · Sistema de Reservas</p>
      </div>
    </div>
  </div>
)
}
export default ReservaPublica




