import type { Cliente, Cobro, JornadaReservas, TurnoSlot } from './types'
import { api } from './api'

export const DEFAULT_WHATSAPP_BARBERO = '0971 138 195'
export const DEFAULT_MENSAJE_WHATSAPP = 'Reservado para las {hora}'

/** Formatea un número paraguayo con espacios: 0982362830 → 0982 362 830 */
export function formatearTelefono(num: string): string {
  const digits = num.replace(/\D/g, '')
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
}

export function formatearWaMe(num: string): string {
  let clean = num.replace(/\D/g, '')
  if (clean.startsWith('0')) {
    clean = '595' + clean.slice(1)
  } else if (!clean.startsWith('595') && clean.length <= 9) {
    clean = '595' + clean
  }
  return clean
}

export function construirMensajeWhatsapp(
  template: string | undefined,
  hora: string,
  fecha: string,
  nombre: string,
  opcionNombre?: string,
  opcionPrecio?: number,
  notas?: string,
): string {
  const tpl = template?.trim() || DEFAULT_MENSAJE_WHATSAPP
  let msg = tpl
    .replace(/\{hora\}/g, hora)
    .replace(/\{fecha\}/g, fecha)
    .replace(/\{nombre\}/g, nombre)

  if (opcionNombre) {
    const precioStr = opcionPrecio ? ` (${opcionPrecio.toLocaleString('es-PY')} Gs)` : ''
    msg += `\n*Servicio:* ${opcionNombre}${precioStr}`
  }
  if (notas?.trim()) {
    msg += `\n*Nota:* ${notas.trim()}`
  }
  return msg
}

export function generarSlotsJornada(
  horaInicioStr: string, // "12:00"
  horaFinStr: string, // "22:00"
  intervaloMinutos: number, // 60, 45, 30
  existingSlots: TurnoSlot[] = [],
): TurnoSlot[] {
  const parseMinutos = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const formatMinutos = (totalMin: number) => {
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const startMin = parseMinutos(horaInicioStr)
  const endMin = parseMinutos(horaFinStr)
  const slots: TurnoSlot[] = []

  let curr = startMin
  while (curr + intervaloMinutos <= endMin) {
    const hInicio = formatMinutos(curr)
    const hFin = formatMinutos(curr + intervaloMinutos)
    const slotId = `${hInicio}-${hFin}`

    const found = existingSlots.find((s) => s.id === slotId || s.horaInicio === hInicio)

    if (found) {
      slots.push({
        ...found,
        horaInicio: hInicio,
        horaFin: hFin,
      })
    } else {
      slots.push({
        id: slotId,
        horaInicio: hInicio,
        horaFin: hFin,
        estado: 'disponible',
      })
    }

    curr += intervaloMinutos
  }

  return slots
}

export function crearJornadaPorDefecto(fecha: string): JornadaReservas {
  const hInicio = '12:00'
  const hFin = '22:00'
  const intervalo = 60
  return {
    id: crypto.randomUUID(),
    fecha,
    horaInicio: hInicio,
    horaFin: hFin,
    intervaloMinutos: intervalo,
    permitirReservaPublica: true,
    whatsappBarbero: DEFAULT_WHATSAPP_BARBERO,
    mensajeWhatsapp: DEFAULT_MENSAJE_WHATSAPP,
    slots: generarSlotsJornada(hInicio, hFin, intervalo),
    creadoEn: new Date().toISOString(),
    configurado: false,
    whatsappConfigurado: false,
  }
}

export async function registrarCobroYClientePorReserva({
  clienteNombre,
  clienteTelefono,
  fecha,
  horaInicio,
  opcionNombre,
  opcionPrecio,
  notas,
}: {
  clienteNombre: string
  clienteTelefono?: string
  fecha: string
  horaInicio: string
  opcionNombre?: string
  opcionPrecio?: number
  notas?: string
}): Promise<{ cliente: Cliente; cobro: Cobro }> {
  const qNombre = clienteNombre.trim().toLowerCase()
  const qTel = clienteTelefono?.trim() || ''

  let clientesExistentes: Cliente[] = []
  try {
    clientesExistentes = await api.getClientes()
  } catch {}

  let cliente = clientesExistentes.find((c) => {
    const nombreCompleto = `${c.nombre} ${c.apellido}`.trim().toLowerCase()
    if (nombreCompleto === qNombre || c.nombre.trim().toLowerCase() === qNombre) return true
    if (qTel && c.telefono && c.telefono.replace(/\D/g, '') === qTel.replace(/\D/g, '')) return true
    return false
  })

  if (!cliente) {
    const partes = clienteNombre.trim().split(' ')
    const nombre = partes[0] || clienteNombre.trim()
    const apellido = partes.slice(1).join(' ') || ''
    cliente = {
      id: crypto.randomUUID(),
      nombre,
      apellido,
      telefono: clienteTelefono?.trim() || '',
      notas: notas?.trim() || undefined,
      creadoEn: new Date().toISOString(),
    }
  }

  await api.saveCliente(cliente)

  let monto = opcionPrecio ?? 0
  if (!monto && opcionNombre) {
    const opciones = await api.getOpcionesCliente()
    const match = opciones.find((o) => o.nombre.toLowerCase() === opcionNombre.toLowerCase())
    if (match) monto = match.precio
  }

  const servicioDetalle = opcionNombre
    ? `${opcionNombre} (${fecha} ${horaInicio})`
    : `Reserva (${fecha} ${horaInicio})`

  const clienteNombreCompleto = `${cliente.nombre} ${cliente.apellido}`.trim()

  const cobro: Cobro = {
    id: crypto.randomUUID(),
    clienteId: cliente.id,
    planId: '',
    fecha: fecha,
    monto: monto,
    montoPlan: monto,
    estado: 'pendiente',
    tipo: 'ingreso',
    descripcion: `${clienteNombreCompleto} · ${servicioDetalle}`,
    creadoEn: new Date().toISOString(),
  }

  await api.saveCobro(cobro)

  return { cliente, cobro }
}


