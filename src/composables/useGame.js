import { ref, computed, onMounted, onUnmounted } from 'vue'

const FUEL_TYPES = {
  wood: {
    id: 'wood',
    name: '普通木柴',
    icon: '🪵',
    ignitionSpeed: 1,
    burnDuration: 1,
    heatOutput: 1,
    heatGainMin: 25,
    heatGainMax: 45,
    tempGain: 10,
    cost: 3,
    sideEffect: null,
    description: '基础燃料，均衡的燃烧表现。'
  },
  kindling: {
    id: 'kindling',
    name: '干燥引火物',
    icon: '🍂',
    ignitionSpeed: 2,
    burnDuration: 0.5,
    heatOutput: 0.8,
    heatGainMin: 15,
    heatGainMax: 25,
    tempGain: 5,
    cost: 2,
    sideEffect: null,
    description: '极易点燃，燃烧迅速但持续时间短。'
  },
  charcoal: {
    id: 'charcoal',
    name: '木炭',
    icon: '⬛',
    ignitionSpeed: 0.5,
    burnDuration: 2.5,
    heatOutput: 1.5,
    heatGainMin: 40,
    heatGainMax: 60,
    tempGain: 15,
    cost: 1,
    sideEffect: 'smoke',
    description: '燃烧时间极长，热量输出高，但会产生浓烟。'
  },
  fat: {
    id: 'fat',
    name: '兽脂',
    icon: '🕯️',
    ignitionSpeed: 1.2,
    burnDuration: 1.8,
    heatOutput: 1.2,
    heatGainMin: 30,
    heatGainMax: 50,
    tempGain: 12,
    cost: 1,
    sideEffect: 'toxic',
    description: '燃烧稳定持久，但释放有毒烟雾，会轻微降低体温。'
  }
}

export function useGame() {
  const temperature = ref(80)
  const heat = ref(50)
  const wood = ref(10)
  const kindling = ref(3)
  const charcoal = ref(0)
  const fat = ref(0)
  const food = ref(5)
  const hide = ref(0)
  const tools = ref(0)
  const isDay = ref(true)
  const dayCount = ref(1)
  const isBlizzard = ref(false)
  const gameOver = ref(false)
  const gameOverReason = ref('')
  const actionLog = ref([])

  const currentFuel = ref(null)
  const burnTimerMultiplier = ref(1)
  const smokeEffectActive = ref(false)
  const toxicEffectActive = ref(false)
  const selectedFuelType = ref('wood')

  const DAY_DURATION = 30000
  const NIGHT_DURATION = 20000
  const HEAT_CONSUMPTION_RATE = 2
  const BLIZZARD_CHANCE = 0.15

  let dayNightTimer = null
  let nightConsumptionTimer = null
  let autoSaveTimer = null
  let sideEffectTimer = null

  const isNight = computed(() => !isDay.value)
  const isDanger = computed(() => temperature.value < 30)
  const canMakeFire = computed(() => {
    const fuel = FUEL_TYPES[selectedFuelType.value]
    if (!fuel) return false
    switch (fuel.id) {
      case 'wood': return wood.value >= fuel.cost
      case 'kindling': return kindling.value >= fuel.cost
      case 'charcoal': return charcoal.value >= fuel.cost
      case 'fat': return fat.value >= fuel.cost
      default: return false
    }
  })
  const canMakeCharcoal = computed(() => wood.value >= 5 && tools.value >= 1)
  const canMakeFat = computed(() => hide.value >= 3)
  const canHunt = computed(() => tools.value > 0)
  const huntSuccessRate = computed(() => {
    const base = 0.3 + tools.value * 0.15
    const penalty = smokeEffectActive.value ? 0.15 : 0
    return Math.max(0.05, base - penalty)
  })

  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    actionLog.value.unshift({ message, type, timestamp })
    if (actionLog.value.length > 20) {
      actionLog.value.pop()
    }
  }

  function checkGameOver() {
    if (temperature.value <= 20) {
      gameOver.value = true
      gameOverReason.value = '体温过低，你在严寒中失去了意识...'
      stopTimers()
      addLog('游戏结束：体温过低！', 'danger')
    }
    if (temperature.value >= 100) {
      temperature.value = 100
    }
  }

  function consumeHeat() {
    if (gameOver.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const consumption = HEAT_CONSUMPTION_RATE * multiplier / burnTimerMultiplier.value
    
    if (heat.value >= consumption) {
      heat.value -= consumption
      if (temperature.value < 80) {
        let tempIncrease = 1
        if (toxicEffectActive.value) {
          tempIncrease = 0
          temperature.value = Math.max(0, temperature.value - 0.5)
        }
        temperature.value = Math.min(80, temperature.value + tempIncrease)
      }
    } else {
      heat.value = 0
      temperature.value = Math.max(0, temperature.value - consumption)
      addLog('热量不足！体温正在下降...', 'warning')
      currentFuel.value = null
      burnTimerMultiplier.value = 1
      clearSideEffects()
    }
    
    checkGameOver()
  }

  function clearSideEffects() {
    smokeEffectActive.value = false
    toxicEffectActive.value = false
    if (sideEffectTimer) {
      clearTimeout(sideEffectTimer)
      sideEffectTimer = null
    }
  }

  function applySideEffect(fuel) {
    clearSideEffects()
    if (!fuel.sideEffect) return

    const duration = 15000 * fuel.burnDuration

    if (fuel.sideEffect === 'smoke') {
      smokeEffectActive.value = true
      addLog('⚠️ 木炭燃烧产生浓烟，狩猎成功率下降！', 'warning')
    } else if (fuel.sideEffect === 'toxic') {
      toxicEffectActive.value = true
      addLog('⚠️ 兽脂燃烧释放有毒烟雾，体温恢复受阻！', 'warning')
    }

    sideEffectTimer = setTimeout(() => {
      if (fuel.sideEffect === 'smoke') {
        smokeEffectActive.value = false
        addLog('浓烟散去，狩猎成功率恢复正常。', 'info')
      } else if (fuel.sideEffect === 'toxic') {
        toxicEffectActive.value = false
        addLog('有毒烟雾散尽，体温恢复正常。', 'info')
      }
    }, duration)
  }

  function startNightCycle() {
    addLog(`夜幕降临，第 ${dayCount.value} 天结束`, 'info')
    nightConsumptionTimer = setInterval(() => {
      consumeHeat()
    }, 1000)
    
    if (Math.random() < BLIZZARD_CHANCE) {
      triggerBlizzard()
    }
  }

  function startDayCycle() {
    dayCount.value++
    addLog(`天亮了，第 ${dayCount.value} 天开始`, 'success')
    isBlizzard.value = false
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
  }

  function toggleDayNight() {
    isDay.value = !isDay.value
    if (isDay.value) {
      startDayCycle()
    } else {
      startNightCycle()
    }
  }

  function triggerBlizzard() {
    isBlizzard.value = true
    addLog('⚠️ 暴风雪来袭！所有消耗加倍！', 'danger')
  }

  function chopWood() {
    if (gameOver.value || isNight.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 5 * multiplier
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    const woodGained = Math.floor(Math.random() * 3) + 2
    wood.value += woodGained

    if (Math.random() < 0.4) {
      const kindlingGained = Math.floor(Math.random() * 2) + 1
      kindling.value += kindlingGained
      addLog(`砍柴：获得 ${woodGained} 木头，${kindlingGained} 干柴，消耗 ${tempCost} 体温`, 'action')
    } else {
      addLog(`砍柴：获得 ${woodGained} 木头，消耗 ${tempCost} 体温`, 'action')
    }
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function hunt() {
    if (gameOver.value || isNight.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 8 * multiplier
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    
    if (Math.random() < huntSuccessRate.value) {
      const foodGained = Math.floor(Math.random() * 3) + 2
      const hideGained = Math.floor(Math.random() * 2) + 1
      food.value += foodGained
      hide.value += hideGained
      addLog(`狩猎成功：获得 ${foodGained} 食物，${hideGained} 兽皮，消耗 ${tempCost} 体温`, 'success')
    } else {
      addLog(`狩猎失败：消耗 ${tempCost} 体温，空手而归`, 'warning')
    }
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function makeTools() {
    if (gameOver.value || isNight.value) return
    if (wood.value < 2 || hide.value < 1) {
      addLog('材料不足：需要 2 木头和 1 兽皮', 'warning')
      return
    }
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 6 * multiplier
    
    wood.value -= 2
    hide.value -= 1
    tools.value += 1
    temperature.value = Math.max(0, temperature.value - tempCost)
    
    addLog(`制作工具：获得 1 工具，消耗 ${tempCost} 体温`, 'success')
    checkGameOver()
  }

  function makeCharcoal() {
    if (gameOver.value || isNight.value) return
    if (!canMakeCharcoal.value) {
      addLog('材料不足：需要 5 木头和 1 工具', 'warning')
      return
    }

    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 10 * multiplier

    wood.value -= 5
    tools.value -= 1
    charcoal.value += 3
    temperature.value = Math.max(0, temperature.value - tempCost)

    addLog(`烧制木炭：获得 3 木炭，消耗 ${tempCost} 体温`, 'success')
    checkGameOver()
  }

  function renderFat() {
    if (gameOver.value || isNight.value) return
    if (!canMakeFat.value) {
      addLog('材料不足：需要 3 兽皮', 'warning')
      return
    }

    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 7 * multiplier

    hide.value -= 3
    fat.value += 2
    temperature.value = Math.max(0, temperature.value - tempCost)

    addLog(`熬制兽脂：获得 2 兽脂，消耗 ${tempCost} 体温`, 'success')
    checkGameOver()
  }

  function setFuelType(type) {
    if (FUEL_TYPES[type]) {
      selectedFuelType.value = type
    }
  }

  function makeFire() {
    const fuel = FUEL_TYPES[selectedFuelType.value]
    if (gameOver.value || !fuel) return

    let hasEnough = false
    switch (fuel.id) {
      case 'wood':
        if (wood.value >= fuel.cost) {
          wood.value -= fuel.cost
          hasEnough = true
        }
        break
      case 'kindling':
        if (kindling.value >= fuel.cost) {
          kindling.value -= fuel.cost
          hasEnough = true
        }
        break
      case 'charcoal':
        if (charcoal.value >= fuel.cost) {
          charcoal.value -= fuel.cost
          hasEnough = true
        }
        break
      case 'fat':
        if (fat.value >= fuel.cost) {
          fat.value -= fuel.cost
          hasEnough = true
        }
        break
    }

    if (!hasEnough) {
      addLog(`${fuel.name}不足：生火需要 ${fuel.cost} ${fuel.icon}`, 'warning')
      return
    }

    const baseHeat = Math.floor(Math.random() * (fuel.heatGainMax - fuel.heatGainMin + 1)) + fuel.heatGainMin
    const heatGained = Math.floor(baseHeat * fuel.heatOutput / fuel.ignitionSpeed)
    heat.value = Math.min(100, heat.value + heatGained)
    temperature.value = Math.min(100, temperature.value + fuel.tempGain)

    currentFuel.value = fuel.id
    burnTimerMultiplier.value = fuel.burnDuration
    applySideEffect(fuel)

    const speedLabel = fuel.ignitionSpeed >= 2 ? '极快' : fuel.ignitionSpeed >= 1 ? '正常' : '缓慢'
    const durationLabel = fuel.burnDuration >= 2 ? '极长' : fuel.burnDuration >= 1 ? '正常' : '短暂'
    
    addLog(
      `用${fuel.name}生火：+${heatGained}热量，点燃${speedLabel}，持续${durationLabel}`,
      'success'
    )
  }

  function eatFood() {
    if (gameOver.value || food.value < 1) {
      addLog('没有食物了！', 'warning')
      return
    }
    
    food.value -= 1
    const tempGained = Math.floor(Math.random() * 10) + 5
    temperature.value = Math.min(100, temperature.value + tempGained)
    
    addLog(`进食：体温恢复 ${tempGained}`, 'success')
  }

  function startTimers() {
    dayNightTimer = setInterval(() => {
      toggleDayNight()
    }, isDay.value ? DAY_DURATION : NIGHT_DURATION)
    
    autoSaveTimer = setInterval(() => {
      saveGame('auto')
    }, 10000)
  }

  function stopTimers() {
    if (dayNightTimer) {
      clearInterval(dayNightTimer)
      dayNightTimer = null
    }
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
    if (sideEffectTimer) {
      clearTimeout(sideEffectTimer)
      sideEffectTimer = null
    }
  }

  function saveGame(slot = 'manual') {
    const gameState = {
      temperature: temperature.value,
      heat: heat.value,
      wood: wood.value,
      kindling: kindling.value,
      charcoal: charcoal.value,
      fat: fat.value,
      food: food.value,
      hide: hide.value,
      tools: tools.value,
      isDay: isDay.value,
      dayCount: dayCount.value,
      isBlizzard: isBlizzard.value,
      currentFuel: currentFuel.value,
      burnTimerMultiplier: burnTimerMultiplier.value,
      smokeEffectActive: smokeEffectActive.value,
      toxicEffectActive: toxicEffectActive.value,
      selectedFuelType: selectedFuelType.value,
      savedAt: Date.now()
    }
    localStorage.setItem(`snowSurvival_${slot}`, JSON.stringify(gameState))
    addLog(`游戏已保存到存档位：${slot === 'auto' ? '自动存档' : slot}`, 'info')
  }

  function loadGame(slot = 'auto') {
    const saved = localStorage.getItem(`snowSurvival_${slot}`)
    if (!saved) {
      addLog('没有找到存档', 'warning')
      return false
    }
    
    try {
      const gameState = JSON.parse(saved)
      temperature.value = gameState.temperature
      heat.value = gameState.heat
      wood.value = gameState.wood
      kindling.value = gameState.kindling ?? 0
      charcoal.value = gameState.charcoal ?? 0
      fat.value = gameState.fat ?? 0
      food.value = gameState.food
      hide.value = gameState.hide
      tools.value = gameState.tools
      isDay.value = gameState.isDay
      dayCount.value = gameState.dayCount
      isBlizzard.value = gameState.isBlizzard
      currentFuel.value = gameState.currentFuel ?? null
      burnTimerMultiplier.value = gameState.burnTimerMultiplier ?? 1
      smokeEffectActive.value = gameState.smokeEffectActive ?? false
      toxicEffectActive.value = gameState.toxicEffectActive ?? false
      selectedFuelType.value = gameState.selectedFuelType ?? 'wood'
      gameOver.value = false
      gameOverReason.value = ''
      actionLog.value = []
      
      stopTimers()
      startTimers()
      
      if (!isDay.value) {
        startNightCycle()
      }
      
      addLog(`成功加载存档：${slot === 'auto' ? '自动存档' : slot}`, 'success')
      return true
    } catch (e) {
      addLog('存档损坏，无法加载', 'danger')
      return false
    }
  }

  function getSaveSlots() {
    const slots = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('snowSurvival_')) {
        const slotName = key.replace('snowSurvival_', '')
        try {
          const data = JSON.parse(localStorage.getItem(key))
          slots.push({
            name: slotName,
            dayCount: data.dayCount,
            savedAt: data.savedAt
          })
        } catch (e) {}
      }
    }
    return slots
  }

  function deleteSave(slot) {
    localStorage.removeItem(`snowSurvival_${slot}`)
    addLog(`已删除存档：${slot}`, 'info')
  }

  function restartGame() {
    temperature.value = 80
    heat.value = 50
    wood.value = 10
    kindling.value = 3
    charcoal.value = 0
    fat.value = 0
    food.value = 5
    hide.value = 0
    tools.value = 0
    isDay.value = true
    dayCount.value = 1
    isBlizzard.value = false
    gameOver.value = false
    gameOverReason.value = ''
    actionLog.value = []
    currentFuel.value = null
    burnTimerMultiplier.value = 1
    smokeEffectActive.value = false
    toxicEffectActive.value = false
    selectedFuelType.value = 'wood'
    
    stopTimers()
    startTimers()
    
    addLog('新游戏开始！祝你好运！', 'success')
  }

  onMounted(() => {
    startTimers()
    addLog('欢迎来到雪地生存！白天收集资源，夜晚保持温暖。', 'info')
    addLog('提示：尝试不同燃料，它们各有优缺点！', 'info')
  })

  onUnmounted(() => {
    stopTimers()
  })

  return {
    temperature,
    heat,
    wood,
    kindling,
    charcoal,
    fat,
    food,
    hide,
    tools,
    isDay,
    isNight,
    dayCount,
    isBlizzard,
    gameOver,
    gameOverReason,
    actionLog,
    isDanger,
    canMakeFire,
    canMakeCharcoal,
    canMakeFat,
    canHunt,
    huntSuccessRate,
    currentFuel,
    smokeEffectActive,
    toxicEffectActive,
    selectedFuelType,
    fuelTypes: FUEL_TYPES,
    chopWood,
    hunt,
    makeTools,
    makeCharcoal,
    renderFat,
    setFuelType,
    makeFire,
    eatFood,
    saveGame,
    loadGame,
    getSaveSlots,
    deleteSave,
    restartGame
  }
}
