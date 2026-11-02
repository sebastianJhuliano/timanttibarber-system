import { Check, Clock, DollarSign, MessageCircle, Pencil, Trash2 } from 'lucide-react'
import { memo } from 'react'
import type { PlanConCliente, PlanTipoConfig } from '../lib/types'
import {
  diasRestantes,
  etiquetaTipoPlan,
  formatearFechaCorta,
  formatearMoneda,
  planEstaActivo,
  planPorVencer,
  planSinDuracion,
  planVenceHoy,
  planVencido,
} from '../lib/dates'
import { whatsappUrl, mensajePlanPorVencer } from '../lib/whatsapp'
import { Badge } from './ui/Badge'

interface PlanCardProps {
  plan: PlanConCliente
  showWhatsapp?: boolean
  cobrado?: boolean
  tiposConfig?: PlanTipoConfig[]
  onEdit?: () => void
  onDelete?: () => void
  onCobrar?: () => void
}

export const PlanCard = memo(function PlanCard({ plan, showWhatsapp = false, cobrado = false, tiposConfig, onEdit, onDelete, onCobrar }: PlanCardProps) {
  const tipoConfig = tiposConfig?.find((t) => t.id === plan.tipo)
  const tipoNombre = tipoConfig?.nombre ?? etiquetaTipoPlan(plan.tipo)
  const sinDuracion = tipoConfig !== undefined ? tipoConfig.duracion === null : planSinDuracion(plan)
  const activo = planEstaActivo(plan)
  const venceHoy = planVenceHoy(plan)
  const porVencer = planPorVencer(plan)
  const vencido = planVencido(plan)

  let badge: { variant: 'success' | 'warning' | 'danger' | 'neutral'; text: string } = {
    variant: 'neutral',
    text: 'Inactivo',
  }

  if (sinDuracion) {
    badge = cobrado
      ? { variant: 'success', text: 'Pagado' }
      : { variant: 'warning', text: 'Facturación pendiente' }
  } else if (!cobrado) {
    badge = { variant: 'warning', text: 'Facturación pendiente' }
  } else if (activo && venceHoy) {
    badge = { variant: 'warning', text: 'Vence hoy' }
  } else if (activo && porVencer) {
    badge = { variant: 'warning', text: `Vence en ${diasRestantes(plan)}d` }
  } else if (activo) {
    badge = { variant: 'success', text: 'Pagado' }
  } else if (vencido) {
    badge = { variant: 'danger', text: 'Vencido' }
  }

  const nombre = plan.cliente
    ? `${plan.cliente.nombre} ${plan.cliente.apellido}`
    : 'Cliente desconocido'

  const puedeWhatsapp =
    showWhatsapp &&
    !sinDuracion &&
    plan.cliente?.telefono &&
    activo &&
    (venceHoy || porVencer)

  return (
    <div className="list-item rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">{nombre}</h3>
          <p className="truncate text-xs text-slate-400">{tipoNombre}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {cobrado ? (
            <span className="rounded-lg p-1 text-emerald-400" title="Pagado">
              <Check size={14} />
            </span>
          ) : onCobrar && (
            <button
              type="button"
              onClick={onCobrar}
              className="rounded-lg p-1 text-barber-400 hover:bg-barber-500/20"
              title="Cobrar"
            >
              <DollarSign size={14} />
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 size={14} />
            </button>
          )}
          <Badge variant={badge.variant}>{badge.text}</Badge>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        {!sinDuracion && (
          <span>
            {plan.fechaInicio === plan.fechaFin
              ? formatearFechaCorta(plan.fechaInicio)
              : `${formatearFechaCorta(plan.fechaInicio)} → ${formatearFechaCorta(plan.fechaFin)}`}
          </span>
        )}
        {(
          <span className="inline-flex items-center gap-1 text-barber-400">
            <DollarSign size={12} />
            {formatearMoneda(plan.monto)}
          </span>
        )}
        {(() => {
          const c = plan.cantidad ?? (plan as any).horas
          return plan.hora ? (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Clock size={12} />
              {plan.hora}{c ? ` · ${c}h` : ''}
            </span>
          ) : c ? (
            <span className="text-slate-500">
              {c} {(tiposConfig?.find(t => t.id === plan.tipo)?.duracion?.tipo === 'meses' ? 'mes' : 'día')}{c > 1 ? 's' : ''}
            </span>
          ) : null
        })()}
      </div>

      {puedeWhatsapp && plan.cliente && (
        <a
          href={whatsappUrl(plan.cliente.telefono, mensajePlanPorVencer(plan.cliente, plan))}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 block"
        >
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/50 px-2 py-1 text-xs text-barber-400 hover:bg-slate-800"
          >
            <MessageCircle size={12} /> Avisar por WhatsApp
          </button>
        </a>
      )}
    </div>
  )
})
