'use client'

import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'

/* Immersive 3D globe (emerald markers) — no gradients, solid vibrant colors */
export default function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerMovement = useRef(0)

  useEffect(() => {
    let phi = 0
    let width = 0
    const canvas = canvasRef.current
    if (!canvas) return

    const onResize = () => {
      width = canvas.offsetWidth
    }
    window.addEventListener('resize', onResize)
    onResize()

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.28,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.09, 0.16, 0.13],
      markerColor: [0.2, 0.83, 0.6], // emerald
      glowColor: [0.06, 0.4, 0.28],
      markers: [
        { location: [19.076, 72.8777], size: 0.09 }, // Mumbai
        { location: [40.7128, -74.006], size: 0.08 }, // New York
        { location: [51.5074, -0.1278], size: 0.06 }, // London
        { location: [35.6762, 139.6503], size: 0.06 }, // Tokyo
        { location: [1.3521, 103.8198], size: 0.05 }, // Singapore
        { location: [22.3193, 114.1694], size: 0.05 }, // Hong Kong
        { location: [-33.8688, 151.2093], size: 0.04 }, // Sydney
        { location: [25.2048, 55.2708], size: 0.05 }, // Dubai
        { location: [37.7749, -122.4194], size: 0.05 }, // SF
        { location: [50.1109, 8.6821], size: 0.04 }, // Frankfurt
      ],
      onRender: (state) => {
        if (pointerInteracting.current === null) phi += 0.004
        state.phi = phi + pointerMovement.current
        state.width = width * 2
        state.height = width * 2
      },
    })

    setTimeout(() => {
      if (canvas) canvas.style.opacity = '1'
    }, 100)

    return () => {
      globe.destroy()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerMovement.current * 100
          if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
        }}
        onPointerUp={() => {
          pointerInteracting.current = null
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          pointerInteracting.current = null
        }}
        onPointerMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current
            pointerMovement.current = delta / 100
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          aspectRatio: '1',
          cursor: 'grab',
          opacity: 0,
          transition: 'opacity 1s ease',
          contain: 'layout paint size',
        }}
      />
    </div>
  )
}
