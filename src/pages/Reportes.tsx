import { DollarSign, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Layout } from '../components/Layout'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { useBarberData } from '../hooks/useBarberData'
import { cobroCuentaEnIngresos } from '../lib/cobros'
import {
  etiquetaTipoPlan,
  formatearFechaCorta,
  formatearMoneda,
  hoyISO,
} from '../lib/dates'
import type { CobroConCliente } from '../lib/types'

type FiltroFecha = 'dia' | 'rango' | 'mes'

export function Reportes() {
  const { clientes, planes, cobros, loading } = useBarberData()
  const [filtro, setFiltro] = useState<FiltroFecha>('mes')
  const [dia, setDia] = useState(hoyISO())
  const [rangoInicio, setRangoInicio] = useState(hoyISO())
  const [rangoFin, setRangoFin] = useState(hoyISO())
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))

  const filtrarFecha = (fecha: string): boolean => {
    if (filtro === 'dia') return fecha === dia
    if (filtro === 'rango') return fecha >= rangoInicio && fecha <= rangoFin
    return fecha.startsWith(mes)
  }

  const historialCobros = useMemo<CobroConCliente[]>(() => {
    return cobros
      .filter((c) => {
        const f = c.estado === 'pagado' && c.pagadoEn ? c.pagadoEn.slice(0, 10) : c.fecha
        return filtrarFecha(f)
      })
      .map((c) => ({
        ...c,
        cliente: clientes.find((cl) => cl.id === c.clienteId),
        plan: planes.find((p) => p.id === c.planId),
      }))
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
  }, [cobros, clientes, planes, filtro, dia, rangoInicio, rangoFin, mes])

  const totalCobrado = historialCobros
    .filter((c) => cobroCuentaEnIngresos(c))
    .reduce((s, c) => {
      if (c.tipo === 'egreso') return s - c.monto
      return s + c.monto
    }, 0)
  const pendientesFiltro = historialCobros.filter((c) => c.estado === 'pendiente').length


  const exportarExcel = () => {
    const fechaStr = new Date().toISOString().slice(0, 10)
    const data: (string | number)[][] = historialCobros.map((c) => [
      `${c.cliente?.nombre ?? ''} ${c.cliente?.apellido ?? ''}`.trim() || '—',
      c.plan ? etiquetaTipoPlan(c.plan.tipo) : (c.tipo === 'ingreso' ? 'Ingreso manual' : c.tipo === 'egreso' ? 'Egreso manual' : '—'),
      c.tipo === 'egreso' ? -c.monto : c.monto,
    ])
    const total = historialCobros.reduce((s, c) => s + (c.tipo === 'egreso' ? -c.monto : c.monto), 0)
    data.push(['', 'TOTAL', total])
    const ws = XLSX.utils.aoa_to_sheet([['Cliente', 'Plan', 'Monto'], ...data])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cobros')
    XLSX.writeFile(wb, `cobros_${fechaStr}.xlsx`)
  }

  return (
    <Layout title="Reportes">
      <div className="mb-2 flex gap-1">
        {(['dia', 'rango', 'mes'] as FiltroFecha[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`flex-1 rounded-lg py-1 text-xs font-medium capitalize ${
              filtro === f ? 'bg-barber-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {f === 'dia' ? 'Día' : f === 'rango' ? 'Rango' : 'Mes'}
          </button>
        ))}
        <button
          type="button"
          onClick={exportarExcel}
          className="flex items-center gap-1 rounded-lg bg-barber-600 px-2.5 py-1 text-xs text-white hover:bg-barber-500"
          title="Exportar a Excel"
        >
          <Download size={14} />
        </button>
      </div>

      <div className="mb-2">
        {filtro === 'dia' ? (
          <input
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-barber-500 focus:outline-none"
          />
        ) : filtro === 'rango' ? (
          <div className="flex gap-2">
            <input
              type="date"
              value={rangoInicio}
              onChange={(e) => setRangoInicio(e.target.value)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-barber-500 focus:outline-none"
            />
            <span className="self-center text-xs text-slate-500">→</span>
            <input
              type="date"
              value={rangoFin}
              onChange={(e) => setRangoFin(e.target.value)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-barber-500 focus:outline-none"
            />
          </div>
        ) : (
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-barber-500 focus:outline-none"
          />
        )}
      </div>

      <div className="mb-2 flex gap-2">
        <MiniStat
          label="Cobrado"
          value={formatearMoneda(totalCobrado)}
        />
        <MiniStat label="Pendientes" value={String(pendientesFiltro)} />
      </div>

      {loading ? (
        <p className="text-center text-slate-400">Cargando...</p>
      ) : historialCobros.length === 0 ? (
        <EmptyState icon={DollarSign} title="Sin cobros" description="No hay registros en este período" />
      ) : (
        <>
          <ul className="space-y-1">
            {historialCobros.map((c) => (
              <li
                key={c.id}
                className="list-item flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">
                    {c.tipo === 'ingreso' || c.tipo === 'egreso'
                      ? c.descripcion || (c.tipo === 'ingreso' ? 'Ingreso manual' : 'Egreso manual')
                      : `${c.cliente?.nombre ?? '—'} ${c.cliente?.apellido ?? ''}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.plan ? etiquetaTipoPlan(c.plan.tipo) : (c.tipo === 'ingreso' ? 'Ingreso manual' : c.tipo === 'egreso' ? 'Egreso manual' : '—')}
                    {' · '}{formatearFechaCorta(c.fecha)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={c.estado === 'pagado' ? 'success' : c.estado === 'anulado' ? 'danger' : 'warning'}>
                    {c.estado === 'pagado' ? 'Pagado' : c.estado === 'anulado' ? 'Anulado' : 'Pendiente'}
                  </Badge>
                  {cobroCuentaEnIngresos(c) ? (
                    <span className={`text-sm font-semibold ${c.tipo === 'egreso' ? 'text-red-400' : 'text-barber-400'}`}>
                      {c.tipo === 'egreso' ? '- ' : ''}{formatearMoneda(c.monto)}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-600">—</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between rounded-lg border border-barber-500/20 bg-barber-500/5 px-3 py-2">
            <span className="text-sm font-bold text-white">TOTAL</span>
            <span className="text-sm font-bold text-barber-400">
              {formatearMoneda(historialCobros.reduce((s, c) => s + (c.tipo === 'egreso' ? -c.monto : c.monto), 0))} Gs
            </span>
          </div>
        </>
      )}
    </Layout>
  )
}

function MiniStat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-center ${wide ? 'flex-1' : 'flex-1'}`}
    >
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  )
}
