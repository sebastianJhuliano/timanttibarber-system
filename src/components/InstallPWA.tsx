import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa_dismissed') === '1',
  )
  const [esYaApp, setEsYaApp] = useState(false)
  const [esIOS, setEsIOS] = useState(false)
  const [mostrandoInstrucciones, setMostrandoInstrucciones] = useState(false)

  useEffect(() => {
    const esStandalone = window.matchMedia('(display-mode: standalone)').matches
    const esIOSStandalone = (window.navigator as any).standalone === true
    setEsYaApp(esStandalone || esIOSStandalone)
    setEsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) || esIOSStandalone)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (esYaApp) return null

  const instalable = !!deferred

  const instalar = async () => {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setDeferred(null)
    } else {
      setMostrandoInstrucciones(!mostrandoInstrucciones)
    }
  }

  const cerrar = () => {
    localStorage.setItem('pwa_dismissed', '1')
    setDismissed(true)
  }

  if (dismissed && !mostrandoInstrucciones) {
    return (
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="flex items-center gap-1.5 rounded-lg border border-barber-500/30 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-barber-400 hover:bg-barber-500/10"
        >
          <Smartphone size={14} /> Instalar como App
        </button>
      </div>
    )
  }

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-barber-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-barber-950/40 p-3.5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-barber-500/20 text-barber-400 border border-barber-500/30">
          <Smartphone size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Instalar Timantti Barber App
          </h3>
          <p className="text-[11px] text-slate-300 mt-0.5">
            {instalable
              ? 'Instalá la app en tu celular para acceder con un toque desde la pantalla de inicio.'
              : esIOS
                ? 'Agregá el acceso directo desde Safari (Compartir → Agregar a inicio).'
                : 'Instalá la app en tu dispositivo para uso rápido e independiente.'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={instalar}
            className="flex items-center gap-1 rounded-xl bg-barber-500 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-barber-400 active:scale-95 transition-transform"
          >
            <Download size={14} />
            {instalable ? 'Instalar' : 'Instrucciones'}
          </button>
          <button
            type="button"
            onClick={cerrar}
            className="rounded-lg p-1 text-slate-500 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {mostrandoInstrucciones && (
        <div className="mt-3 border-t border-slate-800 pt-2.5 text-xs text-slate-300 space-y-1.5 bg-slate-950/50 p-2.5 rounded-xl">
          {esIOS ? (
            <>
              <p className="font-semibold text-barber-400 flex items-center gap-1">
                <CheckCircle2 size={14} /> Cómo instalar en iPhone / iPad (Safari):
              </p>
              <ol className="list-decimal list-inside text-[11px] space-y-1 text-slate-400">
                <li>Tocá el botón <strong>Compartir</strong> (icono de cuadrado con flecha arriba).</li>
                <li>Desplazate hacia abajo y seleccioná <strong>"Agregar a pantalla de inicio"</strong>.</li>
                <li>Tocá <strong>Agregar</strong> arriba a la derecha.</li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-semibold text-barber-400 flex items-center gap-1">
                <CheckCircle2 size={14} /> Cómo instalar en Android / Chrome:
              </p>
              <ol className="list-decimal list-inside text-[11px] space-y-1 text-slate-400">
                <li>Tocá el menú de Chrome (los 3 puntos ⋮ arriba a la derecha).</li>
                <li>Seleccioná <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</li>
                <li>Confirmá la instalación.</li>
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  )
}

