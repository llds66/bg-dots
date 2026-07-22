<script setup lang="ts">
import { createBackgroundDots, type BackgroundDotsOptions, type BackgroundDotsTheme } from '@llds/bg-dots'
import { createDebugPane, type DebugOptions } from './debug-pane'
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const container = ref<HTMLElement>()
const options = reactive<DebugOptions>({
  theme: 'light' as BackgroundDotsTheme,
  lightColor: '#666666',
  darkColor: '#ffffff',
  particleCount: 12000,
  minSpacing: 15,
  maxSpacing: 24,
  dotRadius: 0.6,
  maxFPS: 45,
  interactive: true,
  parallax: true,
  zIndex: 0,
})

let background: ReturnType<typeof createBackgroundDots> | undefined
let debugPane: ReturnType<typeof createDebugPane> | undefined

function toBackgroundOptions(): BackgroundDotsOptions {
  return {
    ...options,
    lightColor: Number.parseInt(options.lightColor.slice(1), 16),
    darkColor: Number.parseInt(options.darkColor.slice(1), 16),
  }
}

function recreateBackground() {
  if (!container.value) return
  background?.destroy()
  background = createBackgroundDots(container.value, toBackgroundOptions())
}

// 重置参数
function resetOptions() {
  Object.assign(options, {
    theme: 'light' as BackgroundDotsTheme,
    lightColor: '#666666',
    darkColor: '#ffffff',
    particleCount: 12000,
    minSpacing: 15,
    maxSpacing: 24,
    dotRadius: 0.6,
    maxFPS: 45,
    interactive: true,
    parallax: true,
    zIndex: 0,
  })
  recreateBackground()
  debugPane?.refresh()
  window.alert('参数已重置为默认值')
}

onMounted(() => {
  recreateBackground()
  debugPane = createDebugPane(options, {
    onOptionsChange: recreateBackground,
    onThemeChange: () => background?.setTheme(options.theme),
    onReset: resetOptions,
  })
})

onBeforeUnmount(() => {
  background?.destroy()
  debugPane?.dispose()
})
</script>

<template>
  <div ref="container" class="background" :class="`background--${options.theme}`">
    <div class="text">bg-dots</div>
  </div>
</template>

<style scoped>
.background { 
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.background--light {
  background-color: #ffffff;
  color: #000000;
}

.background--dark {
  background-color: #000000;
  color: #f9fafb;
}

.text {
  font-size: 1rem;
  user-select: none;
}
</style>
