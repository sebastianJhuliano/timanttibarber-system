import { MessageCircle, Pencil, Plus, Trash2, User } from 'lucide-react'
import { memo, useDeferredValue, useMemo, useState } from 'react'
import { ClienteForm } from '../components/ClienteForm'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { useBarberData } from '../hooks/useBarberData'
import { SearchInput } from '../components/ui/SearchInput'
import { planEstaActivo } from '../lib/dates'
import { whatsappUrl } from '../lib/whatsapp'
import type { Cliente, Plan } from '../lib/types'

function PersonaItem({
  c,
  planes,
  onEdit,
  onDelete,
}: {
  c: Cliente
  planes: Plan[]
  onEdit: (c: Cliente) => void
  onDelete: (id: string) => void
}) {
  const planActivo = planes.find((p) => p.clienteId === c.id && planEstaActivo(p))
  return (
    <li className="list-item flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-barber-500/20 text-barber-400 mt-0.5">
        <User size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-white">{c.nombre} {c.apellido}</h3>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onEdit(c)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Editar cliente"
            >
              <Pencil size={14} />
            </button>
            {c.telefono && (
              <a
                href={whatsappUrl(c.telefono, '')}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1 text-slate-400 hover:bg-barber-500/20 hover:text-barber-400"
                title="Enviar WhatsApp"
              >
                <MessageCircle size={14} />
              </a>
            )}
            <button
              type="button"
              onClick={() => onDelete(c.id)}
              className="rounded-lg p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
              title="Eliminar cliente"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <p className="truncate text-xs text-slate-400 mt-0.5">
          {c.telefono}
        </p>
        {planActivo && <p className="text-[10px] text-barber-400 mt-0.5">Plan activo</p>}
      </div>
    </li>
  )
}

const PersonaItemMemo = memo(PersonaItem)

export function Personas() {
  const { clientes, planes, loading, saveCliente, deleteCliente } = useBarberData()
  const [busqueda, setBusqueda] = useState('')
  const busquedaDiferida = useDeferredValue(busqueda)
  const [orden, setOrden] = useState<'fecha' | 'alfabetico'>('fecha')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)

  const filtrados = useMemo(() => {
    const q = busquedaDiferida.toLowerCase().trim()
    let lista = clientes
    if (q) {
      lista = clientes.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.apellido.toLowerCase().includes(q) ||
          c.telefono.includes(q),
      )
    }
    if (orden === 'alfabetico') {
      return [...lista].sort((a, b) => {
        const nombreA = `${a.nombre} ${a.apellido}`.toLowerCase()
        const nombreB = `${b.nombre} ${b.apellido}`.toLowerCase()
        return nombreA.localeCompare(nombreB)
      })
    }
    return lista
  }, [clientes, busquedaDiferida, orden])


  const guardar = async (
    data: Omit<Cliente, 'id' | 'creadoEn'> & { id?: string; creadoEn?: string },
  ) => {
    // Cerrar la ventana de inmediato para retroalimentación instantánea
    setModalOpen(false)
    setEditando(null)

    const cliente: Cliente = {
      id: data.id ?? crypto.randomUUID(),
      creadoEn: data.creadoEn ?? new Date().toISOString(),
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      cedula: data.cedula,
      notas: data.notas,
    }
    await saveCliente(cliente)
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este cliente? Sus cobros se conservan en el historial.')) return
    await deleteCliente(id)
  }

  return (
    <Layout
      title="Personas"
      action={
        <Button size="sm" onClick={() => { setEditando(null); setModalOpen(true) }}>
          <Plus size={18} className="inline" /> Nuevo
        </Button>
      }
    >
      <div className="mb-4 space-y-2">
        <SearchInput
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por nombre o celular..."
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setOrden('fecha')}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${orden === 'fecha' ? 'bg-barber-500 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            Últimos
          </button>
          <button
            type="button"
            onClick={() => setOrden('alfabetico')}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${orden === 'alfabetico' ? 'bg-barber-500 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            A-Z
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-400">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={User}
          title="Sin clientes"
          description="Registra tu primer cliente con el botón Nuevo"
        />
      ) : (
        <ul className="space-y-1.5">
          {filtrados.map((c) => (
            <PersonaItemMemo
              key={c.id}
              c={c}
              planes={planes}
              onEdit={(cl) => { setEditando(cl); setModalOpen(true) }}
              onDelete={(id) => eliminar(id)}
            />
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null) }}
        title={editando ? 'Editar cliente' : 'Nuevo cliente'}
      >
        <ClienteForm
          initial={editando ?? undefined}
          onSubmit={guardar}
          onCancel={() => { setModalOpen(false); setEditando(null) }}
        />
      </Modal>
    </Layout>
  )
}
