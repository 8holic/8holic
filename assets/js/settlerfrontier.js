/************************************************************
 * CARAVAN SURVIVAL – MANUAL MODE
 * Post‑apocalyptic settlement search
 * 
 * Sections:
 * 1. Game State & Constants
 * 2. Utility Functions
 * 3. Location Generation
 * 4. Event System
 * 5. Core Game Actions (Move, Settle)
 * 6. UI Update Functions
 * 7. Event Handlers & Initialization
 ************************************************************/

// ========== 1. GAME STATE & CONSTANTS ==========
const GameState = {
  settlers: 1000,
  condition: 100,      // landbase condition %
  unity: 100,          // cohesion %
  equipment: 10,       // analysis equipment count
  moves: 0,
  isActive: false,
  gameOver: false,
  currentLocation: null,   // will hold location object
  pendingEvent: null       // for events requiring choice
};

// Quality tiers for location attributes
const QUALITY = {
  GOOD: 'good',
  OK: 'ok',
  BAD: 'bad'
};

// Attribute display mappings
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

// Exponential event probability: y = e^(0.2 * moves)
function getEventProbability(moves) {
  return Math.exp(0.2 * moves);
}

function rollForEvent(moves) {
  const prob = getEventProbability(moves);
  // Cap at 100% for high move counts, but probability can exceed 1
  return Math.random() < Math.min(prob, 1.0);
}

// ========== 3. LOCATION GENERATION ==========
function generateLocation(moves) {
  // For now, attributes are random; later can bias based on moves if desired
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
// Event definitions – expandable array of objects
const EVENT_LIST = [
  // 6 non‑choice events
  {
    name: 'Quarrel',
    description: 'A heated argument breaks out among the settlers.',
    effect: (state) => {
      state.unity = clamp(state.unity - 10, 0, Infinity);
      return `Unity decreased by 10%.`;
    },
    hasChoice: false
  },
  {
    name: 'Bad Weather',
    description: 'A sudden storm catches the caravan off guard.',
    effect: (state) => {
      const loss = randomInt(20, 30);
      state.settlers = Math.max(0, state.settlers - loss);
      return `${loss} settlers perished in the storm.`;
    },
    hasChoice: false
  },
  {
    name: 'Poor Maintenance',
    description: 'The landbase shows signs of neglect.',
    effect: (state) => {
      state.condition = clamp(state.condition - 5, 0, Infinity);
      return `Landbase condition decreased by 5%.`;
    },
    hasChoice: false
  },
  {
    name: 'Friendly Wanderers',
    description: 'A group of survivors asks to join the caravan.',
    effect: (state) => {
      const gain = randomInt(10, 20);
      state.settlers += gain;
      return `${gain} settlers joined the caravan.`;
    },
    hasChoice: false
  },
  {
    name: 'Song and Dance',
    description: 'Someone starts a tune, lifting spirits.',
    effect: (state) => {
      state.unity = clamp(state.unity + 5, 0, Infinity);
      return `Unity increased by 5%.`;
    },
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
  // 4 choice events
  {
    name: 'Refugee Wave',
    description: 'A large group of desperate survivors wants to join.',
    hasChoice: true,
    choices: [
      {
        text: 'Accept them (+100 settlers, -20% unity)',
        effect: (state) => {
          state.settlers += 100;
          state.unity = clamp(state.unity - 20, 0, Infinity);
          return '100 settlers joined, unity dropped 20%.';
        }
      },
      {
        text: 'Refuse them (no change)',
        effect: (state) => {
          return 'You turned them away.';
        }
      }
    ]
  },
  {
    name: 'Hidden Spring',
    description: 'A scout claims there is a reliable water source ahead, but the path is rough.',
    hasChoice: true,
    choices: [
      {
        text: 'Take the rough path (-5% condition, next location water = Good)',
        effect: (state) => {
          state.condition = clamp(state.condition - 5, 0, Infinity);
          // Mark that next location water is guaranteed good
          state.nextWaterGood = true;
          return 'Condition reduced by 5%, but the next area will have good water.';
        }
      },
      {
        text: 'Ignore and continue normally',
        effect: (state) => {
          return 'You stay on the main route.';
        }
      }
    ]
  },
  {
    name: 'Landslide',
    description: 'A landslide blocks the road.',
    hasChoice: true,
    choices: [
      {
        text: 'Clear it manually (lose 20‑50 settlers)',
        effect: (state) => {
          const loss = randomInt(20, 50);
          state.settlers = Math.max(0, state.settlers - loss);
          return `${loss} settlers died clearing the path.`;
        }
      },
      {
        text: 'Find a detour (-10% condition)',
        effect: (state) => {
          state.condition = clamp(state.condition - 10, 0, Infinity);
          return 'Condition reduced by 10%.';
        }
      }
    ]
  },
  {
    name: 'Shortcut',
    description: 'A risky shortcut could save time but may damage the landbase.',
    hasChoice: true,
    choices: [
      {
        text: 'Take safe path (no change)',
        effect: (state) => {
          return 'You proceed cautiously.';
        }
      },
      {
        text: 'Take shortcut (condition -1‑10%, but next location better)',
        effect: (state) => {
          const loss = randomInt(1, 10);
          state.condition = clamp(state.condition - loss, 0, Infinity);
          // Mark that next location attributes will be improved
          state.nextLocationBetter = true;
          return `Condition reduced by ${loss}%, but the next area looks promising.`;
        }
      }
    ]
  }
];

function triggerRandomEvent(state) {
  // Filter out any special event flags? We just pick a random event.
  const event = EVENT_LIST[Math.floor(Math.random() * EVENT_LIST.length)];
  return event;
}

// ========== 5. CORE GAME ACTIONS ==========
function applyLocationGeneration(state) {
  let location = generateLocation(state.moves);
  // Apply any special flags from previous events
  if (state.nextWaterGood) {
    location.water = QUALITY.GOOD;
    delete state.nextWaterGood;
  }
  if (state.nextLocationBetter) {
    // Improve all attributes by one tier if possible
    const tierOrder = [QUALITY.BAD, QUALITY.OK, QUALITY.GOOD];
    ['water', 'climate', 'resources', 'radiation'].forEach(attr => {
      const current = location[attr];
      const idx = tierOrder.indexOf(current);
      if (idx < tierOrder.length - 1) {
        location[attr] = tierOrder[idx + 1];
      }
    });
    delete state.nextLocationBetter;
  }
  return location;
}

function moveToNextLocation() {
  if (!GameState.isActive || GameState.gameOver) return;

  // Increment moves
  GameState.moves++;
  
  // Check for event
  let eventTriggered = false;
  if (rollForEvent(GameState.moves)) {
    const event = triggerRandomEvent(GameState);
    if (event.hasChoice) {
      // Pause game and show choices
      GameState.pendingEvent = event;
      showEventChoiceUI(event);
      eventTriggered = true;
    } else {
      // Apply non‑choice event immediately
      const message = event.effect(GameState);
      log(`📌 Event: ${event.name} – ${message}`);
    }
  }

  if (!eventTriggered) {
    // No event, just generate new location
    GameState.currentLocation = applyLocationGeneration(GameState);
    log(`📍 Moved to a new location.`);
    displayLocation();
  }

  updateUI();
  checkGameOver();
}

function settle() {
  if (!GameState.isActive || GameState.gameOver) return;
  
  // Use the death calculation formula
  const moves = Math.min(GameState.moves, 30);
  const minVal = Math.max(0, 100 - (100 / 30) * moves);
  const randomNum = minVal + Math.random() * 50;
  
  let deathChange = 0;
  let outcomeMessage = '';
  
  if (randomNum > 100) {
    deathChange = 30;
    outcomeMessage = 'The land is harsh and unforgiving.';
  } else if (randomNum >= 40) {
    deathChange = -30;
    outcomeMessage = 'The area seems survivable.';
  } else {
    deathChange = 0;
    outcomeMessage = 'A near‑perfect location!';
  }
  
  // Apply death change (can be negative, meaning fewer deaths than baseline?)
  // Interpretation: deathChange is added to a base death count? The spec says:
  // "Number of people that will die if we settle" – the formula gives a modifier.
  // We'll assume base deaths are 0, and deathChange directly modifies settler count.
  // Negative deathChange reduces deaths, but we can't have negative deaths.
  // We'll implement: if deathChange positive, settlers die; if negative, we save that many from an implied baseline? 
  // For simplicity, we'll treat deathChange as the number of settlers lost (positive = loss, negative = gain? That doesn't make sense.)
  // Clarify: The sample function returns deathChange with +30 (bad), -30 (good). 
  // Likely meaning: +30 means 30 *additional* deaths beyond normal. Since we haven't defined normal deaths, we can just apply the deathChange directly as settlers lost (positive) or saved (negative means fewer deaths, i.e., settlers increase).
  // We'll do: settlers = settlers - deathChange (if deathChange positive, settlers decrease; if negative, settlers increase because fewer died than expected).
  GameState.settlers = Math.max(0, GameState.settlers - deathChange);
  
  // Determine settlement quality based on location attributes
  const loc = GameState.currentLocation;
  let qualityBonus = 1.0;
  if (loc.water === QUALITY.GOOD) qualityBonus *= 1.2;
  if (loc.climate === QUALITY.GOOD) qualityBonus *= 1.2;
  if (loc.resources === QUALITY.GOOD) qualityBonus *= 1.2;
  if (loc.radiation === QUALITY.GOOD) qualityBonus *= 1.2;
  
  // Final score calculation
  const finalScore = Math.floor(GameState.settlers * (GameState.unity / 100) * (GameState.condition / 100) * 1000 * qualityBonus);
  
  GameState.isActive = false;
  GameState.gameOver = true;
  
  log(`🏁 Settlement attempted. ${outcomeMessage}`);
  log(`📊 Final Score: ${finalScore}`);
  
  // Show game over panel
  document.getElementById('finalScore').textContent = `Final Score: ${finalScore}`;
  document.getElementById('gameOverPanel').style.display = 'block';
  document.getElementById('moveBtn').disabled = true;
  document.getElementById('settleBtn').disabled = true;
  
  updateUI();
}

// ========== 6. UI UPDATE FUNCTIONS ==========
function updateUI() {
  document.getElementById('settlersValue').textContent = GameState.settlers;
  document.getElementById('conditionValue').textContent = GameState.condition;
  document.getElementById('unityValue').textContent = GameState.unity;
  document.getElementById('equipmentValue').textContent = GameState.equipment;
  document.getElementById('movesValue').textContent = GameState.moves;
}

function displayLocation() {
  const loc = GameState.currentLocation;
  if (!loc) return;
  document.getElementById('waterValue').textContent = WATER_LABELS[loc.water];
  document.getElementById('climateValue').textContent = CLIMATE_LABELS[loc.climate];
  document.getElementById('resourcesValue').textContent = RESOURCES_LABELS[loc.resources];
  document.getElementById('radiationValue').textContent = RADIATION_LABELS[loc.radiation];
}

function log(message) {
  const logDiv = document.getElementById('gameLog');
  const entry = document.createElement('div');
  entry.textContent = message;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
}

function clearLog() {
  document.getElementById('gameLog').innerHTML = '';
}

function showEventChoiceUI(event) {
  const container = document.getElementById('eventContainer');
  const desc = document.getElementById('eventDescription');
  const choicesDiv = document.getElementById('eventChoices');
  
  desc.textContent = event.description;
  choicesDiv.innerHTML = '';
  
  event.choices.forEach((choice, index) => {
    const btn = document.createElement('button');
    btn.textContent = choice.text;
    btn.addEventListener('click', () => {
      // Apply chosen effect
      const message = choice.effect(GameState);
      log(`📌 Event: ${event.name} – ${message}`);
      // After choice, generate next location (event happened during move)
      GameState.currentLocation = applyLocationGeneration(GameState);
      displayLocation();
      // Hide event UI
      container.style.display = 'none';
      GameState.pendingEvent = null;
      updateUI();
      checkGameOver();
    });
    choicesDiv.appendChild(btn);
  });
  
  container.style.display = 'block';
  // Disable action buttons while event is pending
  document.getElementById('moveBtn').disabled = true;
  document.getElementById('settleBtn').disabled = true;
}

function checkGameOver() {
  if (GameState.settlers <= 0) {
    GameState.isActive = false;
    GameState.gameOver = true;
    log('💀 All settlers have perished. The journey ends.');
    document.getElementById('gameOverPanel').style.display = 'block';
    document.getElementById('finalScore').textContent = 'Score: 0';
    document.getElementById('moveBtn').disabled = true;
    document.getElementById('settleBtn').disabled = true;
  }
  // Re‑enable buttons if no pending event
  if (!GameState.pendingEvent && GameState.isActive) {
    document.getElementById('moveBtn').disabled = false;
    document.getElementById('settleBtn').disabled = false;
  }
}

// ========== 7. EVENT HANDLERS & INITIALIZATION ==========
function startNewGame() {
  // Reset state
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
  
  // Generate first location
  GameState.currentLocation = generateLocation(0);
  
  // Clear UI
  clearLog();
  document.getElementById('gameOverPanel').style.display = 'none';
  document.getElementById('eventContainer').style.display = 'none';
  document.getElementById('moveBtn').disabled = false;
  document.getElementById('settleBtn').disabled = false;
  
  updateUI();
  displayLocation();
  log('🚀 The caravan emerges from the bunker. Find a new home.');
}

function init() {
  // Wire buttons
  document.getElementById('moveBtn').addEventListener('click', moveToNextLocation);
  document.getElementById('settleBtn').addEventListener('click', settle);
  document.getElementById('restartBtn').addEventListener('click', () => {
    startNewGame();
  });
  
  // Start game
  startNewGame();
}

// Start when DOM ready
document.addEventListener('DOMContentLoaded', init);