export type TipoPlan = string

export interface PlanTipoConfig {
  id: string
  nombre: string
  monto: number
  duracion: { tipo: 'meses' | 'dias'; valor: number } | null
  fechaInicioDefault?: string
  fechaFinDefault?: string
}


export type EstadoCobro = 'pendiente' | 'pagado' | 'anulado'
export type TipoMovimiento = 'plan' | 'ingreso' | 'egreso'

export interface Cliente {
  id: string
  nombre: string
  apellido: string
  telefono: string
  cedula?: string
  notas?: string
  creadoEn: string
}

export interface Plan {
  id: string
  clienteId: string
  tipo: TipoPlan
  fechaInicio: string
  fechaFin: string
  monto: number
  hora?: string
  cantidad?: number
  notas?: string
  creadoEn: string
}


export interface Cobro {
  id: string
  clienteId: string
  planId: string
  fecha: string
  monto: number
  montoPlan: number
  estado: EstadoCobro
  tipo?: TipoMovimiento
  descripcion?: string
  pagadoEn?: string
  creadoEn: string
}

export interface PlanConCliente extends Plan {
  cliente?: Cliente
}


export interface CobroConCliente extends Cobro {
  cliente?: Cliente
  plan?: Plan
}

export type EstadoSlot = 'disponible' | 'reservado' | 'bloqueado'

export interface OpcionCliente {
  id: string
  nombre: string
  precio: number
}

export interface TurnoSlot {
  id: string
  horaInicio: string
  horaFin: string
  estado: EstadoSlot
  clienteNombre?: string
  clienteTelefono?: string
  opcionNombre?: string
  opcionPrecio?: number
  notas?: string
  cobroId?: string
}

export interface JornadaReservas {
  id: string // UUID único
  fecha: string // yyyy-MM-dd
  horaInicio: string // ej: "12:00"
  horaFin: string // ej: "22:00"
  intervaloMinutos: number // ej: 60
  permitirReservaPublica: boolean
  whatsappBarbero?: string // ej: "0971 138195"
  mensajeWhatsapp?: string // ej: "Reservado para las {hora}"
  slots: TurnoSlot[]
  creadoEn?: string
  configurado?: boolean // true después de "Aplicar / Generar horario"
  whatsappConfigurado?: boolean // true después de "Guardar configuración WhatsApp"
}

