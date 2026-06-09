import React, { useState, useEffect } from 'react'

export default function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      const dismissed = localStorage.getItem('installBannerDismissed')
      if (!dismissed) {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // iOS Safari detection (manual install guidance)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone = window.navigator.standalone === true
    if (isIOS && !isStandalone) {
      const dismissed = localStorage.getItem('iosInstallDismissed')
      if (!dismissed) {
        setShowBanner(true)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem('installBannerDismissed', 'true')
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('installBannerDismissed', 'true')
  }

  if (!showBanner) return null

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <div className="fixed inset-x-0 top-0 z-50 p-2 sm:p-4">
      <div className="max-w-2xl mx-auto glass-card p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 to-emerald-500/15 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="text-xl sm:text-2xl flex-shrink-0 mt-0.5">📱</div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white/95">Install Rural Health Triage</h3>
              <p className="mt-1 text-xs sm:text-sm text-white/70 leading-snug">
                {isIOS ? (
                  <>Tap <span className="font-medium text-white/80">Share</span> then <span className="font-medium text-white/80">Add to Home Screen</span> for offline access</>
                ) : (
                  <>Get instant offline access and home screen shortcut. Install now for faster access.</>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-white/20 text-white/70 hover:text-white/90 transition"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg bg-cyan-500/80 hover:bg-cyan-400 text-white font-medium transition"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
