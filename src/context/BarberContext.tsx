import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { Cliente, Cobro, OpcionCliente, Plan, PlanTipoConfig } from '../lib/types'

export interface BarberContextType {
  clientes: Cliente[]
  planes: Plan[]
  cobros: Cobro[]
  planTipos: PlanTipoConfig[]
  opcionesCliente: OpcionCliente[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  saveCliente: (cliente: Cliente) => Promise<void>
  deleteCliente: (id: string) => Promise<void>
  savePlan: (plan: Plan) => Promise<void>
  deletePlan: (id: string) => Promise<void>
  saveCobro: (cobro: Cobro) => Promise<void>
  deleteCobro: (id: string) => Promise<void>
  savePlanTipos: (tipos: PlanTipoConfig[]) => Promise<void>
  saveOpcionesCliente: (opciones: OpcionCliente[]) => Promise<void>
}

const BarberContext = createContext<BarberContextType | null>(null)

export function BarberProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [planes, setPlanes] = useState<Plan[]>([])
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [planTipos, setPlanTipos] = useState<PlanTipoConfig[]>([])
  const [opcionesCliente, setOpcionesCliente] = useState<OpcionCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [c, p, co, pt, oc] = await Promise.all([
        api.getClientes(),
        api.getPlanes(),
        api.getCobros(),
        api.getPlanTipos(),
        api.getOpcionesCliente(),
      ])
      setClientes([...c])
      setPlanes([...p])
      setCobros([...co])
      setPlanTipos([...pt])
      setOpcionesCliente([...oc])
    } catch (e) {
      console.error('[BarberContext] Error al cargar datos:', e)
      setError('No se pudieron cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveCliente = useCallback(async (cliente: Cliente) => {
    // Actualizar la lista en pantalla al instante (optimista)
    setClientes((prev) => {
      const idx = prev.findIndex((c) => c.id === cliente.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = cliente
        return next
      }
      return [cliente, ...prev]
    })
    // Guardar en almacenamiento/Firebase en segundo plano
    await api.saveCliente(cliente)
  }, [])

  const deleteCliente = useCallback(async (id: string) => {
    await api.deleteCliente(id)
    setClientes((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const savePlan = useCallback(async (plan: Plan) => {
    await api.savePlan(plan)
    setPlanes((prev) => {
      const idx = prev.findIndex((p) => p.id === plan.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = plan
        return next
      }
      return [plan, ...prev]
    })
  }, [])

  const deletePlan = useCallback(async (id: string) => {
    await api.deletePlan(id)
    setPlanes((prev) => prev.filter((p) => p.id !== id))
    setCobros((prev) => prev.filter((c) => c.planId !== id || c.estado === 'pagado'))
  }, [])

  const saveCobro = useCallback(async (cobro: Cobro) => {
    await api.saveCobro(cobro)
    setCobros((prev) => {
      const idx = prev.findIndex((c) => c.id === cobro.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = cobro
        return next
      }
      return [cobro, ...prev]
    })
  }, [])

  const deleteCobro = useCallback(async (id: string) => {
    await api.deleteCobro(id)
    setCobros((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const savePlanTipos = useCallback(async (tipos: PlanTipoConfig[]) => {
    setPlanTipos(tipos)
    try {
      await api.savePlanTipos(tipos)
      console.log('[savePlanTipos] Guardado OK en Firebase:', tipos.length, 'tipos')
    } catch (e) {
      console.error('[savePlanTipos] ERROR al guardar en Firebase:', e)
      alert('Error al guardar tipo de plan: ' + (e instanceof Error ? e.message : String(e)))
    }
  }, [])

  const saveOpcionesCliente = useCallback(async (opciones: OpcionCliente[]) => {
    await api.saveOpcionesCliente(opciones)
    setOpcionesCliente(opciones)
  }, [])

  return (
    <BarberContext.Provider
      value={{
        clientes,
        planes,
        cobros,
        planTipos,
        opcionesCliente,
        loading,
        error,
        refresh,
        saveCliente,
        deleteCliente,
        savePlan,
        deletePlan,
        saveCobro,
        deleteCobro,
        savePlanTipos,
        saveOpcionesCliente,
      }}
    >
      {children}
    </BarberContext.Provider>
  )
}

export function useBarberContext(): BarberContextType {
  const ctx = useContext(BarberContext)
  if (!ctx) {
    throw new Error('useBarberContext debe ser usado dentro de un BarberProvider')
  }
  return ctx
}
