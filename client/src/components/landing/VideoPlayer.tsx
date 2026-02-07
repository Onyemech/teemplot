import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings } from 'lucide-react'

interface VideoPlayerProps {
  src: string
  title: string
  poster?: string
}

export default function VideoPlayer({ src, title, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [thumb, setThumb] = useState<string | undefined>(poster)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onLoaded = () => {
      setDuration(v.duration || 0)
      // Generate thumbnail from first frame if poster missing
      if (!poster) {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = v.videoWidth
          canvas.height = v.videoHeight
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
            setThumb(dataUrl)
          }
        } catch {}
      }
    }
    const onTime = () => setProgress(v.currentTime)
    v.addEventListener('loadedmetadata', onLoaded)
    v.addEventListener('timeupdate', onTime)
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('timeupdate', onTime)
    }
  }, [poster])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = muted
  }, [muted])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = volume
  }, [volume])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.playbackRate = speed
  }, [speed])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    const t = Number(e.target.value)
    v.currentTime = t
    setProgress(t)
  }

  const toggleFullscreen = async () => {
    const c = containerRef.current as any
    if (!c) return
    try {
      if (!document.fullscreenElement) {
        await c.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch {}
  }

  const formatTime = (t: number) => {
    if (!isFinite(t)) return '0:00'
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div ref={containerRef} className="w-full bg-black rounded-xl overflow-hidden shadow-lg">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={src}
          poster={thumb}
          className="w-full h-full object-contain"
          playsInline
          onClick={togglePlay}
        />
        {!playing && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 flex items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur hover:bg-white/20"
            aria-label="Play"
          >
            <Play className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
      <div className="p-3 sm:p-4 bg-gray-900 text-white">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={togglePlay} className="p-2 rounded hover:bg-gray-800" aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={() => setMuted(!muted)} className="p-2 rounded hover:bg-gray-800" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24 accent-[#0F5D5D]"
          />
          <div className="ml-auto flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" />
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="bg-gray-800 text-white text-sm rounded px-2 py-1"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
            <button onClick={toggleFullscreen} className="p-2 rounded hover:bg-gray-800" aria-label="Fullscreen">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.0001)}
            step={0.1}
            value={progress}
            onChange={handleSeek}
            className="flex-1 accent-[#0F5D5D]"
          />
          <span className="text-xs text-gray-400">{formatTime(duration)}</span>
        </div>
        <p className="mt-3 text-sm text-gray-300 line-clamp-2">{title}</p>
      </div>
    </div>
  )
}

