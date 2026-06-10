import { useRef, useState } from 'react'

export default function AudioPlayer({ src, summary }) {
  const audioRef = useRef(null)
  const [loading, setLoading] = useState(false)

  const playStream = async () => {
    try {
      setLoading(true)
      const text = summary || 'Clinical summary not available'
      const url = `/api/tts/stream?q=${encodeURIComponent(text)}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`TTS failed: ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(blob)
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.load()
        await audioRef.current.play()
      }
    } catch (e) {
      console.error('TTS failed', e)
      alert('Audio failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <audio ref={audioRef} preload="none" />
      <button onClick={playStream} disabled={loading} className="w-full px-4 py-2 sm:py-3 bg-indigo-500/80 hover:bg-indigo-400 text-white rounded-lg sm:rounded-xl font-medium transition">
        {loading ? '⏳ Loading...' : '🔊 Listen Clinical Summary'}
      </button>
    </div>
  )
}
