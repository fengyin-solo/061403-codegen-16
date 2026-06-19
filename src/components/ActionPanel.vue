<template>
  <div class="action-panel">
    <h3 class="panel-title">行动</h3>
    <div v-if="isNight" class="night-warning">
      <span>🌙 夜晚无法外出活动，请保持温暖！</span>
    </div>

    <div class="fuel-selector-section">
      <div class="section-title">🔥 选择燃料</div>
      <div class="fuel-tabs">
        <button
          v-for="fuel in fuelList"
          :key="fuel.id"
          class="fuel-tab"
          :class="{ active: selectedFuel === fuel.id, disabled: !hasFuel(fuel.id) }"
          @click="selectFuel(fuel.id)"
          :title="fuel.description"
        >
          <span class="fuel-tab-icon">{{ fuel.icon }}</span>
          <span class="fuel-tab-name">{{ fuel.shortName }}</span>
        </button>
      </div>

      <div class="fuel-detail">
        <div class="fuel-detail-header">
          <span class="fuel-detail-icon">{{ currentFuelConfig.icon }}</span>
          <span class="fuel-detail-name">{{ currentFuelConfig.name }}</span>
        </div>
        <div class="fuel-stats">
          <div class="stat-row">
            <span class="stat-label">⚡ 点燃速度</span>
            <div class="stat-bar-wrap">
              <div class="stat-bar ignition" :style="{ width: (currentFuelConfig.ignitionSpeed * 50) + '%' }"></div>
            </div>
            <span class="stat-value">{{ getSpeedLabel(currentFuelConfig.ignitionSpeed) }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">⏱️ 持续时长</span>
            <div class="stat-bar-wrap">
              <div class="stat-bar duration" :style="{ width: (currentFuelConfig.burnDuration * 40) + '%' }"></div>
            </div>
            <span class="stat-value">{{ getDurationLabel(currentFuelConfig.burnDuration) }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">🔥 热量输出</span>
            <div class="stat-bar-wrap">
              <div class="stat-bar output" :style="{ width: (currentFuelConfig.heatOutput * 60) + '%' }"></div>
            </div>
            <span class="stat-value">{{ getOutputLabel(currentFuelConfig.heatOutput) }}</span>
          </div>
        </div>
        <div class="fuel-side-effect" v-if="currentFuelConfig.sideEffect">
          <span class="effect-icon">{{ currentFuelConfig.sideEffect === 'smoke' ? '💨' : '☠️' }}</span>
          <span class="effect-text">
            {{ currentFuelConfig.sideEffect === 'smoke' 
              ? '副作用：产生浓烟，狩猎成功率-15%' 
              : '副作用：有毒烟雾，体温恢复受阻' }}
          </span>
        </div>
        <div class="fuel-side-effect safe" v-else>
          <span class="effect-icon">✅</span>
          <span class="effect-text">无副作用</span>
        </div>
        <div class="fuel-description">{{ currentFuelConfig.description }}</div>
      </div>
    </div>

    <div class="actions-grid">
      <button 
        class="action-btn" 
        :class="{ disabled: isNight || gameOver }"
        @click="$emit('chop')"
      >
        <span class="btn-icon">🪓</span>
        <span class="btn-text">砍柴</span>
        <span class="btn-cost">-5 体温</span>
        <span class="btn-hint">获得木柴+干柴</span>
      </button>
      <button 
        class="action-btn" 
        :class="{ disabled: isNight || gameOver }"
        @click="$emit('hunt')"
      >
        <span class="btn-icon">🏹</span>
        <span class="btn-text">狩猎</span>
        <span class="btn-cost">-8 体温</span>
        <span class="btn-hint">成功率: {{ Math.round(huntRate * 100) }}%</span>
      </button>
      <button 
        class="action-btn" 
        :class="{ disabled: isNight || gameOver || !canCraft }"
        @click="$emit('craft')"
      >
        <span class="btn-icon">🔨</span>
        <span class="btn-text">制作工具</span>
        <span class="btn-cost">-6 体温</span>
        <span class="btn-hint">需要: 2🪵 + 1🦊</span>
      </button>
      <button 
        class="action-btn" 
        :class="{ disabled: isNight || gameOver || !canCharcoal }"
        @click="$emit('makeCharcoal')"
      >
        <span class="btn-icon">⚫</span>
        <span class="btn-text">烧制木炭</span>
        <span class="btn-cost">-10 体温</span>
        <span class="btn-hint">需要: 5🪵 + 1🔪 → 3⬛</span>
      </button>
      <button 
        class="action-btn" 
        :class="{ disabled: isNight || gameOver || !canFat }"
        @click="$emit('renderFat')"
      >
        <span class="btn-icon">🕯️</span>
        <span class="btn-text">熬制兽脂</span>
        <span class="btn-cost">-7 体温</span>
        <span class="btn-hint">需要: 3🦊 → 2🕯️</span>
      </button>
      <button 
        class="action-btn fire-btn large" 
        :class="{ disabled: !canFire || gameOver }"
        @click="$emit('fire')"
      >
        <span class="btn-icon">🔥</span>
        <span class="btn-text">生火（{{ currentFuelConfig.shortName }}）</span>
        <span class="btn-cost">-{{ currentFuelConfig.cost }} {{ currentFuelConfig.icon }}</span>
        <span class="btn-hint">
          +{{ currentFuelConfig.heatGainMin }}~{{ currentFuelConfig.heatGainMax }} 热量
          / +{{ currentFuelConfig.tempGain }} 体温
        </span>
      </button>
      <button 
        class="action-btn food-btn" 
        :class="{ disabled: food <= 0 || gameOver }"
        @click="$emit('eat')"
      >
        <span class="btn-icon">🍖</span>
        <span class="btn-text">进食</span>
        <span class="btn-cost">-1 食物</span>
        <span class="btn-hint">+5~15 体温</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isNight: { type: Boolean, default: false },
  gameOver: { type: Boolean, default: false },
  canFire: { type: Boolean, default: false },
  canCraft: { type: Boolean, default: false },
  canCharcoal: { type: Boolean, default: false },
  canFat: { type: Boolean, default: false },
  huntRate: { type: Number, default: 0.3 },
  food: { type: Number, default: 0 },
  wood: { type: Number, default: 0 },
  kindling: { type: Number, default: 0 },
  charcoal: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  selectedFuel: { type: String, default: 'wood' },
  fuelTypes: { type: Object, required: true }
})

const emit = defineEmits(['chop', 'hunt', 'craft', 'makeCharcoal', 'renderFat', 'fire', 'eat', 'selectFuel'])

const fuelList = computed(() => [
  { ...props.fuelTypes.wood, shortName: '木柴' },
  { ...props.fuelTypes.kindling, shortName: '干柴' },
  { ...props.fuelTypes.charcoal, shortName: '木炭' },
  { ...props.fuelTypes.fat, shortName: '兽脂' }
])

const currentFuelConfig = computed(() => {
  return fuelList.value.find(f => f.id === props.selectedFuel) || fuelList.value[0]
})

function hasFuel(id) {
  switch (id) {
    case 'wood': return props.wood > 0
    case 'kindling': return props.kindling > 0
    case 'charcoal': return props.charcoal > 0
    case 'fat': return props.fat > 0
    default: return false
  }
}

function selectFuel(id) {
  emit('selectFuel', id)
}

function getSpeedLabel(speed) {
  if (speed >= 2) return '极快'
  if (speed >= 1.2) return '快'
  if (speed >= 0.8) return '正常'
  if (speed >= 0.5) return '慢'
  return '极慢'
}

function getDurationLabel(dur) {
  if (dur >= 2.5) return '极长'
  if (dur >= 1.8) return '长'
  if (dur >= 0.8) return '正常'
  if (dur >= 0.5) return '短'
  return '极短'
}

function getOutputLabel(out) {
  if (out >= 1.5) return '极高'
  if (out >= 1.2) return '高'
  if (out >= 0.9) return '正常'
  if (out >= 0.7) return '低'
  return '极低'
}
</script>

<style scoped>
.action-panel {
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

.night-warning {
  background: rgba(50, 50, 100, 0.8);
  border: 1px solid rgba(100, 100, 200, 0.5);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 15px;
  text-align: center;
  color: #a0c4ff;
  font-size: 14px;
}

.fuel-selector-section {
  margin-bottom: 18px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 150, 50, 0.25);
}

.section-title {
  color: rgba(255, 200, 150, 0.95);
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 10px;
}

.fuel-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.fuel-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  background: rgba(255, 255, 255, 0.08);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.fuel-tab:hover:not(.disabled) {
  background: rgba(255, 200, 100, 0.15);
  border-color: rgba(255, 180, 80, 0.5);
  transform: translateY(-1px);
}

.fuel-tab.active {
  background: linear-gradient(135deg, rgba(255, 150, 50, 0.35), rgba(255, 100, 0, 0.2));
  border-color: rgba(255, 150, 50, 0.7);
  box-shadow: 0 0 12px rgba(255, 120, 50, 0.3);
}

.fuel-tab.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.fuel-tab-icon {
  font-size: 20px;
}

.fuel-tab-name {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.85);
}

.fuel-detail {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  padding: 10px;
}

.fuel-detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.fuel-detail-icon {
  font-size: 22px;
}

.fuel-detail-name {
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.fuel-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  width: 78px;
  flex-shrink: 0;
}

.stat-bar-wrap {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.stat-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.stat-bar.ignition {
  background: linear-gradient(to right, #ff9933, #ffcc00);
}

.stat-bar.duration {
  background: linear-gradient(to right, #3399ff, #66ccff);
}

.stat-bar.output {
  background: linear-gradient(to right, #ff4444, #ff8800);
}

.stat-value {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.85);
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.fuel-side-effect {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(200, 150, 50, 0.15);
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid rgba(200, 150, 50, 0.3);
}

.fuel-side-effect.safe {
  background: rgba(50, 200, 100, 0.12);
  border-color: rgba(50, 200, 100, 0.25);
}

.effect-icon {
  font-size: 14px;
}

.effect-text {
  font-size: 11px;
  color: rgba(255, 240, 200, 0.95);
}

.fuel-side-effect.safe .effect-text {
  color: rgba(200, 255, 220, 0.95);
}

.fuel-description {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.4;
  font-style: italic;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 12px 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05));
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.action-btn:hover:not(.disabled) {
  transform: translateY(-3px);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1));
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
}

.action-btn:active:not(.disabled) {
  transform: translateY(-1px);
}

.action-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.action-btn.large {
  grid-column: span 2;
}

.fire-btn:not(.disabled) {
  border-color: rgba(255, 100, 50, 0.6);
  background: linear-gradient(135deg, rgba(255, 100, 50, 0.3), rgba(255, 50, 0, 0.1));
}

.fire-btn:hover:not(.disabled) {
  box-shadow: 0 5px 20px rgba(255, 100, 50, 0.4);
}

.food-btn:not(.disabled) {
  border-color: rgba(50, 200, 100, 0.6);
  background: linear-gradient(135deg, rgba(50, 200, 100, 0.3), rgba(0, 150, 50, 0.1));
}

.food-btn:hover:not(.disabled) {
  box-shadow: 0 5px 20px rgba(50, 200, 100, 0.4);
}

.btn-icon {
  font-size: 24px;
}

.btn-text {
  font-size: 13px;
  font-weight: bold;
}

.btn-cost {
  font-size: 10px;
  color: rgba(255, 150, 150, 0.9);
}

.btn-hint {
  font-size: 9.5px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  line-height: 1.3;
}
</style>
