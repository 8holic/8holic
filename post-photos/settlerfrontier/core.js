/************************************************************
 * CARAVAN SURVIVAL – SIMPLIFIED (single scanner, 4 attributes)
 ************************************************************/
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
let BIOME_LOCATION_RANGES = [];

function whenGameDataReady() {
  return window.settlerfrontierDataReady || Promise.resolve();
}


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
let MILESTONE_POOL = [];
let MILESTONE_RAW = [];

// ---------- 3. GAME STATE (single scanner, 4 attributes) ----------
const GameState = {
    settlers: 1000,
    scanner: 100,
    unity: 100,
    knowledge: 100,

    moves: 0,

    currentBiome: 0,
    milestoneStage: 0,

    capabilities: [],

    isActive: false,
    gameOver: false,

    currentLocation: null,

    pendingEvent: null,
    eventQueue: [],

    permanentEquipmentModifiers: {},


};

// ---------- 4. UTILITIES ----------
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resolveDelta(delta) {
    if (typeof delta === 'object') {
        return seededRandomInt(delta.min, delta.max);
    }
    return delta;
}

function applyStatEffect(state, eff) {
    const delta = resolveDelta(eff.delta);

    state[eff.type] = clamp(
        state[eff.type] + delta,
        0,
        Infinity
    );

    if (eff.message) {
        return eff.message.replace('{delta}', Math.abs(delta));
    }

    const labels = {
        settlers: 'settlers',
        scanner: 'Scanner',
        unity: 'Unity',
        knowledge: 'Knowledge'
    };

    return `${labels[eff.type]} changed by ${delta}.`;
}

function applyLocationEffect(state, eff) {
    const delta = resolveDelta(eff.delta);

    const target = eff.permanent
        ? 'permanentEquipmentModifiers'
        : 'locationModifiers';

    if (!state[target]) {
        state[target] = {};
    }

    if (!state[target][eff.type]) {
        state[target][eff.type] = 0;
    }

    state[target][eff.type] += delta;

    if (eff.message) {
        return eff.message.replace('{delta}', Math.abs(delta));
    }

    return `${eff.type} modified by ${delta}.`;
}

function applyEffects(state, effects) {
    let message = '';

    effects.forEach(eff => {

        if (
            eff.type === 'settlers' ||
            eff.type === 'scanner' ||
            eff.type === 'unity' ||
            eff.type === 'knowledge'
        ) {

            message = applyStatEffect(state, eff);

        } else if (
            LOCATION_ATTRIBUTES.includes(eff.type)
        ) {

            message = applyLocationEffect(state, eff);

        }

    });

    return message || 'No immediate effect.';
}

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
function buildMilestoneObjects(rawMilestones) {
  return rawMilestones.map(raw => ({
    name: raw.name,
    description: raw.description,
    kind: 'milestone',
    hasChoice: raw.hasChoice || false,
    pairOptions: raw.pairOptions || []
  }));
}
// ---------- 5. LOCATION GENERATION (4 attributes, wider curve) ----------
const LOCATION_ATTRIBUTES = ['waterSupply', 'land', 'temperature', 'radiation'];



function generateLocation(biome, state) {
  const profile = BIOME_LOCATION_RANGES[
    Math.min(biome, BIOME_LOCATION_RANGES.length - 1)
  ] || {
    name: `Biome ${biome}`,
    descriptions: ["Placeholder biome description."],
    waterSupply: [0, 0],
    land: [0, 0],
    temperature: [0, 0],
    radiation: [0, 0]
  };

  const descList = profile.descriptions || ["Placeholder biome description."];

  const location = {
    biomeName: profile.name || `Biome ${biome}`,
    biomeDescription: descList[seededRandomInt(0, descList.length - 1)]
  };

  LOCATION_ATTRIBUTES.forEach(attr => {
    const range = profile[attr];
    location[attr] = seededRandomInt(range[0], range[1]);
  });

  location.visible = {};
  LOCATION_ATTRIBUTES.forEach(attr => {
    location.visible[attr] = true;
  });

  return location;
}

function getDangerColor(roll) {
  if (roll >= 250) return '🔴';
  if (roll >= 100) return '🟠';
  return '🟢';
}

const attributeFlavours = {
  waterSupply: {
    green: ["Crystal-clear spring","Deep aquifer","Freshwater creek","Sparkling river"],
    orange: ["Murky pond","Slow trickle","Shallow well","Brackish stream"],
    red: ["None","Toxic puddle","Dusty hollow","Salt-crusted depression"]
  },
  land: {
    green: ["Fertile plains","Rolling meadows","Rich black soil","Soft loam"],
    orange: ["Rocky ground","Sandy flats","Stubborn clay","Gravelly terrain"],
    red: ["Barren wasteland","Concrete floor","Poisoned earth","Glassy crater field"]
  },
  temperature: {
    green: ["Mild and pleasant","Warm sunshine","Comfortable cool","Balmy breeze"],
    orange: ["Uncomfortably hot","Biting cold","Sweltering humidity","Freezing wind"],
    red: ["Scorching heat","Frozen tundra","Unrelenting sun","Flash‑freeze nights"]
  },
  radiation: {
    green: ["Barely detectable","Background only","Safe levels","Clean air"],
    orange: ["Unsettling readings","Warm spots","Unsafe without protection","Rad‑soaked dust"],
    red: ["Deadly glow","High contamination","Hot zone","Lethal exposure"]
  }
};

function getAttributeLabel(attr, roll) {
  const tier = roll >= 250 ? 'red' : (roll >= 100 ? 'orange' : 'green');
  const pool = attributeFlavours[attr][tier];
  return pool[Math.floor(rng() * pool.length)];
}

function applyLocationGeneration(state) {
  let location = generateLocation(state.currentBiome, state);



  if (state.locationModifiers) {
    for (const [attr, delta] of Object.entries(state.locationModifiers)) {
      if (LOCATION_ATTRIBUTES.includes(attr)) {
        location[attr] = Math.max(0, location[attr] + delta);
      }
    }
    delete state.locationModifiers;
  }

  return location;
}







// ---------- 10. MOVE ----------
function moveToNextLocation() {
  if (!GameState.isActive || GameState.gameOver) return;

  GameState.moves++;

  GameState.eventQueue = [];

  const biomeProfile = BIOME_LOCATION_RANGES[
      Math.min(GameState.currentBiome, BIOME_LOCATION_RANGES.length - 1)
  ];

  const biomeRange = biomeProfile.eventRange || [0, 5]; // fallback just in case

  const eventIndex =
    seededRandomInt(
      biomeRange[0],
      biomeRange[1]
    );

  const normalEvent =
    EVENT_LIST[eventIndex];

  GameState.eventQueue.push(normalEvent);

  // Queue milestone AFTER the normal event every 4th move
  if (GameState.moves > 0 && GameState.moves % 4 === 0) {
    if (MILESTONE_POOL.length > 0) {
      const stageIndex = Math.min(
        GameState.milestoneStage,
        MILESTONE_POOL.length - 1
      );

      const milestoneEvent = MILESTONE_POOL[stageIndex];

      if (GameState.milestoneStage < MILESTONE_POOL.length - 1) {
        GameState.milestoneStage++;
      }

      GameState.eventQueue.push(milestoneEvent);
    }
  }

  processEventQueue();
}

// ---------- 11. SETTLE (4 attributes, gentler deaths) ----------
const settlementMessages = {
  waterSupply: {
    good: (flavour) => `Our settlers arrive to find ${flavour}. Abundant clean water lets us set up in record time.`,
    moderate: (flavour, deaths) => `We draw on ${flavour} to build our water supply, but ${deaths} perish during the effort.`,
    bad: (flavour, deaths) => `The water situation is dire: ${flavour}. ${deaths} settlers die before a steady supply is secured.`
  },
  land: {
    good: (flavour) => `The settlers discover ${flavour}. Fertile ground makes foundation‑laying quick and easy.`,
    moderate: (flavour, deaths) => `Making use of ${flavour}, we clear and prepare the land, losing ${deaths} souls in the process.`,
    bad: (flavour, deaths) => `The land is ${flavour}. Harsh terrain costs us ${deaths} settlers before we can settle.`
  },
  temperature: {
    good: (flavour) => `The climate is ${flavour}. Mild temperatures let us work comfortably without casualties.`,
    moderate: (flavour, deaths) => `Tackling ${flavour} conditions strains the caravan; ${deaths} settlers succumb to the extremes.`,
    bad: (flavour, deaths) => `Deadly ${flavour} ravage the caravan. ${deaths} people die before we can erect proper shelters.`
  },
  radiation: {
    good: (flavour) => `Radiation readings are ${flavour}. The area is safe – no sickness, no casualties.`,
    moderate: (flavour, deaths) => `Background radiation is ${flavour}. Despite precautions, ${deaths} settlers fall to radiation poisoning.`,
    bad: (flavour, deaths) => `Lethal ${flavour} contaminates the land. ${deaths} settlers die before we can build adequate shielding.`
  }
};

  // ---------- SOCIETY FLAVOR (based on final stats) ----------
function getSocietyFlavor() {
  const settlers = GameState.settlers;
  const knowledge = GameState.knowledge;
  const unity = GameState.unity;

  // Population tier
  let popTier;
  if (settlers >= 800) popTier = "Flourishing";
  else if (settlers >= 500) popTier = "Surviving";
  else popTier = "Struggling";

  // Knowledge tier (thresholds: 30,50,70,90,110,130)
  let techTier;
  if (knowledge >= 130) techTier = "Futuristic Era";
  else if (knowledge >= 110) techTier = "Information Era";
  else if (knowledge >= 90) techTier = "Atomic Era";
  else if (knowledge >= 70) techTier = "Industrial Era";
  else if (knowledge >= 50) techTier = "Renaissance Era";
  else if (knowledge >= 30) techTier = "Medieval Era";
  else techTier = "Primitive";

  // Unity tier (same thresholds)
  let govTier;
  if (unity >= 110) govTier = "Socialist";
  else if (unity >= 90) govTier = "Democratic";
  else if (unity >= 70) govTier = "Republic";
  else if (unity >= 50) govTier = "Dictatorship";
  else if (unity >= 30) govTier = "Monarchy";
  else govTier = "Warring Tribes";

  return `${popTier} ${techTier} ${govTier}`;
}

function processSettlementStep(steps, index) {
  if (index >= steps.length) {
    GameState.isActive = false;
    GameState.gameOver = true;
    const finalScore = Math.floor(GameState.settlers + GameState.settlers * (GameState.unity / 100) + GameState.settlers * (GameState.knowledge / 100));
    const flavor = getSocietyFlavor();

    ui.finalScore.textContent = `Final Score: ${finalScore} – ${flavor}`;
    disableActions();
    clearEventPanel();
    updateUI();
    return;
  }

  const step = steps[index];
  ui.eventPanelDescription.textContent = step.description;
  ui.eventPanelChoices.innerHTML = '';

  const ackBtn = document.createElement('button');
  ackBtn.textContent = '✔️ Acknowledge';
  ackBtn.classList.add('game-btn');
  ackBtn.addEventListener('click', () => {
    if (step.deaths > 0) {
      GameState.settlers = Math.max(0, GameState.settlers - step.deaths);

      updateUI();
    }
    if (GameState.settlers <= 0) {

      GameState.isActive = false;
      GameState.gameOver = true;
      ui.finalScore.textContent = 'Score: 0';
      ui.gameOverPanel.style.display = 'block';
      disableActions();
      clearEventPanel();
      updateUI();
      return;
    }
    processSettlementStep(steps, index + 1);
  });
  ui.eventPanelChoices.appendChild(ackBtn);
}

function settle() {
  if (!GameState.isActive || GameState.gameOver) return;
  const loc = GameState.currentLocation;


  const featureNames = {
    waterSupply: 'Water supply',
    land: 'Land',
    temperature: 'Temperature',
    radiation: 'Radiation'
  };

  const steps = [];
  let intro = 'The caravan halts and begins to establish a permanent settlement.';
  steps.push({ description: intro, deaths: 0, attributeName: null });

  LOCATION_ATTRIBUTES.forEach(attr => {
    const roll = loc[attr];
    const scannerAdjustedRoll = Math.floor(
      roll * 100 / Math.max(1, GameState.scanner)
    );

    const equipmentAdjustedRoll = Math.max(
      0,
      scannerAdjustedRoll + (GameState.permanentEquipmentModifiers?.[attr] || 0)
    );
    let deaths = 0;

    if (equipmentAdjustedRoll >= 250) {
      // Red
      deaths = Math.floor(equipmentAdjustedRoll * 1.2);
    }
    else if (equipmentAdjustedRoll >= 100) {
      // Orange
      deaths = Math.floor(equipmentAdjustedRoll * 0.8);
    }
    else {
      // Green
      deaths = Math.floor(equipmentAdjustedRoll * 0.5);
    }
    let tier;
    if (equipmentAdjustedRoll < 100) tier = 'good';
    else if (equipmentAdjustedRoll < 250) tier = 'moderate';
    else tier = 'bad';

    const flavour = loc.flavourTexts ? loc.flavourTexts[attr] : getAttributeLabel(attr, roll);
    const msg = settlementMessages[attr][tier](flavour, deaths);
    steps.push({ description: msg, deaths: deaths, attributeName: featureNames[attr] });
  });

  disableActions();
  clearEventPanel();

  processSettlementStep(steps, 0);
}

// ---------- 12. GAME OVER CHECK ----------
function checkGameOver() {
  if (GameState.settlers <= 0) {
    GameState.isActive = false;
    GameState.gameOver = true;

    ui.gameOverPanel.style.display = 'block';
    ui.finalScore.textContent = 'Score: 0';
    disableActions();
    clearEventPanel();
  }
}

// ---------- 13. SEED & NEW GAME ----------
function initializeSeed(seedInput) {
  let seedNum;
  if (seedInput && seedInput.trim() !== '') seedNum = hashStringToSeed(seedInput);
  else seedNum = Date.now();
  currentSeed = seedNum;
  rng = mulberry32(seedNum);
  if (ui.currentSeedDisplay) ui.currentSeedDisplay.textContent = currentSeed;
  if (ui.gameSeedDisplay) ui.gameSeedDisplay.textContent = currentSeed;
  return currentSeed;
}

function startNewGame(seedValue) {
  initializeSeed(seedValue);
  GameState.settlers = 1000;
  GameState.scanner = 100;
  GameState.unity = 100;
  GameState.knowledge = 100;
  GameState.moves = 0;
  GameState.isActive = true;
  GameState.gameOver = false;
  GameState.pendingEvent = null;
  delete GameState.locationModifiers;
  GameState.permanentEquipmentModifiers = {};
  MILESTONE_POOL = buildMilestoneObjects(MILESTONE_RAW);
  GameState.currentBiome = 0;

  GameState.currentLocation = generateLocation(GameState.currentBiome, GameState);  
  clearEventPanel();
  ui.gameOverPanel.style.display = 'none';
  enableActions();
  updateUI();
  displayLocation();

}

// ---------- 8. EVENT PANEL ----------
function clearEventPanel() {
  ui.eventPanelDescription.textContent = 'No active event.';
  ui.eventPanelChoices.innerHTML = '';
}

function disableActions() {
  ui.moveBtn.disabled = true;
  ui.settleBtn.disabled = true;

}

function enableActions() {
  if (!GameState.gameOver && GameState.isActive) {
    ui.moveBtn.disabled = false;
    ui.settleBtn.disabled = false;
    updateUI();
  }
}



function displayChoiceEvent(event) {
  GameState.pendingEvent = event;
  ui.eventPanelDescription.textContent = event.description;
  ui.eventPanelChoices.innerHTML = '';

  if (event.kind === 'milestone') {

    const chosenPair =
      event.pairOptions[
        seededRandomInt(0, event.pairOptions.length - 1)
      ];

    chosenPair.forEach(choice => {
      const btn = document.createElement('button');
      btn.textContent = choice.text;
      btn.classList.add('game-btn', 'event-choice-btn');
      btn.addEventListener('click', () => {
        GameState.currentBiome = choice.range;

        displayAutoEvent(event, `Biome set to ${choice.range}.`, choice.text);
      });
      ui.eventPanelChoices.appendChild(btn);
    });

    disableActions();
    return;
  }

  event.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice.text;
    btn.classList.add('game-btn', 'event-choice-btn');
    btn.addEventListener('click', () => {
      const message = choice.effect(GameState);

      displayAutoEvent(event, message, choice.text);
    });
    ui.eventPanelChoices.appendChild(btn);
  });

  disableActions();
}

function displayAutoEvent(event, outcomeMessage, choiceText = null) {
  GameState.pendingEvent = event;
  let html = event.description;
  if (choiceText) html += '<br><br>➡️ ' + choiceText;
  html += '<br><br>' + outcomeMessage;
  ui.eventPanelDescription.innerHTML = html;
  ui.eventPanelChoices.innerHTML = '';

  const ackBtn = document.createElement('button');
  ackBtn.textContent = '✔️ Acknowledge';
  ackBtn.classList.add('game-btn');
  ackBtn.addEventListener('click', () => { processEventQueue(); });
  ui.eventPanelChoices.appendChild(ackBtn);

  disableActions();
}
function processEventQueue() {
  if (GameState.eventQueue.length === 0) {
    GameState.pendingEvent = null;
    clearEventPanel();
    GameState.currentLocation = applyLocationGeneration(GameState);

    displayLocation();
    updateUI();
    checkGameOver();
    if (GameState.gameOver) return;
    enableActions();
    return;
  }

  const event = GameState.eventQueue.shift();
  GameState.pendingEvent = event;

  if (!event.hasChoice) {
    const message = event.effect(GameState);

    displayAutoEvent(event, message);
  } else {
    displayChoiceEvent(event);
  }

  disableActions();
}

// ---------- 14. LOAD JSON ----------
async function loadGameData() {
  try {
    const base = window.SETTLERFRONTIER_BASE || './';
    const [eventsResp, milestonesResp, biomesResp] = await Promise.all([
      fetch(base + 'events.json'),
      fetch(base + 'milestones.json'),
      fetch(base + 'biomes.json')
    ]);

    if (!eventsResp.ok) throw new Error(`events.json failed: ${eventsResp.status}`);
    if (!milestonesResp.ok) throw new Error(`milestones.json failed: ${milestonesResp.status}`);
    if (!biomesResp.ok) throw new Error(`biomes.json failed: ${biomesResp.status}`);

    const rawEvents = await eventsResp.json();
    const rawMilestones = await milestonesResp.json();
    BIOME_LOCATION_RANGES = await biomesResp.json();   // <-- assign the array

    EVENT_LIST = buildEventObjects(rawEvents);
    MILESTONE_RAW = rawMilestones;
    MILESTONE_POOL = buildMilestoneObjects(MILESTONE_RAW);
    GameState.milestoneStage = 0;

    ui.eventPanelDescription.textContent = 'No active event.';
    ui.moveBtn.disabled = false;
    ui.settleBtn.disabled = false;
    console.log('✅ Game data loaded.');
  } catch (err) {
    console.error('Failed to load game data:', err);
    ui.eventPanelDescription.textContent = 'Error loading game data. Please refresh.';
    EVENT_LIST = [];
    MILESTONE_RAW = [];
    MILESTONE_POOL = [];
    BIOME_LOCATION_RANGES = [];   // fallback
  }
}

