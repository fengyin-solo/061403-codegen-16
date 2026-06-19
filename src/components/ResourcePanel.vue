<template>
  <div class="resource-panel">
    <h3 class="panel-title">资源</h3>
    <div class="resources-grid">
      <div class="resource-item">
        <span class="resource-icon">🔥</span>
        <div class="resource-info">
          <span class="resource-name">热量</span>
          <div class="resource-bar-container">
            <div class="resource-bar" :style="{ width: heat + '%', background: getHeatColor() }"></div>
          </div>
          <span class="resource-value">{{ Math.round(heat) }}/100</span>
        </div>
      </div>

      <div class="section-divider">
        <span class="section-label">⛽ 燃料</span>
      </div>

      <div class="resource-item" :class="{ 'resource-highlight': currentFuel === 'wood' }">
        <span class="resource-icon">🪵</span>
        <div class="resource-info">
          <span class="resource-name">普通木柴</span>
          <span class="resource-value-large">{{ wood }}</span>
        </div>
      </div>
      <div class="resource-item" :class="{ 'resource-highlight': currentFuel === 'kindling' }">
        <span class="resource-icon">🍂</span>
        <div class="resource-info">
          <span class="resource-name">干燥引火物</span>
          <span class="resource-value-large">{{ kindling }}</span>
        </div>
      </div>
      <div class="resource-item" :class="{ 'resource-highlight': currentFuel === 'charcoal' }">
        <span class="resource-icon">⬛</span>
        <div class="resource-info">
          <span class="resource-name">木炭</span>
          <span class="resource-value-large">{{ charcoal }}</span>
        </div>
      </div>
      <div class="resource-item" :class="{ 'resource-highlight': currentFuel === 'fat' }">
        <span class="resource-icon">🕯️</span>
        <div class="resource-info">
          <span class="resource-name">兽脂</span>
          <span class="resource-value-large">{{ fat }}</span>
        </div>
      </div>

      <div class="section-divider">
        <span class="section-label">🎒 物资</span>
      </div>

      <div class="resource-item">
        <span class="resource-icon">🍖</span>
        <div class="resource-info">
          <span class="resource-name">食物</span>
          <span class="resource-value-large">{{ food }}</span>
        </div>
      </div>
      <div class="resource-item">
        <span class="resource-icon">🦊</span>
        <div class="resource-info">
          <span class="resource-name">兽皮</span>
          <span class="resource-value-large">{{ hide }}</span>
        </div>
      </div>
      <div class="resource-item">
        <span class="resource-icon">🔪</span>
        <div class="resource-info">
          <span class="resource-name">工具</span>
          <span class="resource-value-large">{{ tools }}</span>
        </div>
      </div>
    </div>

    <div v-if="currentFuel || smokeEffectActive || toxicEffectActive" class="fuel-status">
      <div v-if="currentFuel" class="status-item">
        <span class="status-icon">🔥</span>
        <span class="status-text">正在燃烧：{{ getFuelName(currentFuel) }}</span>
      </div>
      <div v-if="smokeEffectActive" class="status-item warning">
        <span class="status-icon">💨</span>
        <span class="status-text">浓烟中（狩猎-15%）</span>
      </div>
      <div v-if="toxicEffectActive" class="status-item danger">
        <span class="status-icon">☠️</span>
        <span class="status-text">有毒烟雾（体温恢复受阻）</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  heat: { type: Number, default: 0 },
  wood: { type: Number, default: 0 },
  kindling: { type: Number, default: 0 },
  charcoal: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  food: { type: Number, default: 0 },
  hide: { type: Number, default: 0 },
  tools: { type: Number, default: 0 },
  currentFuel: { type: String, default: null },
  smokeEffectActive: { type: Boolean, default: false },
  toxicEffectActive: { type: Boolean, default: false }
})

function getHeatColor() {
  if (props.heat > 60) return 'linear-gradient(to right, #ff6600, #ffcc00)'
  if (props.heat > 30) return 'linear-gradient(to right, #ff9933, #ffcc00)'
  return 'linear-gradient(to right, #cc3300, #ff6600)'
}

function getFuelName(id) {
  const names = {
    wood: '普通木柴',
    kindling: '干燥引火物',
    charcoal: '木炭',
    fat: '兽脂'
  }
  return names[id] || id
}
</script>

<style scoped>
.resource-panel {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.panel-title {
  color: white;
  font-size: 18px;
  margin-bottom: 15px;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.resources-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-divider {
  margin: 8px 0 4px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.section-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.resource-item:hover {
  transform: translateX(5px);
  background: rgba(0, 0, 0, 0.3);
}

.resource-highlight {
  background: rgba(255, 150, 50, 0.25);
  border: 1px solid rgba(255, 150, 50, 0.4);
  box-shadow: 0 0 10px rgba(255, 100, 0, 0.2);
}

.resource-icon {
  font-size: 24px;
  width: 36px;
  text-align: center;
}

.resource-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.resource-name {
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
}

.resource-bar-container {
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.resource-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.resource-value {
  color: white;
  font-size: 11px;
  font-weight: bold;
}

.resource-value-large {
  color: white;
  font-size: 20px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.fuel-status {
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255, 150, 50, 0.15);
  border-radius: 8px;
  border: 1px solid rgba(255, 150, 50, 0.3);
}

.status-item.warning {
  background: rgba(200, 150, 50, 0.15);
  border-color: rgba(200, 150, 50, 0.3);
}

.status-item.danger {
  background: rgba(200, 50, 50, 0.15);
  border-color: rgba(200, 50, 50, 0.3);
}

.status-icon {
  font-size: 16px;
}

.status-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
}
</style>
