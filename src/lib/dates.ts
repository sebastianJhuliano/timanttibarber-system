import {
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { Plan } from './types'

function hoy(): Date {
  return startOfDay(new Date())
}

export function hoyISO(): string {
  return format(hoy(), 'yyyy-MM-dd')
}

export function formatearFechaCorta(fecha: string): string {
  return format(parseISO(fecha), 'dd/MM/yyyy')
}

export function formatearMoneda(valor: number): string {
  return Math.floor(valor).toLocaleString('de-DE')
}



export function planSinDuracion(plan: Plan): boolean {
  return plan.fechaInicio === plan.fechaFin
}

export function planEstaActivo(plan: Plan, fecha = hoy()): boolean {
  const inicio = startOfDay(parseISO(plan.fechaInicio))
  const fin = startOfDay(parseISO(plan.fechaFin))
  return (
    (isEqual(fecha, inicio) || isAfter(fecha, inicio)) &&
    (isEqual(fecha, fin) || isBefore(fecha, fin))
  )
}

export function planVenceHoy(plan: Plan): boolean {
  if (planSinDuracion(plan)) return false
  return isEqual(startOfDay(parseISO(plan.fechaFin)), hoy())
}

export function planPorVencer(plan: Plan, dias = 3): boolean {
  if (planSinDuracion(plan)) return false
  const fin = startOfDay(parseISO(plan.fechaFin))
  const diff = differenceInCalendarDays(fin, hoy())
  return diff >= 0 && diff <= dias
}

export function diasRestantes(plan: Plan): number {
  if (planSinDuracion(plan)) return 0
  return differenceInCalendarDays(startOfDay(parseISO(plan.fechaFin)), hoy())
}

export function planVencido(plan: Plan): boolean {
  if (planSinDuracion(plan)) return false
  return isBefore(startOfDay(parseISO(plan.fechaFin)), hoy())
}



export function formatearNumeroCompacto(valor: number): string {
  return Math.floor(valor).toLocaleString('de-DE')
}

export function etiquetaTipoPlan(tipo: string): string {
  try {
    const raw = localStorage.getItem('barber_plan_tipos')
    if (raw) {
      const parsed = JSON.parse(raw) as any[]
      const found = parsed.find((t: any) => t.id === tipo)
      if (found) return found.nombre
    }
  } catch {}
  return tipo
}
