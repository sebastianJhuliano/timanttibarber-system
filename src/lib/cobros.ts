import type { Cobro, Plan } from './types'

export function crearCobroDesdePlan(plan: Plan): Cobro {
  return {
    id: crypto.randomUUID(),
    clienteId: plan.clienteId,
    planId: plan.id,
    fecha: plan.fechaInicio,
    monto: plan.monto,
    montoPlan: plan.monto,
    estado: 'pendiente',
    creadoEn: new Date().toISOString(),
  }
}

export function cobroCuentaEnIngresos(cobro: Cobro): boolean {
  return cobro.estado === 'pagado'
}

export function ingresosDelMes(cobros: Cobro[], mes: string): number {
  return cobros
    .filter((c) => cobroCuentaEnIngresos(c) && c.pagadoEn?.startsWith(mes))
    .reduce((s, c) => {
      if (c.tipo === 'egreso') return s - c.monto
      return s + c.monto
    }, 0)
}

export function cobrosPendientes(cobros: Cobro[]): Cobro[] {
  return cobros
    .filter((c) => c.estado === 'pendiente')
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
}

