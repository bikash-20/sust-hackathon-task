import React, {useState, useRef} from 'react'

export default function AudioIntake(){
  const [recording,setRecording] = useState(false)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  const start = async ()=>{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true})
    const mr = new MediaRecorder(stream)
    mediaRef.current = mr
    mr.ondataavailable = e=>{ if(e.data.size) chunksRef.current.push(e.data) }
    mr.onstop = async ()=>{
      const blob = new Blob(chunksRef.current,{type:'audio/webm'})
      chunksRef.current = []
      const fd = new FormData()
      fd.append('file', blob, 'intake.webm')
      await fetch('/api/audio/intake',{method:'POST', body: fd})
    }
    mr.start()
    setRecording(true)
  }

  const stop = ()=>{ mediaRef.current?.stop(); setRecording(false) }

  return (
    <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl w-full">
      <label className="text-xs uppercase tracking-wide text-white/70 block mb-3">Voice Intake (Bengali/English)</label>
      <h3 className="text-sm sm:text-base font-semibold mb-4 text-white/90">Record Patient Symptoms</h3>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button onClick={start} disabled={recording} className="flex-1 px-4 py-2 sm:py-3 bg-green-500/80 hover:bg-green-400 disabled:opacity-50 text-white rounded-lg sm:rounded-xl font-medium transition">{recording ? 'Recording...' : 'Start Recording'}</button>
        <button onClick={stop} disabled={!recording} className="flex-1 px-4 py-2 sm:py-3 bg-red-500/80 hover:bg-red-400 disabled:opacity-50 text-white rounded-lg sm:rounded-xl font-medium transition">Stop & Upload</button>
      </div>
    </div>
  )
}
