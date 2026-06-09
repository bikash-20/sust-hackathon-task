import React from 'react'

export default function VitalsForm({onChange,onAnomaly}){
  const handleSubmit = async (e)=>{
    e.preventDefault()
    const form = Object.fromEntries(new FormData(e.target))
    const res = await fetch('/api/vitals',{
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)
    })
    const json = await res.json()
    onChange(form)
    onAnomaly(json)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 w-full">
      <label className="text-xs uppercase tracking-wide text-white/70 block mb-3">Patient Vital Signs</label>
      <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl">
        <label className="text-xs sm:text-sm font-medium text-white/80">Blood Pressure (systolic/diastolic)</label>
        <input name="bp" className="w-full bg-transparent border border-white/20 p-2 sm:p-3 rounded-lg mt-1 text-white placeholder:text-white/50" placeholder="120/80" />
      </div>
      <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl">
        <label className="text-xs sm:text-sm font-medium text-white/80">Heart Rate (bpm)</label>
        <input name="hr" type="number" className="w-full bg-transparent border border-white/20 p-2 sm:p-3 rounded-lg mt-1 text-white placeholder:text-white/50" placeholder="72" />
      </div>
      <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl">
        <label className="text-xs sm:text-sm font-medium text-white/80">Temperature (°F)</label>
        <input name="temp" type="number" step="0.1" className="w-full bg-transparent border border-white/20 p-2 sm:p-3 rounded-lg mt-1 text-white placeholder:text-white/50" placeholder="98.6" />
      </div>
      <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl">
        <label className="text-xs sm:text-sm font-medium text-white/80">SpO₂ (%)</label>
        <input name="spo2" type="number" className="w-full bg-transparent border border-white/20 p-2 sm:p-3 rounded-lg mt-1 text-white placeholder:text-white/50" placeholder="98" />
      </div>
      <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl">
        <label className="text-xs sm:text-sm font-medium text-white/80">Blood Glucose (mg/dL)</label>
        <input name="glucose" type="number" className="w-full bg-transparent border border-white/20 p-2 sm:p-3 rounded-lg mt-1 text-white placeholder:text-white/50" placeholder="110" />
      </div>
      <button type="submit" className="btn-glass w-full mt-4">Submit Vitals</button>
    </form>
  )
}
