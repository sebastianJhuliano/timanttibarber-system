import { useState } from 'react'
import type { Cliente } from '../lib/types'
import { formatTelefono } from '../lib/whatsapp'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

interface ClienteFormProps {
  initial?: Cliente
  onSubmit: (data: Omit<Cliente, 'id' | 'creadoEn'> & { id?: string; creadoEn?: string }) => void
  onCancel: () => void
}

export function ClienteForm({ initial, onSubmit, onCancel }: ClienteFormProps) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [apellido, setApellido] = useState(initial?.apellido ?? '')
  const [telefono, setTelefono] = useState(initial?.telefono ? formatTelefono(initial.telefono) : '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !apellido.trim()) return
    if (submitting) return // prevent double click
    onSubmit({
      id: initial?.id,
      creadoEn: initial?.creadoEn,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim(),
    })
    setSubmitting(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej. Juan"
        required
        autoFocus
      />
      <Input
        label="Apellido"
        value={apellido}
        onChange={(e) => setApellido(e.target.value)}
        placeholder="Ej. Pérez"
        required
      />
      <Input
        label="Celular (opcional)"
        type="tel"
        value={telefono}
        onChange={(e) => setTelefono(formatTelefono(e.target.value))}
        placeholder="Ej. 0982 362 830"
      />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={submitting}>
          {initial ? 'Guardar' : 'Registrar'}
        </Button>
      </div>
    </form>
  )
}
