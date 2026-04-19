/************************************************************
 * CARAVAN SURVIVAL – FULL JS GENERATED UI
 * Menu → Manual (with backstory) / Bot (placeholder)
 * All HTML created dynamically. No external IDs needed.
 ************************************************************/

// ========== 1. GAME STATE & CONSTANTS ==========
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

const QUALITY = { GOOD: 'good', OK: 'ok', BAD: 'bad' };

const WATER_LABELS = {
  good: 'Natural Spring / River',
  ok: 'Pond / Lake',
  bad: 'Non‑existent / Shallow Puddle'
};
const CLIMATE_LABELS = {
  good: 'Tropical / Oceanic',
  ok: 'Savanna / Tundra',
  bad: 'Desert / Arctic'
};
const RESOURCES_LABELS = {
  good: 'Abundant',
  ok: 'Salvageable Wreckages',
  bad: 'Scarce / Non‑existent'
};
const RADIATION_LABELS = {
  good: 'Low',
  ok: 'Medium',
  bad: 'High'
};

// ========== 2. UTILITY FUNCTIONS ==========
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getEventProbability(moves) {
  return Math.exp(0.2 * moves);
}

function rollForEvent(moves) {
  return Math.random() < Math.min(getEventProbability(moves), 1.0);
}

// ========== 3. LOCATION GENERATION ==========
function generateLocation(moves) {
  const attrs = ['water', 'climate', 'resources', 'radiation'];
  const location = {};
  attrs.forEach(attr => {
    const roll = Math.random();
    if (roll < 0.33) location[attr] = QUALITY.GOOD;
    else if (roll < 0.66) location[attr] = QUALITY.OK;
    else location[attr] = QUALITY.BAD;
  });
  return location;
}

// ========== 4. EVENT SYSTEM ==========
const EVENT_LIST = [
  {
    name: 'Quarrel',
    description: 'A heated argument breaks out among the settlers.',
    effect: (state) => { state.unity = clamp(state.unity - 10, 0, Infinity); return `Unity decreased by 10%.`; },
    hasChoice: false
  },
  {
    name: 'Bad Weather',
    description: 'A sudden storm catches the caravan off guard.',
    effect: (state) => { const loss = randomInt(20, 30); state.settlers = Math.max(0, state.settlers - loss); return `${loss} settlers perished in the storm.`; },
    hasChoice: false
  },
  {
    name: 'Poor Maintenance',
    description: 'The landbase shows signs of neglect.',
    effect: (state) => { state.condition = clamp(state.condition - 5, 0, Infinity); return `Landbase condition decreased by 5%.`; },
    hasChoice: false
  },
  {
    name: 'Friendly Wanderers',
    description: 'A group of survivors asks to join the caravan.',
    effect: (state) => { const gain = randomInt(10, 20); state.settlers += gain; return `${gain} settlers joined the caravan.`; },
    hasChoice: false
  },
  {
    name: 'Song and Dance',
    description: 'Someone starts a tune, lifting spirits.',
    effect: (state) => { state.unity = clamp(state.unity + 5, 0, Infinity); return `Unity increased by 5%.`; },
    hasChoice: false
  },
  {
    name: 'Minor Mishap',
    description: 'A small accident causes losses.',
    effect: (state) => {
      const loss = randomInt(5, 20);
      state.settlers = Math.max(0, state.settlers - loss);
      state.unity = clamp(state.unity - 5, 0, Infinity);
      return `${loss} settlers lost, unity decreased by 5%.`;
    },
    hasChoice: false
  },
  {
    name: 'Refugee Wave',
    description: 'A large group of desperate survivors wants to join.',
    hasChoice: true,
    choices: [
      { text: 'Accept them (+100 settlers, -20% unity)', effect: (state) => { state.settlers += 100; state.unity = clamp(state.unity - 20, 0, Infinity); return '100 settlers joined, unity dropped 20%.'; } },
      { text: 'Refuse them (no change)', effect: (state) => 'You turned them away.' }
    ]
  },
  {
    name: 'Hidden Spring',
    description: 'A scout claims there is a reliable water source ahead, but the path is rough.',
    hasChoice: true,
    choices: [
      { text: 'Take the rough path (-5% condition, next location water = Good)', effect: (state) => { state.condition = clamp(state.condition - 5, 0, Infinity); state.nextWaterGood = true; return 'Condition reduced by 5%, but the next area will have good water.'; } },
      { text: 'Ignore and continue normally', effect: (state) => 'You stay on the main route.' }
    ]
  },
  {
    name: 'Landslide',
    description: 'A landslide blocks the road.',
    hasChoice: true,
    choices: [
      { text: 'Clear it manually (lose 20‑50 settlers)', effect: (state) => { const loss = randomInt(20, 50); state.settlers = Math.max(0, state.settlers - loss); return `${loss} settlers died clearing the path.`; } },
      { text: 'Find a detour (-10% condition)', effect: (state) => { state.condition = clamp(state.condition - 10, 0, Infinity); return 'Condition reduced by 10%.'; } }
    ]
  },
  {
    name: 'Shortcut',
    description: 'A risky shortcut could save time but may damage the landbase.',
    hasChoice: true,
    choices: [
      { text: 'Take safe path (no change)', effect: (state) => 'You proceed cautiously.' },
      { text: 'Take shortcut (condition -1‑10%, but next location better)', effect: (state) => { const loss = randomInt(1, 10); state.condition = clamp(state.condition - loss, 0, Infinity); state.nextLocationBetter = true; return `Condition reduced by ${loss}%, but the next area looks promising.`; } }
    ]
  }
];

function triggerRandomEvent(state) {
  return EVENT_LIST[Math.floor(Math.random() * EVENT_LIST.length)];
}

// ========== 5. CORE GAME ACTIONS ==========
function applyLocationGeneration(state) {
  let location = generateLocation(state.moves);
  if (state.nextWaterGood) {
    location.water = QUALITY.GOOD;
    delete state.nextWaterGood;
  }
  if (state.nextLocationBetter) {
    const tierOrder = [QUALITY.BAD, QUALITY.OK, QUALITY.GOOD];
    ['water', 'climate', 'resources', 'radiation'].forEach(attr => {
      const current = location[attr];
      const idx = tierOrder.indexOf(current);
      if (idx < tierOrder.length - 1) location[attr] = tierOrder[idx + 1];
    });
    delete state.nextLocationBetter;
  }
  return location;
}

// These will be defined after UI creation
let ui = {};

function moveToNextLocation() {
  if (!GameState.isActive || GameState.gameOver) return;

  GameState.moves++;
  let eventTriggered = false;
  if (rollForEvent(GameState.moves)) {
    const event = triggerRandomEvent(GameState);
    if (event.hasChoice) {
      GameState.pendingEvent = event;
      showEventChoiceUI(event);
      eventTriggered = true;
    } else {
      const message = event.effect(GameState);
      log(`📌 Event: ${event.name} – ${message}`);
    }
  }

  if (!eventTriggered) {
    GameState.currentLocation = applyLocationGeneration(GameState);
    log(`📍 Moved to a new location.`);
    displayLocation();
  }

  updateUI();
  checkGameOver();
}

function settle() {
  if (!GameState.isActive || GameState.gameOver) return;

  const moves = Math.min(GameState.moves, 30);
  const minVal = Math.max(0, 100 - (100 / 30) * moves);
  const randomNum = minVal + Math.random() * 50;

  let deathChange = 0;
  let outcomeMessage = '';
  if (randomNum > 100) { deathChange = 30; outcomeMessage = 'The land is harsh and unforgiving.'; }
  else if (randomNum >= 40) { deathChange = -30; outcomeMessage = 'The area seems survivable.'; }
  else { deathChange = 0; outcomeMessage = 'A near‑perfect location!'; }

  GameState.settlers = Math.max(0, GameState.settlers - deathChange);

  const loc = GameState.currentLocation;
  let qualityBonus = 1.0;
  if (loc.water === QUALITY.GOOD) qualityBonus *= 1.2;
  if (loc.climate === QUALITY.GOOD) qualityBonus *= 1.2;
  if (loc.resources === QUALITY.GOOD) qualityBonus *= 1.2;
  if (loc.radiation === QUALITY.GOOD) qualityBonus *= 1.2;

  const finalScore = Math.floor(GameState.settlers * (GameState.unity / 100) * (GameState.condition / 100) * 1000 * qualityBonus);

  GameState.isActive = false;
  GameState.gameOver = true;

  log(`🏁 Settlement attempted. ${outcomeMessage}`);
  log(`📊 Final Score: ${finalScore}`);

  ui.finalScore.textContent = `Final Score: ${finalScore}`;
  ui.gameOverPanel.style.display = 'block';
  ui.moveBtn.disabled = true;
  ui.settleBtn.disabled = true;

  updateUI();
}

// ========== 6. UI UPDATE FUNCTIONS (depend on ui object) ==========
function updateUI() {
  ui.settlers.textContent = GameState.settlers;
  ui.condition.textContent = GameState.condition;
  ui.unity.textContent = GameState.unity;
  ui.equipment.textContent = GameState.equipment;
  ui.moves.textContent = GameState.moves;
}

function displayLocation() {
  const loc = GameState.currentLocation;
  if (!loc) return;
  ui.water.textContent = WATER_LABELS[loc.water];
  ui.climate.textContent = CLIMATE_LABELS[loc.climate];
  ui.resources.textContent = RESOURCES_LABELS[loc.resources];
  ui.radiation.textContent = RADIATION_LABELS[loc.radiation];
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

function showEventChoiceUI(event) {
  ui.eventContainer.style.display = 'block';
  ui.eventDesc.textContent = event.description;
  ui.eventChoices.innerHTML = '';

  event.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice.text;
    btn.style.margin = '5px';
    btn.addEventListener('click', () => {
      const message = choice.effect(GameState);
      log(`📌 Event: ${event.name} – ${message}`);
      GameState.currentLocation = applyLocationGeneration(GameState);
      displayLocation();
      ui.eventContainer.style.display = 'none';
      GameState.pendingEvent = null;
      updateUI();
      checkGameOver();
    });
    ui.eventChoices.appendChild(btn);
  });

  ui.moveBtn.disabled = true;
  ui.settleBtn.disabled = true;
}

function checkGameOver() {
  if (GameState.settlers <= 0) {
    GameState.isActive = false;
    GameState.gameOver = true;
    log('💀 All settlers have perished. The journey ends.');
    ui.gameOverPanel.style.display = 'block';
    ui.finalScore.textContent = 'Score: 0';
    ui.moveBtn.disabled = true;
    ui.settleBtn.disabled = true;
  }
  if (!GameState.pendingEvent && GameState.isActive) {
    ui.moveBtn.disabled = false;
    ui.settleBtn.disabled = false;
  }
}

// ========== 7. BUILD ENTIRE UI WITH JAVASCRIPT ==========
function buildUI() {
  // Clear body or create a container
  document.body.innerHTML = '';
  document.body.style.cssText = 'background:#1e1e1e; color:#eee; font-family:system-ui; padding:20px;';

  const app = document.createElement('div');
  app.id = 'game-app';
  document.body.appendChild(app);

  // ----- MENU SCREEN -----
  const menuDiv = document.createElement('div');
  menuDiv.id = 'menuScreen';
  menuDiv.style.textAlign = 'center';
  menuDiv.innerHTML = `
    <h1>🚐 Caravan Survival</h1>
    <p>Choose your mode:</p>
    <button id="manualModeBtn" style="font-size:1.5rem; padding:10px 30px; margin:10px;">🕹️ Manual Mode</button>
    <button id="botModeBtn" style="font-size:1.5rem; padding:10px 30px; margin:10px;">🤖 Bot Mode (Coming Soon)</button>
  `;
  app.appendChild(menuDiv);

  // ----- BACKSTORY MODAL (hidden initially) -----
  const backstoryOverlay = document.createElement('div');
  backstoryOverlay.id = 'backstoryOverlay';
  backstoryOverlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:none; justify-content:center; align-items:center; z-index:100;';
  backstoryOverlay.innerHTML = `
    <div style="background:#2a2a2a; max-width:600px; padding:30px; border-radius:16px; text-align:center;">
      <h2>🌄 The Surface</h2>
      <p>The bunker doors grind open. Resources are gone. You lead 1,000 settlers into the unknown, seeking a new permanent home. The landbase is intact, spirits are high, but the wasteland is unpredictable.</p>
      <p>Guide them wisely.</p>
      <button id="startGameBtn" style="margin-top:20px; padding:10px 30px;">Begin Journey</button>
    </div>
  `;
  document.body.appendChild(backstoryOverlay);

  // ----- GAME UI (hidden initially) -----
  const gameDiv = document.createElement('div');
  gameDiv.id = 'gameScreen';
  gameDiv.style.display = 'none';
  gameDiv.innerHTML = `
    <div class="game-panel" style="max-width:800px; margin:0 auto;">
      <h2>Caravan Status</h2>
      <p>👥 Settlers: <span id="settlersValue">1000</span></p>
      <p>🚐 Landbase Condition: <span id="conditionValue">100</span>%</p>
      <p>🤝 Unity: <span id="unityValue">100</span>%</p>
      <p>🔬 Analysis Equipment: <span id="equipmentValue">10</span></p>
      <p>📅 Moves Taken: <span id="movesValue">0</span></p>

      <h2>Current Location</h2>
      <p>💧 Water: <span id="waterValue"></span></p>
      <p>🌡️ Climate: <span id="climateValue"></span></p>
      <p>📦 Resources: <span id="resourcesValue"></span></p>
      <p>☢️ Radiation: <span id="radiationValue"></span></p>

      <div style="margin:20px 0;">
        <button id="moveBtn">🚶 Move to Next Location</button>
        <button id="settleBtn">🏠 Attempt Settlement</button>
      </div>

      <div id="eventContainer" style="display:none; background:#2a2a2a; border:1px solid #b99b6b; padding:15px; border-radius:8px; margin:15px 0;">
        <h3>Event</h3>
        <p id="eventDescription"></p>
        <div id="eventChoices"></div>
      </div>

      <h2>Log</h2>
      <div id="gameLog" style="background:#0f0f0f; border:1px solid #333; padding:10px; height:150px; overflow-y:auto; font-family:monospace; border-radius:6px;"></div>

      <div id="gameOverPanel" style="display:none; margin-top:20px; text-align:center;">
        <h2>Journey Complete</h2>
        <p id="finalScore"></p>
        <button id="restartBtn">🔄 Start New Journey</button>
      </div>
    </div>
  `;
  app.appendChild(gameDiv);

  // Store UI element references
  ui = {
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
    restartBtn: document.getElementById('restartBtn'),
    eventContainer: document.getElementById('eventContainer'),
    eventDesc: document.getElementById('eventDescription'),
    eventChoices: document.getElementById('eventChoices'),
    gameLog: document.getElementById('gameLog'),
    gameOverPanel: document.getElementById('gameOverPanel'),
    finalScore: document.getElementById('finalScore')
  };

  // Wire up menu buttons
  document.getElementById('manualModeBtn').addEventListener('click', () => {
    menuDiv.style.display = 'none';
    backstoryOverlay.style.display = 'flex';
  });

  document.getElementById('botModeBtn').addEventListener('click', () => {
    alert('Bot Mode will be implemented later. Stay tuned!');
  });

  // Backstory "Begin Journey" button
  document.getElementById('startGameBtn').addEventListener('click', () => {
    backstoryOverlay.style.display = 'none';
    gameDiv.style.display = 'block';
    startNewGame();
  });

  // Restart button
  ui.restartBtn.addEventListener('click', () => {
    startNewGame();
  });

  // Action buttons
  ui.moveBtn.addEventListener('click', moveToNextLocation);
  ui.settleBtn.addEventListener('click', settle);
}

// ========== 8. GAME INITIALIZATION ==========
function startNewGame() {
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

  // Generate first location (not unknown)
  GameState.currentLocation = generateLocation(0);

  clearLog();
  ui.gameOverPanel.style.display = 'none';
  ui.eventContainer.style.display = 'none';
  ui.moveBtn.disabled = false;
  ui.settleBtn.disabled = false;

  updateUI();
  displayLocation();
  log('🚀 The caravan emerges from the bunker. Find a new home.');
}

// ========== 9. KICK OFF ==========
document.addEventListener('DOMContentLoaded', buildUI);