/************************************************************
 * CARAVAN SURVIVAL – DATA-DRIVEN (JSON EVENTS & FEATURES)
 ************************************************************/
(function(){
  "use strict";

  // ---------- 1. PRNG & SEED ----------
  function mulberry32(seed) {
    return function() {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let rng = mulberry32(Date.now());
  let currentSeed = Date.now();

  function seededRandomInt(min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  function hashStringToSeed(str) {
    if (!str) return Date.now();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash;
  }

  // ---------- 2. GLOBAL DATA (loaded from JSON) ----------
  let EVENT_LIST = [];
  let TERRARIAN_FEATURES = [];

  // ---------- 3. GAME STATE ----------
  const GameState = {
    settlers: 1000,
    condition: 100,
    unity: 100,
    equipment: 10,
    moves: 0,
    isActive: false,
    gameOver: false,
    currentLocation: null,
    pendingEvent: null
  };

  // ---------- 4. UTILITIES ----------
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function getEventProbability(moves) {
    return Math.exp(0.2 * moves);
  }
  function rollForEvent(moves) {
    return rng() < Math.min(getEventProbability(moves), 1.0);
  }

  // Apply declarative effects to state
  function applyEffects(state, effects) {
    let message = '';
    effects.forEach(eff => {
      if (eff.type === 'settlers') {
        let delta = eff.delta;
        if (typeof delta === 'object' && delta.min !== undefined && delta.max !== undefined) {
          delta = seededRandomInt(delta.min, delta.max);
        }
        state.settlers = Math.max(0, state.settlers + delta);
        if (delta > 0) message = `${delta} settlers joined.`;
        else if (delta < 0) message = `${-delta} settlers lost.`;
      } else if (eff.type === 'condition') {
        let delta = eff.delta;
        if (typeof delta === 'object') delta = seededRandomInt(delta.min, delta.max);
        state.condition = clamp(state.condition + delta, 0, Infinity);
        message = `Landbase condition ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}%.`;
      } else if (eff.type === 'unity') {
        let delta = eff.delta;
        if (typeof delta === 'object') delta = seededRandomInt(delta.min, delta.max);
        state.unity = clamp(state.unity + delta, 0, Infinity);
        message = `Unity ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}%.`;
      } else if (eff.type === 'flag') {
        state[eff.name] = eff.value;
        message = eff.name === 'nextWaterGood' ? 'Next water will be safe.' : 'Next location will be better.';
      }
    });
    return message || 'No immediate effect.';
  }

  // Build executable event objects from JSON data
  function buildEventObjects(rawEvents) {
    return rawEvents.map(raw => {
      const event = {
        name: raw.name,
        description: raw.description,
        hasChoice: raw.hasChoice || false,
        effect: (state) => applyEffects(state, raw.effects)
      };
      if (raw.hasChoice) {
        event.choices = raw.choices.map(c => ({
          text: c.text,
          effect: (state) => applyEffects(state, c.effects)
        }));
      }
      return event;
    });
  }

  // Build feature objects from JSON data
  function buildFeatureObjects(rawFeatures) {
    return rawFeatures.map(f => ({
      name: f.name,
      target: f.target,
      desc: f.desc,
      increasesDeath: f.increasesDeath,
      modifier: () => seededRandomInt(f.modifier.min, f.modifier.max)
    }));
  }

  // ---------- 5. LOCATION GENERATION (with unique features) ----------
  function rollFeatureCount() {
    const roll = rng();
    if (roll < 0.6) return 0;
    if (roll < 0.8) return 1;
    if (roll < 0.9) return 2;
    if (roll < 0.95) return 3;
    return 4;
  }

  function pickUniqueFeatures(count) {
    if (count === 0) return [];
    const shuffled = [...TERRARIAN_FEATURES];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count).map(f => ({
      ...f,
      modifier: f.modifier()
    }));
  }

  function generateLocation(moves) {
    const features = ['water', 'climate', 'resources', 'radiation'];
    const location = {};
    const shift = moves * 5;
    const maxRoll = Math.max(100, 300 - shift);
    const minRoll = Math.max(0, 200 - shift);
    features.forEach(f => {
      location[f] = seededRandomInt(minRoll, maxRoll);
    });

    const featureCount = rollFeatureCount();
    location.terrarianFeatures = pickUniqueFeatures(featureCount);
    location.scanned = false;
    return location;
  }

  function getDangerColor(roll) {
    if (roll >= 200) return '🔴';
    if (roll >= 75) return '🟠';
    return '🟢';
  }
  function getWaterLabel(roll) {
    if (roll >= 200) return 'Non‑existent / Shallow Puddle';
    if (roll >= 75) return 'Pond / Lake';
    return 'Natural Spring / River';
  }
  function getClimateLabel(roll) {
    if (roll >= 200) return 'Desert / Arctic';
    if (roll >= 75) return 'Savanna / Tundra';
    return 'Tropical / Oceanic';
  }
  function getResourcesLabel(roll) {
    if (roll >= 200) return 'Scarce / Non‑existent';
    if (roll >= 75) return 'Salvageable Wreckages';
    return 'Abundant';
  }
  function getRadiationLabel(roll) {
    if (roll >= 200) return 'High';
    if (roll >= 75) return 'Medium';
    return 'Low';
  }

  // ---------- 6. EVENT TRIGGER ----------
  function triggerRandomEvent() {
    return EVENT_LIST[Math.floor(rng() * EVENT_LIST.length)];
  }

  // ---------- 7. APPLY LOCATION MODIFIERS (from event flags) ----------
  function applyLocationGeneration(state) {
    let location = generateLocation(state.moves);
    if (state.nextWaterGood) {
      location.water = seededRandomInt(0, 74);
      delete state.nextWaterGood;
    }
    if (state.nextLocationBetter) {
      ['water', 'climate', 'resources', 'radiation'].forEach(attr => {
        location[attr] = Math.max(0, location[attr] - 50);
      });
      delete state.nextLocationBetter;
    }
    return location;
  }

  // ---------- 8. UI ELEMENTS ----------
  let ui = {};

  function updateUI() {
    ui.settlers.textContent = GameState.settlers;
    ui.condition.textContent = GameState.condition;
    ui.unity.textContent = GameState.unity;
    ui.equipment.textContent = GameState.equipment;
    ui.moves.textContent = GameState.moves;
    if (ui.scanBtn) {
      ui.scanBtn.disabled = !GameState.isActive || GameState.gameOver || GameState.equipment <= 0 || !GameState.currentLocation || GameState.currentLocation.scanned;
    }
  }

  function displayLocation() {
    const loc = GameState.currentLocation;
    if (!loc) return;
    const w = loc.water, c = loc.climate, r = loc.resources, rad = loc.radiation;
    ui.water.textContent = `${getDangerColor(w)} ${getWaterLabel(w)}`;
    ui.climate.textContent = `${getDangerColor(c)} ${getClimateLabel(c)}`;
    ui.resources.textContent = `${getDangerColor(r)} ${getResourcesLabel(r)}`;
    ui.radiation.textContent = `${getDangerColor(rad)} ${getRadiationLabel(rad)}`;
    updateTerrarianDisplay();
  }

  function updateTerrarianDisplay() {
    const loc = GameState.currentLocation;
    if (!loc) return;
    if (loc.scanned) {
      if (loc.terrarianFeatures.length === 0) {
        ui.terrarianStatus.textContent = '✅ No unusual features detected.';
        ui.terrarianList.innerHTML = '';
      } else {
        ui.terrarianStatus.textContent = '⚠️ Terrarian Features detected:';
        let html = '';
        loc.terrarianFeatures.forEach(f => {
          const colorIndicator = f.increasesDeath ? '🔴' : '🟢';
          html += `<div>${colorIndicator} ${f.name}: ${f.desc}</div>`;
        });
        ui.terrarianList.innerHTML = html;
      }
    } else {
      ui.terrarianStatus.textContent = '❓ Further investigation needed.';
      ui.terrarianList.innerHTML = '';
    }
  }

  function log(message) {
    const entry = document.createElement('div');
    entry.textContent = message;
    ui.gameLog.appendChild(entry);
    ui.gameLog.scrollTop = ui.gameLog.scrollHeight;
  }

  function clearLog() {
    ui.gameLog.innerHTML = '';
  }

  // ---------- 9. SCANNING ----------
  function scanLocation() {
    if (!GameState.isActive || GameState.gameOver) return;
    if (GameState.equipment <= 0) return;
    if (!GameState.currentLocation) return;
    if (GameState.currentLocation.scanned) return;

    GameState.equipment--;
    GameState.currentLocation.scanned = true;
    log(`🔍 Location scanned. Equipment remaining: ${GameState.equipment}`);
    updateTerrarianDisplay();
    updateUI();
  }

  // ---------- 10. EVENT PANEL ----------
  function clearEventPanel() {
    ui.eventPanelDescription.textContent = 'No active event.';
    ui.eventPanelChoices.innerHTML = '';
  }

  function disableActions() {
    ui.moveBtn.disabled = true;
    ui.settleBtn.disabled = true;
    if (ui.scanBtn) ui.scanBtn.disabled = true;
  }

  function enableActions() {
    if (!GameState.gameOver && GameState.isActive) {
      ui.moveBtn.disabled = false;
      ui.settleBtn.disabled = false;
      updateUI();
    }
  }

  function finalizeEventResolution() {
    GameState.pendingEvent = null;
    clearEventPanel();
    if (GameState.currentLocation) displayLocation();
    updateUI();
    checkGameOver();
    enableActions();
  }

  function displayChoiceEvent(event) {
    GameState.pendingEvent = event;
    ui.eventPanelDescription.textContent = event.description;
    ui.eventPanelChoices.innerHTML = '';
    event.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.textContent = choice.text;
      btn.classList.add('game-btn', 'event-choice-btn');
      btn.addEventListener('click', () => {
        const message = choice.effect(GameState);
        log(`📌 Event: ${event.name} – ${message}`);
        GameState.currentLocation = applyLocationGeneration(GameState);
        finalizeEventResolution();
      });
      ui.eventPanelChoices.appendChild(btn);
    });
    disableActions();
  }

  function displayAutoEvent(event, outcomeMessage) {
    GameState.pendingEvent = event;
    ui.eventPanelDescription.textContent = `${event.description} ${outcomeMessage}`;
    ui.eventPanelChoices.innerHTML = '';

    const ackBtn = document.createElement('button');
    ackBtn.textContent = '✔️ Acknowledge';
    ackBtn.classList.add('game-btn');
    ackBtn.addEventListener('click', () => {
      GameState.currentLocation = applyLocationGeneration(GameState);
      finalizeEventResolution();
    });
    ui.eventPanelChoices.appendChild(ackBtn);
    disableActions();
  }

  // ---------- 11. MOVE ----------
  function moveToNextLocation() {
    if (!GameState.isActive || GameState.gameOver) return;
    GameState.moves++;
    let eventTriggered = false;

    if (rollForEvent(GameState.moves)) {
      const event = triggerRandomEvent();
      if (event.hasChoice) {
        displayChoiceEvent(event);
      } else {
        const message = event.effect(GameState);
        log(`📌 Event: ${event.name} – ${message}`);
        displayAutoEvent(event, message);
      }
      eventTriggered = true;
    }

    if (!eventTriggered) {
      GameState.currentLocation = applyLocationGeneration(GameState);
      log(`📍 Moved to a new location.`);
      displayLocation();
      updateUI();
      checkGameOver();
      enableActions();
    } else {
      updateUI();
    }
  }

  // ---------- 12. SETTLE ----------
  function settle() {
    if (!GameState.isActive || GameState.gameOver) return;
    const loc = GameState.currentLocation;
    const features = ['water', 'climate', 'resources', 'radiation'];
    const featureNames = { water: 'Water scarcity', climate: 'Harsh climate', resources: 'Lack of resources', radiation: 'Radiation' };

    const baseDeaths = {};
    features.forEach(f => {
      const roll = loc[f];
      if (roll >= 200) baseDeaths[f] = roll + 30;
      else if (roll >= 75) baseDeaths[f] = roll - 30;
      else baseDeaths[f] = 0;
    });

    const terrarianModifiers = { water: 0, climate: 0, resources: 0, radiation: 0, general: 0 };
    loc.terrarianFeatures.forEach(f => {
      if (f.target === 'general') terrarianModifiers.general += f.modifier;
      else terrarianModifiers[f.target] += f.modifier;
    });

    let totalDeaths = 0;
    const deathDetails = [];

    features.forEach(f => {
      let finalDeath = baseDeaths[f] + terrarianModifiers[f] + terrarianModifiers.general;
      finalDeath = Math.max(0, finalDeath);
      totalDeaths += finalDeath;
      if (finalDeath > 0) {
        deathDetails.push(`${featureNames[f]} claimed ${finalDeath} settlers.`);
      }
    });

    GameState.settlers = Math.max(0, GameState.settlers - totalDeaths);
    const finalScore = Math.floor(GameState.settlers * (GameState.unity / 100) * (GameState.condition / 100));
    GameState.isActive = false;
    GameState.gameOver = true;

    log(`🏁 Settlement attempted. Total deaths: ${totalDeaths}`);
    deathDetails.forEach(msg => log(`   ↳ ${msg}`));
    if (!loc.scanned && loc.terrarianFeatures.length > 0) {
      log(`⚠️ Unknown dangers contributed to the death toll.`);
    }
    log(`📊 Final Score: ${finalScore}`);

    ui.finalScore.textContent = `Final Score: ${finalScore}`;
    ui.gameOverPanel.style.display = 'block';
    disableActions();
    clearEventPanel();
    updateUI();
  }

  // ---------- 13. GAME OVER CHECK ----------
  function checkGameOver() {
    if (GameState.settlers <= 0) {
      GameState.isActive = false;
      GameState.gameOver = true;
      log('💀 All settlers have perished. The journey ends.');
      ui.gameOverPanel.style.display = 'block';
      ui.finalScore.textContent = 'Score: 0';
      disableActions();
      clearEventPanel();
    }
  }

  // ---------- 14. INITIALIZE SEED ----------
  function initializeSeed(seedInput) {
    let seedNum;
    if (seedInput && seedInput.trim() !== '') {
      seedNum = hashStringToSeed(seedInput);
    } else {
      seedNum = Date.now();
    }
    currentSeed = seedNum;
    rng = mulberry32(seedNum);
    if (ui.currentSeedDisplay) ui.currentSeedDisplay.textContent = currentSeed;
    if (ui.gameSeedDisplay) ui.gameSeedDisplay.textContent = currentSeed;
    return currentSeed;
  }

  // ---------- 15. NEW GAME ----------
  function startNewGame(seedValue) {
    initializeSeed(seedValue);
    GameState.settlers = 1000;
    GameState.condition = 100;
    GameState.unity = 100;
    GameState.equipment = 10;
    GameState.moves = 0;
    GameState.isActive = true;
    GameState.gameOver = false;
    GameState.pendingEvent = null;
    delete GameState.nextWaterGood;
    delete GameState.nextLocationBetter;
    GameState.currentLocation = generateLocation(0);
    clearLog();
    clearEventPanel();
    ui.gameOverPanel.style.display = 'none';
    enableActions();
    updateUI();
    displayLocation();
    log('🚀 The caravan emerges from the bunker. Find a new home.');
  }

  // ---------- 16. LOAD JSON & INIT ----------
  async function loadGameData() {
    try {
      const base = window.SETTLERFRONTIER_BASE || '/assets/settlerfrontier/';
      const [eventsResp, featuresResp] = await Promise.all([
        fetch(base + 'events.json'),
        fetch(base + 'features.json')
      ]);
      const rawEvents = await eventsResp.json();
      const rawFeatures = await featuresResp.json();
      // ... rest unchanged
      EVENT_LIST = buildEventObjects(rawEvents);
      TERRARIAN_FEATURES = buildFeatureObjects(rawFeatures);

      // Enable UI now that data is loaded
      ui.eventPanelDescription.textContent = 'No active event.';
      ui.moveBtn.disabled = false;
      ui.settleBtn.disabled = false;
      console.log('✅ Game data loaded.');
    } catch (err) {
      console.error('Failed to load game data:', err);
      ui.eventPanelDescription.textContent = 'Error loading game data. Please refresh.';
    }
  }

  // ---------- 17. DOM READY ----------
  document.addEventListener('DOMContentLoaded', function() {
    ui = {
      menuScreen: document.getElementById('gameMenuScreen'),
      backstoryOverlay: document.getElementById('backstoryOverlay'),
      gameScreen: document.getElementById('gameScreen'),
      settlers: document.getElementById('settlersValue'),
      condition: document.getElementById('conditionValue'),
      unity: document.getElementById('unityValue'),
      equipment: document.getElementById('equipmentValue'),
      moves: document.getElementById('movesValue'),
      water: document.getElementById('waterValue'),
      climate: document.getElementById('climateValue'),
      resources: document.getElementById('resourcesValue'),
      radiation: document.getElementById('radiationValue'),
      moveBtn: document.getElementById('moveBtn'),
      settleBtn: document.getElementById('settleBtn'),
      scanBtn: document.getElementById('scanBtn'),
      restartBtn: document.getElementById('restartBtn'),
      eventPanelDescription: document.getElementById('eventPanelDescription'),
      eventPanelChoices: document.getElementById('eventPanelChoices'),
      terrarianStatus: document.getElementById('terrarianStatus'),
      terrarianList: document.getElementById('terrarianList'),
      gameLog: document.getElementById('gameLog'),
      gameOverPanel: document.getElementById('gameOverPanel'),
      finalScore: document.getElementById('finalScore'),
      seedInput: document.getElementById('seedInput'),
      currentSeedDisplay: document.getElementById('currentSeedDisplay'),
      gameSeedDisplay: document.getElementById('gameSeedDisplay')
    };

    // Load JSON data first
    loadGameData();

    // Seed UI
    document.getElementById('randomSeedBtn').addEventListener('click', () => {
      const randomStr = Math.random().toString(36).substring(2, 10);
      ui.seedInput.value = randomStr;
      ui.currentSeedDisplay.textContent = hashStringToSeed(randomStr);
    });
    document.getElementById('useSeedBtn').addEventListener('click', () => {
      const seedStr = ui.seedInput.value;
      ui.currentSeedDisplay.textContent = hashStringToSeed(seedStr);
    });

    // Navigation
    document.getElementById('manualModeBtn').addEventListener('click', () => {
      ui.menuScreen.style.display = 'none';
      ui.backstoryOverlay.style.display = 'block';
      ui.currentSeedDisplay.textContent = Date.now();
      ui.seedInput.value = '';
    });
    document.getElementById('botModeBtn').addEventListener('click', () => {
      alert('🤖 Bot Mode will be added soon. Stay tuned!');
    });
    document.getElementById('startGameBtn').addEventListener('click', () => {
      ui.backstoryOverlay.style.display = 'none';
      ui.gameScreen.style.display = 'block';
      startNewGame(ui.seedInput.value || null);
    });
    ui.restartBtn.addEventListener('click', () => {
      ui.gameScreen.style.display = 'block';
      startNewGame(ui.seedInput.value || null);
    });

    ui.moveBtn.addEventListener('click', moveToNextLocation);
    ui.settleBtn.addEventListener('click', settle);
    ui.scanBtn.addEventListener('click', scanLocation);
  });
})();