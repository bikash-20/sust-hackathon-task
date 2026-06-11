import React, { useState, useRef } from 'react'

export default function AudioIntake({ vitals, onTriageUpdate }) {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    const mr = new MediaRecorder(stream)
    mediaRef.current = mr
    mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }

    mr.onstop = async () => {
      setProcessing(true)
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      chunksRef.current = []
      const fd = new FormData()
      fd.append('file', blob, 'intake.webm')

      try {
        const audioRes = await fetch('/api/audio/intake', { method: 'POST', body: fd })
        const audioData = await audioRes.json()

        if (audioData.normalized) {
          const triageRes = await fetch('/api/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              normalized_text: audioData.normalized,
              vitals_anomaly: vitals || {},
              history: { medications: [], diagnoses: [], labs: [] }
            })
          })
          const triageData = await triageRes.json()
          if (onTriageUpdate) onTriageUpdate(triageData)
        }
      } catch (err) {
        console.error('Audio intake pipeline failed:', err)
      } finally {
        setProcessing(false)
        streamRef.current?.getTracks().forEach(t => t.stop())
      }
    }

    mr.start()
    setRecording(true)
  }

  const stop = () => { mediaRef.current?.stop(); setRecording(false) }

  return (
    <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl w-full">
      <label className="text-xs uppercase tracking-wide text-white/70 block mb-3">
        Voice Intake (Bengali/English)
      </label>
      <h3 className="text-sm sm:text-base font-semibold mb-4 text-white/90">
        Record Patient Symptoms
      </h3>
      {processing && (
        <div className="mb-3 text-xs text-yellow-300 animate-pulse flex items-center gap-2">
          <span>⏳</span> Analyzing symptoms and generating triage...
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={start}
          disabled={recording || processing}
          className="flex-1 px-4 py-2 sm:py-3 bg-green-500/80 hover:bg-green-400 disabled:opacity-50 text-white rounded-lg sm:rounded-xl font-medium transition"
        >
          {recording ? 'Recording...' : 'Start Recording'}
        </button>
        <button
          onClick={stop}
          disabled={!recording || processing}
          className="flex-1 px-4 py-2 sm:py-3 bg-red-500/80 hover:bg-red-400 disabled:opacity-50 text-white rounded-lg sm:rounded-xl font-medium transition"
        >
          {processing ? 'Analyzing...' : 'Stop & Upload'}
        </button>
      </div>
    </div>
  )
}