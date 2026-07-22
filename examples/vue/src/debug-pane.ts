import type { BackgroundDotsTheme } from '@llds/bg-dots'
import { Pane } from 'tweakpane'

export interface DebugOptions {
  theme: BackgroundDotsTheme
  lightColor: string
  darkColor: string
  particleCount: number
  minSpacing: number
  maxSpacing: number
  dotRadius: number
  maxFPS: number
  interactive: boolean
  parallax: boolean
  zIndex: number
}

interface DebugPaneHandlers {
  onOptionsChange: () => void
  onThemeChange: () => void
  onReset: () => void
}

function formatColor(color: string) {
  return `0x${Number.parseInt(color.replace('#', ''), 16).toString(16).padStart(6, '0')}`
}

function createOptionsCode(options: DebugOptions) {
  return `{
  theme: '${options.theme}',
  lightColor: ${formatColor(options.lightColor)},
  darkColor: ${formatColor(options.darkColor)},
  particleCount: ${options.particleCount},
  minSpacing: ${options.minSpacing},
  maxSpacing: ${options.maxSpacing},
  dotRadius: ${options.dotRadius},
  maxFPS: ${options.maxFPS},
  interactive: ${options.interactive},
  parallax: ${options.parallax},
  zIndex: ${options.zIndex},
}`
}

async function copyOptions(options: DebugOptions) {
  const code = createOptionsCode(options)

  if (!navigator.clipboard) {
    window.alert('当前环境不支持剪贴板复制')
    return
  }

  try {
    await navigator.clipboard.writeText(code)
    window.alert('已复制')
  }
  catch {
    window.alert('复制失败，请检查浏览器的剪贴板权限')
  }
}

export function createDebugPane(options: DebugOptions, handlers: DebugPaneHandlers) {
  const pane = new Pane({ title: '背景点阵', expanded: false })
  pane.element.style.zIndex = '100'

  const appearance = pane.addFolder({ title: '外观' })
  appearance.addBinding(options, 'theme', { label: '主题', options: { 浅色: 'light', 深色: 'dark' } }).on('change', handlers.onThemeChange)
  appearance.addBinding(options, 'lightColor', { label: '浅色点颜色' }).on('change', handlers.onOptionsChange)
  appearance.addBinding(options, 'darkColor', { label: '深色点颜色' }).on('change', handlers.onOptionsChange)
  appearance.addBinding(options, 'dotRadius', { label: '点半径', min: 0.1, max: 5, step: 0.1 }).on('change', handlers.onOptionsChange)
  appearance.addBinding(options, 'zIndex', { label: '层级', min: -10, max: 10, step: 1 }).on('change', handlers.onOptionsChange)

  const layout = pane.addFolder({ title: '布局' })
  layout.addBinding(options, 'particleCount', { label: '粒子数量', min: 100, max: 30000, step: 100 }).on('change', handlers.onOptionsChange)
  layout.addBinding(options, 'minSpacing', { label: '最小间距', min: 2, max: 100, step: 1 }).on('change', handlers.onOptionsChange)
  layout.addBinding(options, 'maxSpacing', { label: '最大间距', min: 2, max: 100, step: 1 }).on('change', handlers.onOptionsChange)

  const behavior = pane.addFolder({ title: '行为' })
  behavior.addBinding(options, 'maxFPS', { label: '最大帧率', min: 1, max: 120, step: 1 }).on('change', handlers.onOptionsChange)
  behavior.addBinding(options, 'interactive', { label: '启用交互' }).on('change', handlers.onOptionsChange)
  behavior.addBinding(options, 'parallax', { label: '启用视差' }).on('change', handlers.onOptionsChange)

  pane.addButton({ title: '复制参数' }).on('click', () => copyOptions(options))
  pane.addButton({ title: '重置全部参数' }).on('click', handlers.onReset)

  return pane
}
