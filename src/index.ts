import type { Texture } from 'pixi.js'
import { Application, Graphics, Particle, ParticleContainer } from 'pixi.js'
import { createNoise3D } from 'simplex-noise'

export type BackgroundDotsTheme = 'light' | 'dark'

export interface BackgroundDotsOptions {
  theme?: BackgroundDotsTheme
  lightColor?: number
  darkColor?: number
  particleCount?: number
  minSpacing?: number
  maxSpacing?: number
  dotRadius?: number
  maxFPS?: number
  interactive?: boolean
  parallax?: boolean
  zIndex?: number
}

export interface BackgroundDots {
  setTheme(theme: BackgroundDotsTheme): void
  resize(): void
  destroy(): void
}

interface DotPoint {
  x: number
  y: number
  opacity: number
  offsetX: number
  offsetY: number
  velocityX: number
  velocityY: number
  particle: Particle
}

interface Ripple { x: number, y: number, startedAt: number }

const defaults = {
  lightColor: 0x666666,
  darkColor: 0xFFFFFF,
  particleCount: 12000,
  minSpacing: 15,
  maxSpacing: 24,
  dotRadius: 0.6,
  maxFPS: 45,
  interactive: true,
  parallax: true,
  zIndex: 0,
} as const

/** Creates an animated dot-matrix canvas inside `container`. */
export function createBackgroundDots(container: HTMLElement, options: BackgroundDotsOptions = {}): BackgroundDots {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    throw new Error('@llds/bg-dots can only be created in a browser.')

  const config = { ...defaults, ...options }
  const noise3d = createNoise3D()
  const points: DotPoint[] = []
  const pointIds = new Set<string>()
  const ripples: Ripple[] = []
  const app = new Application()
  let particleContainer: ParticleContainer
  let texture: Texture
  let destroyed = false
  let initialized = false
  let resizeTimer: ReturnType<typeof setTimeout> | undefined
  let pointerActive = false
  let pointerX = 0
  let pointerY = 0
  let width = container.clientWidth
  let height = container.clientHeight
  let spacing = getSpacing()
  let theme: BackgroundDotsTheme = config.theme ?? 'light'
  const allowParallax = config.parallax && window.matchMedia('(pointer: fine)').matches

  function getSpacing() {
    const ideal = Math.sqrt(Math.max(1, width * height) / config.particleCount)
    return Math.min(config.maxSpacing, Math.max(config.minSpacing, ideal))
  }

  function color() {
    return theme === 'dark' ? config.darkColor : config.lightColor
  }

  function addPoints() {
    for (let x = -spacing / 2; x < width + spacing; x += spacing) {
      for (let y = -spacing / 2; y < height + spacing; y += spacing) {
        const id = `${x}-${y}`
        if (pointIds.has(id)) continue
        pointIds.add(id)
        const particle = new Particle({ texture, tint: color() })
        particle.anchorX = 0.5
        particle.anchorY = 0.5
        particleContainer.addParticle(particle)
        points.push({ x, y, opacity: Math.random() * 0.45 + 0.3, offsetX: 0, offsetY: 0, velocityX: 0, velocityY: 0, particle })
      }
    }
  }

  function resetPoints() {
    if (!initialized || destroyed) return
    app.stage.removeChild(particleContainer)
    particleContainer.destroy()
    particleContainer = new ParticleContainer({ dynamicProperties: { position: true, color: true } })
    app.stage.addChild(particleContainer)
    points.length = 0
    pointIds.clear()
    addPoints()
  }

  function getPointerPosition(event: PointerEvent) {
    const rect = container.getBoundingClientRect()
    pointerX = event.clientX - rect.left
    pointerY = event.clientY - rect.top
  }

  function onPointerMove(event: PointerEvent) { getPointerPosition(event); pointerActive = true }
  function onPointerLeave() { pointerActive = false }
  function onPointerDown(event: PointerEvent) {
    if (!event.isPrimary) return
    getPointerPosition(event)
    ripples.push({ x: pointerX, y: pointerY, startedAt: performance.now() })
    if (ripples.length > 4) ripples.shift()
  }
  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      width = container.clientWidth
      height = container.clientHeight
      spacing = getSpacing()
      resetPoints()
    }, 200)
  }

  async function initialize() {
    await app.init({ backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio, 2), resizeTo: container, autoDensity: true, eventMode: 'none' })
    if (destroyed) { app.destroy(true, { children: true, texture: true, textureSource: true }); return }
    container.appendChild(app.canvas)
    Object.assign(app.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: String(config.zIndex), pointerEvents: 'none' })
    particleContainer = new ParticleContainer({ dynamicProperties: { position: true, color: true } })
    app.stage.addChild(particleContainer)
    const graphic = new Graphics().circle(0, 0, config.dotRadius).fill(0xFFFFFF)
    texture = app.renderer.generateTexture(graphic)
    graphic.destroy()
    addPoints()
    app.ticker.maxFPS = config.maxFPS
    initialized = true
    app.ticker.add(update)
    window.addEventListener('resize', onResize)
    if (config.interactive) {
      container.addEventListener('pointermove', onPointerMove, { passive: true })
      container.addEventListener('pointerleave', onPointerLeave)
      container.addEventListener('pointerdown', onPointerDown, { passive: true })
    }
  }

  function update(ticker: { deltaTime: number }) {
    const now = performance.now()
    const time = now / 10000
    const frameScale = Math.min(ticker.deltaTime, 2)
    const damping = 0.78 ** frameScale
    const parallaxX = pointerActive && allowParallax ? -(pointerX / width - 0.5) * 6 : 0
    const parallaxY = pointerActive && allowParallax ? -(pointerY / height - 0.5) * 6 : 0
    for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].startedAt > 900) ripples.splice(i, 1)

    for (const point of points) {
      const rad = (noise3d(point.x / 200, point.y / 200, time) - 0.5) * 2 * Math.PI
      const length = (noise3d(point.x / 200, point.y / 200, time * 2) + 0.5) * 5
      const baseX = point.x + Math.cos(rad) * length
      const baseY = point.y + Math.sin(rad) * length
      let targetX = parallaxX
      let targetY = parallaxY
      applyPointerForce(baseX, baseY, rad, target => { targetX += target.x; targetY += target.y })
      point.velocityX = (point.velocityX + (targetX - point.offsetX) * 0.14 * frameScale) * damping
      point.velocityY = (point.velocityY + (targetY - point.offsetY) * 0.14 * frameScale) * damping
      point.offsetX += point.velocityX * frameScale
      point.offsetY += point.velocityY * frameScale
      point.particle.x = baseX + point.offsetX
      point.particle.y = baseY + point.offsetY
      point.particle.alpha = (Math.abs(Math.cos(rad)) * 0.8 + 0.2) * point.opacity
    }
  }

  function applyPointerForce(x: number, y: number, rad: number, add: (force: { x: number, y: number }) => void) {
    if (pointerActive) {
      const dx = x - pointerX; const dy = y - pointerY; const d2 = dx * dx + dy * dy
      if (d2 < 120 ** 2) { const d = Math.sqrt(d2) || 1; const force = (1 - d / 120) ** 2 * 36; add({ x: (d2 > 0.01 ? dx / d : Math.cos(rad)) * force, y: (d2 > 0.01 ? dy / d : Math.sin(rad)) * force }) }
    }
    for (const ripple of ripples) {
      const age = performance.now() - ripple.startedAt; const radius = age * 0.42; const outer = radius + 55
      const dx = x - ripple.x; const dy = y - ripple.y; const d2 = dx * dx + dy * dy; const inner = Math.max(0, radius - 55)
      if (d2 > outer ** 2 || d2 < inner ** 2) continue
      const d = Math.sqrt(d2) || 1; const force = (1 - Math.abs(d - radius) / 55) ** 2 * (1 - age / 900) * 24
      add({ x: (d2 > 0.01 ? dx / d : Math.cos(rad)) * force, y: (d2 > 0.01 ? dy / d : Math.sin(rad)) * force })
    }
  }

  void initialize().catch((error: unknown) => { if (!destroyed) console.error('[@llds/bg-dots]', error) })
  return {
    setTheme(nextTheme) { theme = nextTheme; for (const point of points) point.particle.tint = color() },
    resize: onResize,
    destroy() {
      if (destroyed) return
      destroyed = true
      if (resizeTimer) clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
      container.removeEventListener('pointerdown', onPointerDown)
      if (initialized) app.destroy(true, { children: true, texture: true, textureSource: true })
    },
  }
}
