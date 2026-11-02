import type { Cliente, Cobro, JornadaReservas, OpcionCliente, Plan, PlanTipoConfig } from './types'

const CLIENTES_KEY = 'barber_clientes'
const PLANES_KEY = 'barber_planes'
const COBROS_KEY = 'barber_cobros'
const JORNADAS_KEY = 'barber_jornadas_reservas'
const OPCIONES_CLIENTE_KEY = 'barber_opciones_cliente'

const DEFAULT_OPCIONES_CLIENTE: OpcionCliente[] = [
  { id: '1', nombre: 'Corte de Pelo', precio: 40000 },
  { id: '2', nombre: 'Perfilado de Barba', precio: 25000 },
  { id: '3', nombre: 'Corte + Barba', precio: 60000 },
]

const cache = new Map<string, { data: unknown; version: number }>()
let globalVersion = 0

function leer<T>(key: string): T[] {
  try {
    const cached = cache.get(key)
    if (cached) return cached.data as T[]
    const raw = localStorage.getItem(key)
    const data: T[] = raw ? (JSON.parse(raw) as T[]) : []
    cache.set(key, { data, version: globalVersion })
    return data
  } catch {
    return []
  }
}

function guardar<T>(key: string, data: T[]): void {
  globalVersion++
  cache.set(key, { data, version: globalVersion })
  localStorage.setItem(key, JSON.stringify(data))
}

function invalidarCache(): void {
  globalVersion++
  cache.clear()
}

export const localStore = {
  getClientes(): Cliente[] {
    return leer<Cliente>(CLIENTES_KEY)
  },

  saveClientes(clientes: Cliente[]): void {
    guardar(CLIENTES_KEY, clientes)
  },

  saveCliente(cliente: Cliente): void {
    const list = this.getClientes()
    const idx = list.findIndex((c) => c.id === cliente.id)
    if (idx >= 0) list[idx] = cliente
    else list.unshift(cliente)
    guardar(CLIENTES_KEY, list)
  },

  deleteCliente(id: string): void {
    guardar(CLIENTES_KEY, this.getClientes().filter((c) => c.id !== id))
  },

  getPlanes(): Plan[] {
    return leer<Plan>(PLANES_KEY)
  },

  savePlanes(planes: Plan[]): void {
    guardar(PLANES_KEY, planes)
  },

  savePlan(plan: Plan): void {
    const list = this.getPlanes()
    const idx = list.findIndex((p) => p.id === plan.id)
    if (idx >= 0) list[idx] = plan
    else list.unshift(plan)
    guardar(PLANES_KEY, list)
  },

  deletePlan(id: string): void {
    guardar(PLANES_KEY, this.getPlanes().filter((p) => p.id !== id))
    guardar(
      COBROS_KEY,
      this.getCobros().filter((c) => c.planId !== id || c.estado === 'pagado'),
    )
  },

  getCobros(): Cobro[] {
    return leer<Cobro>(COBROS_KEY)
  },

  saveCobros(cobros: Cobro[]): void {
    guardar(COBROS_KEY, cobros)
  },

  saveCobro(cobro: Cobro): void {
    const list = this.getCobros()
    const idx = list.findIndex((c) => c.id === cobro.id)
    if (idx >= 0) list[idx] = cobro
    else list.unshift(cobro)
    guardar(COBROS_KEY, list)
  },

  deleteCobro(id: string): void {
    guardar(COBROS_KEY, this.getCobros().filter((c) => c.id !== id))
  },

  getPlanTipos(): PlanTipoConfig[] {
    try {
      const raw = localStorage.getItem('barber_plan_tipos')
      if (raw) {
        const parsed = JSON.parse(raw) as any[]
        return parsed.map((t: any) => {
          if (t.duracion !== undefined) return t as PlanTipoConfig
          if (t.id === 'personalizado') return { ...t, duracion: null }
          if (t.id === 'diario') return { ...t, duracion: { tipo: 'dias', valor: 1 } }
          return { ...t, duracion: { tipo: 'meses', valor: 1 } }
        })
      }
    } catch {}
    return [
      { id: 'mensual', nombre: 'Mensual', monto: 100000, duracion: { tipo: 'meses', valor: 1 } },
      { id: 'diario', nombre: 'Por día', monto: 15000, duracion: { tipo: 'dias', valor: 1 } },
      { id: 'personalizado', nombre: 'Personalizado', monto: 150000, duracion: null },
    ]
  },

  savePlanTipos(tipos: PlanTipoConfig[]): void {
    localStorage.setItem('barber_plan_tipos', JSON.stringify(tipos))
  },

  getTodasJornadas(): JornadaReservas[] {
    return leer<JornadaReservas>(JORNADAS_KEY)
  },

  getJornadaReservas(id: string): JornadaReservas | null {
    const list = this.getTodasJornadas()
    return list.find((j) => j.id === id) ?? null
  },

  saveJornadaReservas(jornada: JornadaReservas): void {
    const list = this.getTodasJornadas()
    const idx = list.findIndex((j) => j.id === jornada.id)
    if (idx >= 0) list[idx] = jornada
    else list.push(jornada)
    guardar(JORNADAS_KEY, list)
  },

  saveJornadaReservasMulti(jornadas: JornadaReservas[]): void {
    guardar(JORNADAS_KEY, jornadas)
  },

  deleteJornadaReservas(id: string): void {
    const list = this.getTodasJornadas().filter((j) => j.id !== id)
    guardar(JORNADAS_KEY, list)
  },

  getOpcionesCliente(): OpcionCliente[] {
    try {
      const raw = localStorage.getItem(OPCIONES_CLIENTE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as OpcionCliente[]
      }
    } catch {}
    return DEFAULT_OPCIONES_CLIENTE
  },

  saveOpcionesCliente(opciones: OpcionCliente[]): void {
    localStorage.setItem(OPCIONES_CLIENTE_KEY, JSON.stringify(opciones))
  },

  invalidarCache,
}

