import { CalendarDays, ClipboardList, CreditCard, Home, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/asistencia', icon: CreditCard, label: 'Cobro' },
  { to: '/personas', icon: Users, label: 'Personas' },
  { to: '/planes', icon: CalendarDays, label: 'Planes' },
  { to: '/reportes', icon: ClipboardList, label: 'Reportes' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-barber-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <Icon size={20} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
