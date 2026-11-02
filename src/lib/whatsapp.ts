import { formatearFechaCorta } from './dates'
import type { Cliente, Plan } from './types'

export function formatTelefono(val: string): string {
  const clean = val.replace(/\D/g, '')
  if (!clean) return ''
  if (clean.startsWith('0')) {
    const p1 = clean.substring(0, 4)
    const p2 = clean.substring(4, 7)
    const p3 = clean.substring(7, 10)
    if (clean.length > 7) return `${p1} ${p2} ${p3}`
    if (clean.length > 4) return `${p1} ${p2}`
    return p1
  } else {
    const p1 = clean.substring(0, 3)
    const p2 = clean.substring(3, 6)
    const p3 = clean.substring(6, 9)
    if (clean.length > 6) return `${p1} ${p2} ${p3}`
    if (clean.length > 3) return `${p1} ${p2}`
    return p1
  }
}

export function normalizarTelefono(telefono: string): string {
  const digits = telefono.replace(/\D/g, '')
  if (!digits) return ''

  if (digits.startsWith('595')) {
    const rest = digits.slice(3)
    if (rest.startsWith('0')) {
      return '595' + rest.slice(1)
    }
    return digits
  }

  if (digits.startsWith('0')) {
    return '595' + digits.slice(1)
  }

  return '595' + digits
}

export function whatsappUrl(telefono: string, mensaje: string): string {
  return `https://wa.me/${normalizarTelefono(telefono)}?text=${encodeURIComponent(mensaje)}`
}

export function mensajePlanPorVencer(cliente: Cliente, plan: Plan): string {
  const nombre = cliente.nombre
  const fin = formatearFechaCorta(plan.fechaFin)
  return `Hola ${nombre}, desde Timantti Barber te recordamos que tu plan vence el ${fin}. ¡Renueva a tiempo para seguir luciendo bien!`
}


