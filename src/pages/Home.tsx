import { AlertTriangle, CalendarCheck, DollarSign, MessageCircle, Users } from 'lucide-react'
import { memo, useMemo } from 'react'
import { InstallPWA } from '../components/InstallPWA'
import { Layout } from '../components/Layout'
import { Pagination } from '../components/ui/Pagination'
import { useBarberData } from '../hooks/useBarberData'
import { usePagination } from '../hooks/usePagination'
import { cobrosPendientes, ingresosDelMes } from '../lib/cobros'
import {
  diasRestantes,
  etiquetaTipoPlan,
  formatearMoneda,
  formatearNumeroCompacto,
  planEstaActivo,
  planPorVencer,
  planVenceHoy,
} from '../lib/dates'
import { whatsappUrl, mensajePlanPorVencer } from '../lib/whatsapp'
import type { CobroConCliente, PlanConCliente } from '../lib/types'

export function Home() {
  const { clientes, planes, cobros, planTipos, loading } = useBarberData()
  const mesActual = new Date().toISOString().slice(0, 7)

  const saldoPendienteTotal = useMemo(() => {
    return cobros
      .filter((c) => c.estado === 'pendiente')
      .reduce((sum, c) => sum + (c.monto || 0), 0)
  }, [cobros])

  const planesConCliente = useMemo<PlanConCliente[]>(
    () =>
      planes.map((p) => ({
        ...p,
        cliente: clientes.find((c) => c.id === p.clienteId),
      })),
    [planes, clientes],
  )

  const esPlanMensual = (p: PlanConCliente) => {
    const tipoConfig = planTipos.find((t) => t.id === p.tipo)
    if (tipoConfig !== undefined) {
      return tipoConfig.duracion !== null
    }
    return true
  }

  const activos = planesConCliente.filter((p) => esPlanMensual(p) && planEstaActivo(p))
  const porVencer = planesConCliente.filter((p) => {
    if (!esPlanMensual(p)) return false
    return planEstaActivo(p) && (planVenceHoy(p) || planPorVencer(p, 3))
  })
  const ingresos = ingresosDelMes(cobros, mesActual)

  const pendientes = useMemo<CobroConCliente[]>(() => {
    return cobrosPendientes(cobros).map((c) => ({
      ...c,
      cliente: clientes.find((cl) => cl.id === c.clienteId),
      plan: planes.find((p) => p.id === c.planId),
    }))
  }, [cobros, clientes, planes])

  const pagPorVencer = usePagination(porVencer, 20)
  const pagPendientes = usePagination(pendientes, 20)
  const pagActivos = usePagination(activos, 20)

  if (loading) {
    return (
      <Layout title="Inicio">
        <p className="text-center text-slate-400">Cargando...</p>
      </Layout>
    )
  }

  return (
    <Layout title="Inicio">
      <InstallPWA />

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard icon={Users} label="Clientes" value={clientes.length} />
        <StatCard icon={CalendarCheck} label="Activos" value={activos.length} />
        <StatCard
          icon={AlertTriangle}
          label="Por vencer"
          value={porVencer.length}
          highlight={porVencer.length > 0}
        />
        <StatCard
          icon={DollarSign}
          label="Cobros pend."
          value={pendientes.length}
          highlight={pendientes.length > 0}
        />
      </div>

      <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="shrink-0 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Ingresos cobrados del mes
            </span>
          </div>
          <span className="text-base font-bold text-emerald-400">
            {formatearNumeroCompacto(ingresos)} Gs
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="shrink-0 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
              Saldo pendiente por cobrar
            </span>
          </div>
          <span className="text-base font-bold text-amber-400">
            {formatearMoneda(saldoPendienteTotal)} Gs
          </span>
        </div>
      </div>

      <section className="mb-3">
        <Heading title="Por vencer" count={porVencer.length} />
        {porVencer.length === 0 ? (
          <p className="text-sm text-slate-500">No hay planes por vencer pronto</p>
        ) : (
          <div className="space-y-1">
            {pagPorVencer.paginated.map((p) => (
              <CompactPlanRow key={p.id} plan={p} showWhatsapp />
            ))}
            <Pagination {...pagPorVencer} onPageChange={pagPorVencer.setPage} />
          </div>
        )}
      </section>

      <section className="mb-3">
        <Heading title="Cobros pendientes" count={pendientes.length} />
        {pendientes.length === 0 ? (
          <p className="text-sm text-slate-500">Sin cobros pendientes</p>
        ) : (
          <div className="space-y-1">
            {pagPendientes.paginated.map((c) => (
              <div
                key={c.id}
                className="list-item flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-white">
                  {c.cliente?.nombre} {c.cliente?.apellido}
                </span>
                <span className="shrink-0 text-sm font-semibold text-amber-300">
                  {formatearNumeroCompacto(c.monto)} Gs
                </span>
              </div>
            ))}
            <Pagination {...pagPendientes} onPageChange={pagPendientes.setPage} />
          </div>
        )}
      </section>

      <section className="mb-3">
        <Heading title="Planes activos" count={activos.length} />
        {activos.length === 0 ? (
          <p className="text-sm text-slate-500">No hay planes activos</p>
        ) : (
          <div className="space-y-1">
            {pagActivos.paginated.map((p) => (
              <CompactPlanRow key={p.id} plan={p} />
            ))}
            <Pagination {...pagActivos} onPageChange={pagActivos.setPage} />
          </div>
        )}
      </section>

    </Layout>
  )
}

const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Users
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-2 py-2 text-center ${
        highlight ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-900'
      }`}
    >
      <Icon
        size={18}
        className={`mx-auto mb-0.5 ${highlight ? 'text-amber-400' : 'text-barber-500'}`}
      />
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  )
})

const Heading = memo(function Heading({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {count > 0 && (
        <span className="rounded-full bg-barber-500/20 px-1.5 text-[10px] text-barber-400">{count}</span>
      )}
    </div>
  )
})

const CompactPlanRow = memo(function CompactPlanRow({
  plan,
  showWhatsapp,
  hideAmount,
  className = '',
}: {
  plan: PlanConCliente
  showWhatsapp?: boolean
  hideAmount?: boolean
  className?: string
}) {
  const activo = planEstaActivo(plan)
  const venceHoy = planVenceHoy(plan)
  const porVencer = planPorVencer(plan)

  let badge = ''
  if (activo && venceHoy) badge = 'Vence hoy'
  else if (activo && porVencer) badge = `${diasRestantes(plan)}d`
  else if (!activo) badge = 'Vencido'

  const puedeWhatsapp =
    showWhatsapp &&
    plan.cliente?.telefono &&
    activo &&
    (venceHoy || porVencer)

  return (
    <div className={`list-item flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 ${className}`.trimEnd()}>
      <span className="min-w-0 flex-1 truncate text-sm text-white">
        {plan.cliente?.nombre} {plan.cliente?.apellido}
      </span>
      {!hideAmount && (
        <span className="shrink-0 text-xs font-medium text-barber-400">
          {formatearNumeroCompacto(plan.monto)}
        </span>
      )}
      <span className="shrink-0 text-[10px] uppercase text-slate-500">
        {etiquetaTipoPlan(plan.tipo)}
      </span>
      {badge && (
        <span className="shrink-0 text-[10px] font-medium text-amber-400">{badge}</span>
      )}
      {puedeWhatsapp && plan.cliente && (
        <a
          href={whatsappUrl(plan.cliente.telefono, mensajePlanPorVencer(plan.cliente, plan))}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded p-1 text-barber-400 hover:bg-barber-500/20"
          title="Avisar por WhatsApp"
        >
          <MessageCircle size={14} />
        </a>
      )}
    </div>
  )
})
