import React, {useState} from 'react'
import InstallBanner from './components/InstallBanner'
import VitalsForm from './components/VitalsForm'
import AudioIntake from './components/AudioIntake'
import GlassCard from './components/GlassCard'
import TriageCard from './components/TriageCard'
import AudioPlayer from './components/AudioPlayer'
import { jsPDF } from 'jspdf'

export default function App(){
  const [triage, setTriage] = useState(null)
  const [vitals, setVitals] = useState({})

  const generatePDF = async (lang='bn') => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('রিলেটেড স্বাস্থ্য সারসংক্ষেপ', 10, 20)
    doc.text(JSON.stringify({vitals, triage}, null, 2), 10, 40)
    doc.save('summary.pdf')
  }

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 md:p-8 text-white flex flex-col">
      <InstallBanner />
      <div className="max-w-7xl mx-auto w-full glass-card p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-soft-glow shadow-lg">
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-h1 mb-2">Rural Health Triage</h1>
            <p className="text-xs sm:text-sm text-white/70 max-w-2xl leading-relaxed">Community health worker dashboard for rapid intake, analytics, and clinical referral guidance powered by AI.</p>
          </div>
          <div className="flex-shrink-0 w-full lg:w-auto">
            <GlassCard
              title="Active Nodes"
              value="210"
              description="Health worker devices reporting vitals and voice intake data."
              icon="⚕️"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <VitalsForm onChange={setVitals} onAnomaly={setTriage} />
          <AudioIntake />
        </div>
        <div className="mt-6 sm:mt-8 flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <TriageCard triage={triage} />
          </div>
          <button onClick={()=>generatePDF('bn')} className="btn-glass w-full lg:w-auto px-6 py-3 font-medium">Generate Bengali PDF</button>
        </div>
        <div className="mt-6 sm:mt-8">
          <AudioPlayer src="/api/tts/stream" />
        </div>
      </div>
    </div>
  )
}
