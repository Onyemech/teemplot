'use client'

import Image from 'next/image'

export function LogoLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse-slow">
          <div className="w-24 h-24 rounded-full bg-accent/20"></div>
        </div>
        <div className="relative z-10 animate-spin-slow">
          <Image
            src="/logo.png"
            alt="Teemplot"
            width={96}
            height={96}
            className="object-contain"
          />
        </div>
      </div>
    </div>
  )
}
