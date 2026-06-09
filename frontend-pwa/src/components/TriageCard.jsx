import React from 'react'
import { motion } from 'framer-motion'

const colors = {
  green: 'border-green-400/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  yellow: 'border-yellow-400/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
  red: 'border-red-400/50 bg-rose-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]',
  black: 'border-slate-400/35 bg-slate-900/20 shadow-[0_0_20px_rgba(148,163,184,0.12)]'
}

export default function TriageCard({triage}){
  const level = triage?.level || 'green'
  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className={`p-5 rounded-3xl border ${colors[level]} backdrop-blur-md bg-white/10 text-white/85 transition duration-300`}>
      <h4 className="text-lg font-semibold tracking-wide uppercase text-white/80">Triage Status</h4>
      <p className="mt-2 text-2xl font-bold text-white/95">{triage?.level?.toUpperCase() ?? 'GREEN'}</p>
      <div className="mt-3 text-sm leading-6 text-white/70">
        {triage?.alerts?.length ? triage.alerts.join(', ') : 'No critical anomalies detected.'}
      </div>
    </motion.div>
  )
}
