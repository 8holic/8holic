/************************************************************
 * CARAVAN SURVIVAL – HTML + JS HYBRID (COMPLETE)
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

// ========== 4. EVENT SYSTEM (FULL LIST) ==========
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

// ========== 6. UI ELEMENT REFERENCES ==========
let ui = {};

// ========== 7. UI UPDATE FUNCTIONS ==========
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
    btn.classList.add('game-btn', 'event-choice-btn');
    btn.addEventListener('click', () => {
      const message = choice.effect(GameState);
      log(`📌 Event: ${event.name} – ${message}`);
      GameState.currentLocation = applyLocationGeneration(GameState);
      displayLocation();
      ui.eventContainer.style.display = 'none';
      GameState.pendingEvent = null;
      updateUI();
      checkGameOver();
      ui.moveBtn.disabled = false;
      ui.settleBtn.disabled = false;
    });
    ui.eventChoices.appendChild(btn);
  });

  ui.moveBtn.disabled = true;
  ui.settleBtn.disabled = true;
}

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

// ========== 9. DOM READY – ATTACH LISTENERS ==========
document.addEventListener('DOMContentLoaded', function() {
  console.log('Caravan Survival: Initializing UI...');

  // Cache all UI elements
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
    restartBtn: document.getElementById('restartBtn'),

    eventContainer: document.getElementById('eventContainer'),
    eventDesc: document.getElementById('eventDescription'),
    eventChoices: document.getElementById('eventChoices'),

    gameLog: document.getElementById('gameLog'),
    gameOverPanel: document.getElementById('gameOverPanel'),
    finalScore: document.getElementById('finalScore')
  };

  // Verify all elements were found
  for (let key in ui) {
    if (!ui[key]) {
      console.error(`Missing UI element: ${key}`);
    }
  }

  // Wire up menu buttons
  const manualBtn = document.getElementById('manualModeBtn');
  if (manualBtn) {
    manualBtn.addEventListener('click', function() {
      console.log('Manual Mode clicked');
      ui.menuScreen.style.display = 'none';
      ui.backstoryOverlay.style.display = 'flex';
    });
  } else {
    console.error('Button #manualModeBtn not found');
  }

  const botBtn = document.getElementById('botModeBtn');
  if (botBtn) {
    botBtn.addEventListener('click', function() {
      alert('Bot Mode will be implemented later. Stay tuned!');
    });
  }

  const startBtn = document.getElementById('startGameBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      ui.backstoryOverlay.style.display = 'none';
      ui.gameScreen.style.display = 'block';
      startNewGame();
    });
  }

  ui.restartBtn.addEventListener('click', function() {
    ui.gameScreen.style.display = 'block';
    startNewGame();
  });

  ui.moveBtn.addEventListener('click', moveToNextLocation);
  ui.settleBtn.addEventListener('click', settle);

  console.log('Caravan Survival: Ready.');
});