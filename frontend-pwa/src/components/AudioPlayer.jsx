import React, {useRef} from 'react'

export default function AudioPlayer({src}){
  const audioRef = useRef(null)
  const playStream = () => {
    if(!audioRef.current) audioRef.current = new Audio(src)
    audioRef.current.src = src
    audioRef.current.crossOrigin = 'anonymous'
    audioRef.current.play()
  }
  return (
    <div className="w-full">
      <button onClick={playStream} className="w-full px-4 py-2 sm:py-3 bg-indigo-500/80 hover:bg-indigo-400 text-white rounded-lg sm:rounded-xl font-medium transition">🔊 Listen Clinical Summary</button>
    </div>
  )
}
