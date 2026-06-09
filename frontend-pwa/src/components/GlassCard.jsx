import React from 'react'

export default function GlassCard({ title = 'Total Devices', value = '210', description = 'Active edge sensors online', icon = '📡' }) {
  return (
    <div className="w-full sm:max-w-sm p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 hover:bg-white/15">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.24)] flex-shrink-0">
          <span className="text-lg sm:text-xl">{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/60 truncate">{title}</p>
          <h3 className="mt-1 text-2xl sm:text-3xl font-semibold text-white/90">{value}</h3>
        </div>
      </div>
      <p className="mt-3 sm:mt-4 text-xs sm:text-sm leading-5 sm:leading-6 text-white/70">{description}</p>
    </div>
  )
}
