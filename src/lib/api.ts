import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import { localStore } from './storage'
import type { Cliente, Cobro, JornadaReservas, OpcionCliente, Plan, PlanTipoConfig } from './types'

const C = {
  clientes: 'clientes',
  planes: 'planes',
  cobros: 'cobros',
  planTipos: 'planTipos',
  jornadas: 'jornadasReservas',
  opcionesCliente: 'opcionesCliente',
}

export const api = {
  async getClientes(): Promise<Cliente[]> {
    try {
      const q = query(collection(db, C.clientes), orderBy('creadoEn', 'desc'))
      const snap = await getDocs(q)
      const list = snap.docs.map((d) => d.data() as Cliente)
      localStore.saveClientes(list)
      return list
    } catch {
      return localStore.getClientes()
    }
  },

  async saveCliente(cliente: Cliente): Promise<void> {
    const sanitized = Object.fromEntries(
      Object.entries(cliente).filter(([_, v]) => v !== undefined),
    ) as Cliente
    localStore.saveCliente(sanitized)
    await setDoc(doc(db, C.clientes, cliente.id), sanitized)
  },

  async deleteCliente(id: string): Promise<void> {
    localStore.deleteCliente(id)
    await deleteDoc(doc(db, C.clientes, id))
  },

  async getPlanes(): Promise<Plan[]> {
    try {
      const q = query(collection(db, C.planes), orderBy('creadoEn', 'desc'))
      const snap = await getDocs(q)
      const list = snap.docs.map((d) => d.data() as Plan)
      localStore.savePlanes(list)
      return list
    } catch {
      return localStore.getPlanes()
    }
  },

  async savePlan(plan: Plan): Promise<void> {
    const sanitized = Object.fromEntries(
      Object.entries(plan).filter(([_, v]) => v !== undefined),
    ) as Plan
    localStore.savePlan(sanitized)
    await setDoc(doc(db, C.planes, plan.id), sanitized)
  },

  async deletePlan(id: string): Promise<void> {
    localStore.deletePlan(id)
    await deleteDoc(doc(db, C.planes, id))
    const q = query(collection(db, C.cobros), where('planId', '==', id))
    const snap = await getDocs(q)
    const deletes = snap.docs
      .filter((d) => (d.data() as Cobro).estado !== 'pagado')
      .map((d) => deleteDoc(doc(db, C.cobros, d.id)))
    await Promise.all(deletes)
  },

  async getCobros(): Promise<Cobro[]> {
    try {
      const q = query(collection(db, C.cobros), orderBy('creadoEn', 'desc'))
      const snap = await getDocs(q)
      const list = snap.docs.map((d) => d.data() as Cobro)
      localStore.saveCobros(list)
      return list
    } catch {
      return localStore.getCobros()
    }
  },

  async saveCobro(cobro: Cobro): Promise<void> {
    const sanitized = Object.fromEntries(
      Object.entries(cobro).filter(([_, v]) => v !== undefined),
    ) as Cobro
    localStore.saveCobro(sanitized)
    await setDoc(doc(db, C.cobros, cobro.id), sanitized)
  },

  async deleteCobro(id: string): Promise<void> {
    localStore.deleteCobro(id)
    await deleteDoc(doc(db, C.cobros, id))
  },

  async getPlanTipos(): Promise<PlanTipoConfig[]> {
    try {
      const ref = doc(db, C.planTipos, 'config')
      console.log('[getPlanTipos] Consultando Firebase...')
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const tipos = (snap.data().tipos as PlanTipoConfig[]).map((t: any) => {
          if (t.duracion !== undefined) return t as PlanTipoConfig
          if (t.id === 'personalizado') return { ...t, duracion: null }
          if (t.id === 'diario') return { ...t, duracion: { tipo: 'dias', valor: 1 } }
          return { ...t, duracion: { tipo: 'meses', valor: 1 } }
        })
        console.log('[getPlanTipos] Leído de Firebase:', tipos.length, 'tipos')
        localStore.savePlanTipos(tipos)
        return tipos
      }
      console.warn('[getPlanTipos] No existe documento en Firebase, usando local')
    } catch (e) {
      console.error('[getPlanTipos] ERROR al leer Firebase:', e)
    }
    return localStore.getPlanTipos()
  },

  async savePlanTipos(tipos: PlanTipoConfig[]): Promise<void> {
    localStore.savePlanTipos(tipos)
    const sanitized = tipos.map((t) =>
      Object.fromEntries(Object.entries(t).filter(([_, v]) => v !== undefined)),
    )
    console.log('[savePlanTipos] Guardando en Firebase:', sanitized)
    await setDoc(doc(db, C.planTipos, 'config'), { tipos: sanitized })
    console.log('[savePlanTipos] Guardado exitoso en Firebase')
  },

  async getTodasJornadas(): Promise<JornadaReservas[]> {
    const snap = await getDocs(collection(db, C.jornadas))
    const list = snap.docs.map((d) => d.data() as JornadaReservas)
    localStore.saveJornadaReservasMulti(list)
    return list
  },

  async getJornadaReservas(id: string): Promise<JornadaReservas | null> {
    const ref = doc(db, C.jornadas, id)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const j = snap.data() as JornadaReservas
      localStore.saveJornadaReservas(j)
      return j
    }
    localStore.deleteJornadaReservas(id)
    return null
  },

  /** Busca por fecha (para compatibilidad con links viejos y datos antiguos) */
  async getJornadaReservasPorFecha(fecha: string): Promise<JornadaReservas | null> {
    try {
      const q = query(collection(db, C.jornadas), where('fecha', '==', fecha))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const docs = snap.docs.map((d) => d.data() as JornadaReservas)
        docs.sort((a, b) => ((b.creadoEn ?? '') > (a.creadoEn ?? '') ? 1 : -1))
        localStore.saveJornadaReservas(docs[0])
        return docs[0]
      }
    } catch (e) {
      console.error('Error al buscar jornada por fecha:', e)
    }
    return null
  },

  /** Para vista pública y tiempo real */
  async getJornadaReservasRemota(id: string): Promise<JornadaReservas | null> {
    const ref = doc(db, C.jornadas, id)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const j = snap.data() as JornadaReservas
      localStore.saveJornadaReservas(j)
      return j
    }
    localStore.deleteJornadaReservas(id)
    return null
  },

  async saveJornadaReservas(jornada: JornadaReservas): Promise<void> {
    if (!jornada.creadoEn) {
      jornada.creadoEn = new Date().toISOString()
    }
    const sanitized = Object.fromEntries(
      Object.entries(jornada).filter(([_, v]) => v !== undefined),
    ) as JornadaReservas
    if (sanitized.slots) {
      sanitized.slots = sanitized.slots.map((s) =>
        Object.fromEntries(Object.entries(s).filter(([_, v]) => v !== undefined)),
      ) as JornadaReservas['slots']
    }
    await setDoc(doc(db, C.jornadas, jornada.id), sanitized)
    localStore.saveJornadaReservas(sanitized)
  },

  async deleteJornadaReservas(id: string): Promise<void> {
    await deleteDoc(doc(db, C.jornadas, id))
    localStore.deleteJornadaReservas(id)
  },

  async getOpcionesCliente(): Promise<OpcionCliente[]> {
    try {
      const ref = doc(db, C.opcionesCliente, 'config')
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const opciones = snap.data().opciones as OpcionCliente[]
        localStore.saveOpcionesCliente(opciones)
        return opciones
      }
    } catch {}
    return localStore.getOpcionesCliente()
  },

  async getOpcionesClienteRemota(): Promise<OpcionCliente[]> {
    try {
      const ref = doc(db, C.opcionesCliente, 'config')
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const opciones = snap.data().opciones as OpcionCliente[]
        localStore.saveOpcionesCliente(opciones)
        return opciones
      }
    } catch {}
    return localStore.getOpcionesCliente()
  },

  async saveOpcionesCliente(opciones: OpcionCliente[]): Promise<void> {
    const sanitized = opciones.map((o) =>
      Object.fromEntries(Object.entries(o).filter(([_, v]) => v !== undefined)),
    )
    localStore.saveOpcionesCliente(sanitized as OpcionCliente[])
    try {
      await setDoc(doc(db, C.opcionesCliente, 'config'), { opciones: sanitized })
    } catch (e) {
      console.error('Error guardando opciones del cliente en Firebase:', e)
    }
  },
}
