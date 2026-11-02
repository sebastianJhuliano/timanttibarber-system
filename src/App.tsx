import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { BarberProvider } from './context/BarberContext'
import { Asistencia } from './pages/Asistencia'
import { Home } from './pages/Home'
import { Personas } from './pages/Personas'
import { Planes } from './pages/Planes'
import { Reportes } from './pages/Reportes'

const ReservaPublica = lazy(() => import('./pages/ReservaPublica'))

export default function App() {
  return (
    <BarberProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/asistencia" element={<Asistencia />} />
        <Route path="/personas" element={<Personas />} />
        <Route path="/planes" element={<Planes />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/reservas" element={
          <Suspense fallback={
            <div className="flex min-h-dvh items-center justify-center bg-slate-950">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-barber-500 border-t-transparent" />
            </div>
          }>
            <ReservaPublica />
          </Suspense>
        } />
      </Routes>
    </BarberProvider>
  )
}

