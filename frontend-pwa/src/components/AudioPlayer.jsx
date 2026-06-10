import { useRef } from 'react'

export default function AudioPlayer({ src, summary }) {
  const audioRef = useRef(null)

  const playStream = async () => {
    try {
      const text = summary || 'Clinical summary not available'
      const url = `/api/tts/stream?q=${encodeURIComponent(text)}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`TTS failed: ${response.status}`)
      const blob = await response.blob()
      const audioBlob = new Blob([blob], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
      audioRef.current = new Audio(audioUrl)
      audioRef.current.play()
    } catch (e) {
      console.error('TTS failed', e)
      alert('Audio playback failed: ' + e.message)
    }
  }

  return (
    <div className="w-full">
      <button onClick={playStream} className="w-full px-4 py-2 sm:py-3 bg-indigo-500/80 hover:bg-indigo-400 text-white rounded-lg sm:rounded-xl font-medium transition">🔊 Listen Clinical Summary</button>
    </div>
  )
}
