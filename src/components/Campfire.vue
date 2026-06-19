<template>
  <div class="campfire-container">
    <canvas ref="canvasRef" :width="canvasSize" :height="canvasSize"></canvas>
    <div v-if="smokeOverlay" class="smoke-overlay"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  heat: {
    type: Number,
    default: 0
  },
  canvasSize: {
    type: Number,
    default: 200
  },
  currentFuel: {
    type: String,
    default: null
  }
})

const canvasRef = ref(null)
let animationId = null
let particles = []
let smokeParticles = []

const smokeOverlay = computed(() => props.currentFuel === 'charcoal')

const FUEL_COLORS = {
  wood: {
    flame: ['#fff7e6', '#ffd700', '#ff8c00', '#ff4500', '#dc143c'],
    base: ['#ffd700', '#ff8c00', '#ff4500', '#dc143c', '#8b0000'],
    ember: ['#ff4500', '#dc143c']
  },
  kindling: {
    flame: ['#ffffff', '#fff7e6', '#ffea00', '#ffaa00', '#ff6600'],
    base: ['#ffea00', '#ffaa00', '#ff6600', '#ff4400', '#cc2200'],
    ember: ['#ffaa00', '#ff6600']
  },
  charcoal: {
    flame: ['#ffffff', '#e0e0e0', '#a0a0ff', '#8080c0', '#6060a0'],
    base: ['#c0c0ff', '#9090d0', '#7070b0', '#505090', '#303070'],
    ember: ['#8080c0', '#6060a0']
  },
  fat: {
    flame: ['#fff0e0', '#ffeedd', '#ffccaa', '#ff9966', '#ff5533'],
    base: ['#ffddaa', '#ffbb77', '#ff9955', '#dd6633', '#aa4422'],
    ember: ['#ff9955', '#dd6633']
  }
}

function getFuelColors(fuel, intensity) {
  const palette = FUEL_COLORS[fuel] || FUEL_COLORS.wood
  if (intensity > 70) return palette.flame
  if (intensity > 40) return palette.base
  if (intensity > 10) return [...palette.base.slice(2), palette.ember[0], palette.ember[1]]
  return [palette.ember[0], palette.ember[1], '#4a0000', '#2d0000', '#1a0000']
}

class Particle {
  constructor(x, y, size, speed, color) {
    this.x = x
    this.y = y
    this.size = size
    this.speed = speed
    this.color = color
    this.alpha = 1
    this.wobble = Math.random() * Math.PI * 2
    this.wobbleSpeed = 0.05 + Math.random() * 0.05
  }

  update() {
    this.y -= this.speed
    this.wobble += this.wobbleSpeed
    this.x += Math.sin(this.wobble) * 0.5
    this.alpha -= 0.015
    this.size *= 0.98
  }

  draw(ctx) {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

class SmokeParticle {
  constructor(x, y, size) {
    this.x = x
    this.y = y
    this.size = size
    this.speedY = 0.3 + Math.random() * 0.4
    this.speedX = (Math.random() - 0.5) * 0.3
    this.alpha = 0.15 + Math.random() * 0.1
    this.grow = 0.05 + Math.random() * 0.03
  }

  update() {
    this.y -= this.speedY
    this.x += this.speedX
    this.size += this.grow
    this.alpha -= 0.003
  }

  draw(ctx) {
    if (this.alpha <= 0) return
    ctx.save()
    ctx.globalAlpha = Math.max(0, this.alpha)
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.size
    )
    gradient.addColorStop(0, 'rgba(150, 150, 170, 0.6)')
    gradient.addColorStop(1, 'rgba(100, 100, 120, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function createParticle(centerX, baseY, intensity, fuel) {
  const colors = getFuelColors(fuel, intensity)
  const color = colors[Math.floor(Math.random() * colors.length)]
  const size = 2 + Math.random() * (intensity / 15)
  const speed = 1 + Math.random() * (intensity / 25)
  const x = centerX + (Math.random() - 0.5) * (intensity / 2.5)
  const y = baseY - Math.random() * 10
  
  return new Particle(x, y, size, speed, color)
}

function createSmokeParticle(centerX, baseY) {
  const x = centerX + (Math.random() - 0.5) * 30
  const y = baseY - 20 - Math.random() * 30
  const size = 8 + Math.random() * 12
  return new SmokeParticle(x, y, size)
}

function drawLogs(ctx, centerX, baseY, fuel) {
  const palette = FUEL_COLORS[fuel] || FUEL_COLORS.wood
  const emberColors = palette.ember

  if (fuel === 'charcoal') {
    ctx.fillStyle = '#2a2a2a'
    ctx.strokeStyle = '#1a1a1a'
  } else if (fuel === 'fat') {
    ctx.fillStyle = '#5a3a1a'
    ctx.strokeStyle = '#3a2a0a'
  } else {
    ctx.fillStyle = '#4a2c0a'
    ctx.strokeStyle = '#2d1a05'
  }
  ctx.lineWidth = 2
  
  ctx.save()
  ctx.translate(centerX - 30, baseY + 10)
  ctx.rotate(-0.3)
  ctx.fillRect(0, 0, 60, 12)
  ctx.strokeRect(0, 0, 60, 12)
  ctx.restore()
  
  ctx.save()
  ctx.translate(centerX - 30, baseY + 15)
  ctx.rotate(0.3)
  ctx.fillRect(0, 0, 60, 12)
  ctx.strokeRect(0, 0, 60, 12)
  ctx.restore()
  
  ctx.fillStyle = emberColors[0]
  for (let i = 0; i < 5; i++) {
    const emberX = centerX - 20 + i * 10
    const emberY = baseY + 5 + Math.random() * 10
    ctx.beginPath()
    ctx.arc(emberX, emberY, 2 + Math.random() * 2, 0, Math.PI * 2)
    ctx.fill()
  }

  if (fuel === 'fat') {
    ctx.fillStyle = 'rgba(255, 200, 150, 0.5)'
    for (let i = 0; i < 3; i++) {
      const dripX = centerX - 15 + i * 15
      const dripY = baseY + 18
      ctx.beginPath()
      ctx.arc(dripX, dripY, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawFlameBase(ctx, centerX, baseY, intensity, fuel) {
  if (intensity <= 0) return
  
  const palette = FUEL_COLORS[fuel] || FUEL_COLORS.wood
  const baseColor = fuel === 'charcoal' 
    ? ['rgba(160, 160, 255, 0.4)', 'rgba(100, 100, 200, 0.2)', 'rgba(80, 80, 160, 0)']
    : fuel === 'kindling'
    ? ['rgba(255, 234, 0, 0.45)', 'rgba(255, 170, 0, 0.25)', 'rgba(255, 100, 0, 0)']
    : fuel === 'fat'
    ? ['rgba(255, 200, 150, 0.4)', 'rgba(255, 150, 100, 0.2)', 'rgba(220, 100, 50, 0)']
    : ['rgba(255, 200, 50, 0.4)', 'rgba(255, 100, 0, 0.2)', 'rgba(255, 0, 0, 0)']

  const gradient = ctx.createRadialGradient(
    centerX, baseY, 0,
    centerX, baseY, intensity / 1.5
  )
  gradient.addColorStop(0, baseColor[0])
  gradient.addColorStop(0.5, baseColor[1])
  gradient.addColorStop(1, baseColor[2])
  
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(centerX, baseY, intensity / 1.5, 0, Math.PI * 2)
  ctx.fill()
}

function animate() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  const centerX = canvas.width / 2
  const baseY = canvas.height - 50
  const intensity = props.heat
  const fuel = props.currentFuel || 'wood'
  
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  drawFlameBase(ctx, centerX, baseY, intensity, fuel)
  drawLogs(ctx, centerX, baseY, fuel)
  
  if (intensity > 0) {
    const particleCount = Math.floor(intensity / 5) + 3
    for (let i = 0; i < particleCount; i++) {
      if (Math.random() > 0.5) {
        particles.push(createParticle(centerX, baseY, intensity, fuel))
      }
    }

    if (fuel === 'charcoal' && Math.random() > 0.7) {
      smokeParticles.push(createSmokeParticle(centerX, baseY))
    }
  }
  
  particles = particles.filter(p => p.alpha > 0 && p.y > 0)
  particles.forEach(p => {
    p.update()
    p.draw(ctx)
  })

  smokeParticles = smokeParticles.filter(p => p.alpha > 0)
  smokeParticles.forEach(p => {
    p.update()
    p.draw(ctx)
  })
  
  if (intensity > 0) {
    const glowIntensity = intensity / 100
    const palette = FUEL_COLORS[fuel] || FUEL_COLORS.wood
    const glowColor = fuel === 'charcoal'
      ? [`rgba(180, 180, 255, ${0.3 * glowIntensity})`, 'rgba(100, 100, 200, 0)']
      : fuel === 'kindling'
      ? [`rgba(255, 230, 100, ${0.35 * glowIntensity})`, 'rgba(255, 150, 50, 0)']
      : fuel === 'fat'
      ? [`rgba(255, 220, 180, ${0.3 * glowIntensity})`, 'rgba(255, 120, 80, 0)']
      : [`rgba(255, 200, 100, ${0.3 * glowIntensity})`, 'rgba(255, 100, 50, 0)']

    const glowGradient = ctx.createRadialGradient(
      centerX, baseY - intensity / 3, 0,
      centerX, baseY - intensity / 3, intensity
    )
    glowGradient.addColorStop(0, glowColor[0])
    glowGradient.addColorStop(1, glowColor[1])
    
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = glowGradient
    ctx.beginPath()
    ctx.arc(centerX, baseY - intensity / 3, intensity, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }
  
  animationId = requestAnimationFrame(animate)
}

watch(() => props.heat, (newVal, oldVal) => {
  if (newVal > oldVal && newVal > 20) {
    const fuel = props.currentFuel || 'wood'
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const canvas = canvasRef.value
        if (canvas) {
          const centerX = canvas.width / 2
          const baseY = canvas.height - 50
          particles.push(createParticle(centerX, baseY, newVal, fuel))
        }
      }, i * 50)
    }
  }
})

onMounted(() => {
  animate()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.campfire-container {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

canvas {
  border-radius: 50%;
  background: radial-gradient(circle, #1a1a2e 0%, #0f0f1a 100%);
  box-shadow: 0 0 30px rgba(255, 100, 50, 0.3);
  position: relative;
  z-index: 1;
}

.smoke-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  pointer-events: none;
  background: 
    radial-gradient(ellipse at 40% 30%, rgba(150, 150, 170, 0.12) 0%, transparent 40%),
    radial-gradient(ellipse at 60% 40%, rgba(130, 130, 150, 0.1) 0%, transparent 35%),
    radial-gradient(ellipse at 50% 20%, rgba(160, 160, 180, 0.08) 0%, transparent 45%);
  z-index: 2;
  animation: smokeDrift 8s ease-in-out infinite;
}

@keyframes smokeDrift {
  0%, 100% {
    transform: translateX(0) translateY(0);
    opacity: 1;
  }
  50% {
    transform: translateX(3px) translateY(-2px);
    opacity: 0.85;
  }
}
</style>
