<script setup lang="ts">
import { createBackgroundDots, type BackgroundDots } from '@llds/bg-dots'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const container = ref<HTMLElement>()
let background: BackgroundDots | undefined

onMounted(() => {
  if (container.value) {
    background = createBackgroundDots(container.value, { theme: 'dark' })
  }
})

onBeforeUnmount(() => {
  background?.destroy()
})
</script>

<template>
  <div ref="container" style="position: relative; width: 100%; height: 100vh" />
</template>
