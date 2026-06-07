/************************************************************
 * CARAVAN SURVIVAL – CORE LOGIC
 ************************************************************/
(function() {
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
  let SCIENCE_EVENT_LIST = [];
  let UNITY_EVENT_LIST = [];
  let TERRARIAN_FEATURES = [];
  let MILESTONE_POOL = [];
  let MILESTONE_RAW = [];

  // ---------- 3. GAME STATE ----------
  const GameState = {
    settlers: 2000,
    terrainScanner: 100,
    atmosphericScanner: 100,
    unity: 100,
    knowledge: 100,
    equipment: 5,
    moves: 0,
    isActive: false,
    gameOver: false,
    currentLocation: null,
    pendingEvent: null,
    eventQueue: [],
    permanentLocationModifiers: {},
    botMode: false,
    botProgram: null
  };

  // ---------- 4. UTILITIES ----------
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // Apply declarative effects to state
  function applyEffects(state, effects) {
    let message = '';
    effects.forEach(eff => {
      const template = eff.message || null;

      if (eff.type === 'settlers') {
        let delta = eff.delta;
        if (typeof delta === 'object' && delta.min !== undefined && delta.max !== undefined) {
          delta = seededRandomInt(delta.min, delta.max);
        }
        state.settlers = Math.max(0, state.settlers + delta);
        if (template) {
          message = template.replace('{delta}', Math.abs(delta));
        } else if (delta > 0) {
          message = `${delta} settlers joined.`;
        } else if (delta < 0) {
          message = `${-delta} settlers lost.`;
        }
      } else if (eff.type === 'terrainScanner') {
        let delta = eff.delta;
        if (typeof delta === 'object') delta = seededRandomInt(delta.min, delta.max);
        state.terrainScanner = clamp(state.terrainScanner + delta, 0, Infinity);
        if (template) {
          message = template.replace('{delta}', Math.abs(delta));
        } else {
          message = `Terrain Scanner ${delta > 0 ? 'improved' : 'damaged'} by ${Math.abs(delta)}%.`;
        }
      } else if (eff.type === 'atmosphericScanner') {
        let delta = eff.delta;
        if (typeof delta === 'object') delta = seededRandomInt(delta.min, delta.max);
        state.atmosphericScanner = clamp(state.atmosphericScanner + delta, 0, Infinity);
        if (template) {
          message = template.replace('{delta}', Math.abs(delta));
        } else {
          message = `Atmospheric Scanner ${delta > 0 ? 'improved' : 'damaged'} by ${Math.abs(delta)}%.`;
        }
      } else if (eff.type === 'unity') {
        let delta = eff.delta;
        if (typeof delta === 'object') delta = seededRandomInt(delta.min, delta.max);
        state.unity = clamp(state.unity + delta, 0, Infinity);
        if (template) {
          message = template.replace('{delta}', Math.abs(delta));
        } else {
          message = `Unity ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}%.`;
        }
      } else if (eff.type === 'knowledge') {
        let delta = eff.delta;
        if (typeof delta === 'object') delta = seededRandomInt(delta.min, delta.max);
        state.knowledge = clamp(state.knowledge + delta, 0, Infinity);
        if (template) {
          message = template.replace('{delta}', Math.abs(delta));
        } else {
          message = `Knowledge ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}%.`;
        }
      } else if (eff.type === 'equipment') {
        let delta = eff.delta;
        state.equipment = Math.max(0, state.equipment + delta);
        if (template) {
          message = template.replace('{delta}', Math.abs(delta));
        } else {
          message = delta > 0
            ? `Gained ${delta} analysis equipment.`
            : `Lost ${Math.abs(delta)} analysis equipment.`;
        }
      } else if (LOCATION_ATTRIBUTES.includes(eff.type)) {
        let delta = eff.delta;
        if (typeof delta === 'object') delta = seededRandomInt(delta.min, delta.max);

        if (eff.permanent) {
          if (!state.permanentLocationModifiers) state.permanentLocationModifiers = {};
          if (!state.permanentLocationModifiers[eff.type]) state.permanentLocationModifiers[eff.type] = 0;
          state.permanentLocationModifiers[eff.type] += delta;
          if (template) {
            message = template.replace('{delta}', Math.abs(delta));
          } else {
            message = `${eff.type} permanently ${delta > 0 ? 'improved' : 'worsened'} by ${Math.abs(delta)}.`;
          }
        } else {
          if (!state.locationModifiers) state.locationModifiers = {};
          if (!state.locationModifiers[eff.type]) state.locationModifiers[eff.type] = 0;
          state.locationModifiers[eff.type] += delta;
          if (template) {
            message = template.replace('{delta}', Math.abs(delta));
          } else {
            message = `${eff.type} will be ${delta > 0 ? 'better' : 'worse'} next move.`;
          }
        }
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

  function buildFeatureObjects(rawFeatures) {
    return rawFeatures.map(f => ({
      name: f.name,
      target: f.target,
      desc: f.desc,
      increasesDeath: f.increasesDeath,
      modifier: f.modifier
        ? () => seededRandomInt(f.modifier.min, f.modifier.max)
        : () => 0
    }));
  }

  // ---------- 5. LOCATION GENERATION ----------
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

  const LOCATION_ATTRIBUTES = ['waterSupply','land','temperature','precipitation','vegetation','radiation','shelter'];

  function generateLocation(moves, state) {
    const location = {};
    const shift = moves * 5;
    const maxRoll = Math.max(100, 300 - shift);
    const minRoll = Math.max(0, 100 - shift);
    LOCATION_ATTRIBUTES.forEach(attr => {
      location[attr] = seededRandomInt(minRoll, maxRoll);
    });

    location.visible = {};
    if (state) {
      const tChance = state.terrainScanner / 100;
      const aChance = state.atmosphericScanner / 100;
      location.visible.waterSupply = rng() < tChance;
      location.visible.land = rng() < tChance;
      location.visible.vegetation = rng() < tChance;
      location.visible.temperature = rng() < aChance;
      location.visible.precipitation = rng() < aChance;
      location.visible.radiation = rng() < aChance;
    } else {
      LOCATION_ATTRIBUTES.forEach(attr => { location.visible[attr] = true; });
    }
    location.visible.shelter = true;

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

  const attributeFlavours = {
    waterSupply: {
      green: ["Crystal-clear spring","Deep aquifer","Freshwater creek","Sparkling river"],
      orange: ["Murky pond","Slow trickle","Shallow well","Brackish stream"],
      red: ["Dry riverbed","Toxic puddle","Dusty hollow","Salt-crusted depression"]
    },
    land: {
      green: ["Fertile plains","Rolling meadows","Rich black soil","Soft loam"],
      orange: ["Rocky ground","Sandy flats","Stubborn clay","Gravelly terrain"],
      red: ["Barren wasteland","Cracked hardpan","Poisoned earth","Glassy crater field"]
    },
    temperature: {
      green: ["Mild and pleasant","Warm sunshine","Comfortable cool","Balmy breeze"],
      orange: ["Uncomfortably hot","Biting cold","Sweltering humidity","Freezing wind"],
      red: ["Scorching heat","Frozen tundra","Unrelenting sun","Flash‑freeze nights"]
    },
    precipitation: {
      green: ["Gentle rain showers","Consistent drizzle","Seasonal downpours","Morning dew"],
      orange: ["Erratic storms","Long dry spells","Hail sometimes","Unreliable rainfall"],
      red: ["Never a drop","Acid rain","Month‑long drought","Flash floods"]
    },
    vegetation: {
      green: ["Lush forest","Thick undergrowth","Edible plants abundant","Fertile orchards"],
      orange: ["Sparse shrubs","Dry grass","Scattered cacti","Wilted crops"],
      red: ["Barren wasteland","Toxic brambles","Nothing grows","Dead stumps"]
    },
    radiation: {
      green: ["Barely detectable","Background only","Safe levels","Clean air"],
      orange: ["Unsettling readings","Warm spots","Unsafe without protection","Rad‑soaked dust"],
      red: ["Deadly glow","High contamination","Hot zone","Lethal exposure"]
    },
    shelter: {
      green: ["Natural caves","Dense forest cover","Overhanging cliffs","Ancient ruins"],
      orange: ["Scattered boulders","Sparse tree line","Open plains","Half‑collapsed hut"],
      red: ["Exposed wasteland","No cover for miles","Treeless expanse","Shifting sands"]
    }
  };

  function getAttributeLabel(attr, roll) {
    const tier = roll >= 200 ? 'red' : (roll >= 75 ? 'orange' : 'green');
    const pool = attributeFlavours[attr][tier];
    return pool[Math.floor(rng() * pool.length)];
  }

  // ---------- 7. APPLY LOCATION MODIFIERS ----------
  function applyLocationGeneration(state) {
    let location = generateLocation(state.moves, state);
    if (state.permanentLocationModifiers) {
      for (const [attr, delta] of Object.entries(state.permanentLocationModifiers)) {
        location[attr] = Math.max(0, location[attr] + delta);
      }
    }
    if (state.locationModifiers) {
      for (const [attr, delta] of Object.entries(state.locationModifiers)) {
        location[attr] = Math.max(0, location[attr] + delta);
      }
      delete state.locationModifiers;
    }
    return location;
  }

  // ---------- 8. UI ELEMENTS ----------
  let ui = {};

  function updateUI() {
    if (!ui.settlers) return; // UI not yet initialised
    ui.settlers.textContent = GameState.settlers;
    ui.terrainScanner.textContent = GameState.terrainScanner;
    ui.atmosphericScanner.textContent = GameState.atmosphericScanner;
    ui.unity.textContent = GameState.unity;
    ui.knowledge.textContent = GameState.knowledge;
    ui.equipment.textContent = GameState.equipment;
    ui.moves.textContent = GameState.moves;
    if (ui.scanBtn) {
      ui.scanBtn.disabled = !GameState.isActive || GameState.gameOver || GameState.equipment <= 0 || !GameState.currentLocation || GameState.currentLocation.scanned;
    }
  }

  function displayLocation() {
    const loc = GameState.currentLocation;
    if (!loc) return;

    loc.flavourTexts = {};
    LOCATION_ATTRIBUTES.forEach(attr => {
      const roll = loc[attr];
      const uiElement = ui[attr];
      if (uiElement) {
        const label = getAttributeLabel(attr, roll);
        loc.flavourTexts[attr] = label;
        if (loc.visible && loc.visible[attr]) {
          uiElement.textContent = `${getDangerColor(roll)} ${label}`;
        } else {
          uiElement.textContent = `❓ ???`;
        }
      }
    });
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

    GameState.equipment--;
    const loc = GameState.currentLocation;

    let revealedAny = false;
    if (loc.visible) {
      LOCATION_ATTRIBUTES.forEach(attr => {
        if (!loc.visible[attr]) {
          loc.visible[attr] = true;
          revealedAny = true;
        }
      });
    }

    if (!loc.scanned) {
      loc.scanned = true;
    }

    if (revealedAny) {
      log('🔍 Scan complete. Hidden environmental data revealed.');
      displayLocation();
    } else if (loc.scanned) {
      log('🔍 Scan complete. Terrarian features confirmed.');
    } else {
      log('🔍 Scan complete. No new information gained.');
    }

    updateTerrarianDisplay();
    updateUI();
  }

  // ---------- 10. SETTLEMENT ----------
  const settlementMessages = {
    waterSupply: {
      good: (flavour) =>
        `Our settlers arrive to find ${flavour}. Abundant clean water lets us set up in record time.`,
      moderate: (flavour, deaths) =>
        `We draw on ${flavour} to build our water supply, but ${deaths} perish during the effort.`,
      bad: (flavour, deaths) =>
        `The water situation is dire: ${flavour}. ${deaths} settlers die before a steady supply is secured.`
    },
    land: {
      good: (flavour) =>
        `The settlers discover ${flavour}. Fertile ground makes foundation‑laying quick and easy.`,
      moderate: (flavour, deaths) =>
        `Making use of ${flavour}, we clear and prepare the land, losing ${deaths} souls in the process.`,
      bad: (flavour, deaths) =>
        `The land is ${flavour}. Harsh terrain costs us ${deaths} settlers before we can settle.`
    },
    temperature: {
      good: (flavour) =>
        `The climate is ${flavour}. Mild temperatures let us work comfortably without casualties.`,
      moderate: (flavour, deaths) =>
        `Tackling ${flavour} conditions strains the caravan; ${deaths} settlers succumb to the extremes.`,
      bad: (flavour, deaths) =>
        `Deadly ${flavour} ravage the caravan. ${deaths} people die before we can erect proper shelters.`
    },
    precipitation: {
      good: (flavour) =>
        `${flavour} keep the land moist and the cisterns full. Setup proceeds without a hitch.`,
      moderate: (flavour, deaths) =>
        `Weather patterns bring ${flavour}. We manage, but ${deaths} settlers are lost to flooding or drought in the first weeks.`,
      bad: (flavour, deaths) =>
        `The area is plagued by ${flavour}. Extreme weather claims ${deaths} settlers as we struggle to cope.`
    },
    vegetation: {
      good: (flavour) =>
        `The land offers ${flavour}. Edible plants are everywhere, and we settle effortlessly.`,
      moderate: (flavour, deaths) =>
        `Using ${flavour}, we forage and plant, yet ${deaths} settlers die from poisonous or scarce specimens.`,
      bad: (flavour, deaths) =>
        `The vegetation is ${flavour}. Starvation looms and ${deaths} perish before crops are established.`
    },
    radiation: {
      good: (flavour) =>
        `Radiation readings are ${flavour}. The area is safe – no sickness, no casualties.`,
      moderate: (flavour, deaths) =>
        `Background radiation is ${flavour}. Despite precautions, ${deaths} settlers fall to radiation poisoning.`,
      bad: (flavour, deaths) =>
        `Lethal ${flavour} contaminates the land. ${deaths} settlers die before we can build adequate shielding.`
    },
    shelter: {
      good: (flavour) =>
        `${flavour} provide natural protection. The caravan settles in quickly and safely.`,
      moderate: (flavour, deaths) =>
        `We take advantage of ${flavour}, but construction accidents claim ${deaths} lives.`,
      bad: (flavour, deaths) =>
        `The shelter situation is desperate – ${flavour}. ${deaths} settlers perish from exposure before huts are up.`
    }
  };

  function processSettlementStep(steps, index) {
    if (index >= steps.length) {
      GameState.isActive = false;
      GameState.gameOver = true;
      const finalScore = Math.floor(GameState.settlers * (GameState.unity / 100));
      log(`📊 Final Score: ${finalScore}`);
      ui.finalScore.textContent = `Final Score: ${finalScore}`;
      ui.gameOverPanel.style.display = 'block';
      ui.moveBtn.disabled = true;
      ui.settleBtn.disabled = true;
      ui.eventPanelDescription.textContent = 'No active event.';
      ui.eventPanelChoices.innerHTML = '';
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
        log(`📌 ${step.attributeName} claimed ${step.deaths} settlers.`);
        updateUI();
      }
      if (GameState.settlers <= 0) {
        log('💀 The settlement was never formed as everyone died trying to make it come true.');
        GameState.isActive = false;
        GameState.gameOver = true;
        ui.finalScore.textContent = 'Score: 0';
        ui.gameOverPanel.style.display = 'block';
        ui.moveBtn.disabled = true;
        ui.settleBtn.disabled = true;
        ui.eventPanelDescription.textContent = 'No active event.';
        ui.eventPanelChoices.innerHTML = '';
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

    if (!loc.scanned) {
      loc.scanned = true;
      updateTerrarianDisplay();
    }

    const featureNames = {
      waterSupply: 'Water supply',
      land: 'Land',
      temperature: 'Temperature',
      precipitation: 'Rainfall',
      vegetation: 'Vegetation',
      radiation: 'Radiation',
      shelter: 'Shelter'
    };

    const terrarianModifiers = {
      waterSupply: 0, land: 0, temperature: 0, precipitation: 0,
      vegetation: 0, radiation: 0, shelter: 0, general: 0
    };
    loc.terrarianFeatures.forEach(f => {
      if (f.target === 'general') terrarianModifiers.general += f.modifier;
      else if (terrarianModifiers.hasOwnProperty(f.target)) {
        terrarianModifiers[f.target] += f.modifier;
      }
    });

    const steps = [];

    let intro = 'The caravan halts and begins to establish a permanent settlement.';
    if (loc.terrarianFeatures.length > 0) {
      const featureList = loc.terrarianFeatures.map(f => `${f.name}: ${f.desc}`).join(', ');
      intro += ` Scouts uncover hidden dangers: ${featureList}.`;
    }
    steps.push({ description: intro, deaths: 0, attributeName: null });

    LOCATION_ATTRIBUTES.forEach(attr => {
      const roll = loc[attr];
      const modifier = (terrarianModifiers[attr] || 0) + terrarianModifiers.general;
      const effectiveRoll = Math.max(0, roll + modifier);

      let deaths = 0;
      if (effectiveRoll >= 200) {
        deaths = effectiveRoll + 30;
      } else if (effectiveRoll >= 75) {
        deaths = effectiveRoll - 30;
      }

      let tier;
      if (effectiveRoll < 75) tier = 'good';
      else if (effectiveRoll < 200) tier = 'moderate';
      else tier = 'bad';

      const flavour = loc.flavourTexts
        ? loc.flavourTexts[attr]
        : getAttributeLabel(attr, roll);

      const msg = settlementMessages[attr][tier](flavour, deaths);

      steps.push({ description: msg, deaths: deaths, attributeName: featureNames[attr] });
    });

    ui.moveBtn.disabled = true;
    ui.settleBtn.disabled = true;
    ui.eventPanelDescription.textContent = 'No active event.';
    ui.eventPanelChoices.innerHTML = '';
    log('🏁 The caravan decides to settle...');
    processSettlementStep(steps, 0);
  }

  // ---------- 13. GAME OVER CHECK ----------
  function checkGameOver() {
    if (GameState.settlers <= 0) {
      GameState.isActive = false;
      GameState.gameOver = true;
      log('💀 All settlers have perished. The journey ends.');
      ui.gameOverPanel.style.display = 'block';
      ui.finalScore.textContent = 'Score: 0';
      ui.moveBtn.disabled = true;
      ui.settleBtn.disabled = true;
      ui.eventPanelDescription.textContent = 'No active event.';
      ui.eventPanelChoices.innerHTML = '';
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
    GameState.settlers = 2000;
    GameState.terrainScanner = 100;
    GameState.atmosphericScanner = 100;
    GameState.unity = 100;
    GameState.knowledge = 100;
    GameState.equipment = 5;
    GameState.moves = 0;
    GameState.isActive = true;
    GameState.gameOver = false;
    GameState.pendingEvent = null;
    delete GameState.locationModifiers;
    GameState.permanentLocationModifiers = {};
    MILESTONE_POOL = buildEventObjects(MILESTONE_RAW);

    GameState.currentLocation = generateLocation(0, GameState);
    clearLog();
    ui.eventPanelDescription.textContent = 'No active event.';
    ui.eventPanelChoices.innerHTML = '';
    ui.gameOverPanel.style.display = 'none';
    updateUI();
    displayLocation();
    log('🚀 The caravan emerges from the bunker. Find a new home.');
  }

  // ---------- 16. LOAD JSON & INIT ----------
  async function loadGameData() {
    try {
      const base = window.SETTLERFRONTIER_BASE || '/assets/settlerfrontier/';
      const [eventsResp, scienceResp, unityResp, featuresResp, milestonesResp] = await Promise.all([
        fetch(base + 'events.json'),
        fetch(base + 'science.json'),
        fetch(base + 'unity.json'),
        fetch(base + 'features.json'),
        fetch(base + 'milestones.json')
      ]);
      const rawEvents = await eventsResp.json();
      const rawScience = await scienceResp.json();
      const rawUnity = await unityResp.json();
      const rawFeatures = await featuresResp.json();
      const rawMilestones = await milestonesResp.json();

      EVENT_LIST = buildEventObjects(rawEvents);
      SCIENCE_EVENT_LIST = buildEventObjects(rawScience);
      UNITY_EVENT_LIST = buildEventObjects(rawUnity);
      TERRARIAN_FEATURES = buildFeatureObjects(rawFeatures);
      MILESTONE_RAW = rawMilestones;
      MILESTONE_POOL = buildEventObjects(rawMilestones);

      console.log('✅ Game data loaded.');
    } catch (err) {
      console.error('Failed to load game data:', err);
    }
  }

  // ---------- EXPOSE PUBLIC API ----------
  window.Caravan = {
    // state
    GameState,
    rng,
    currentSeed,
    ui,
    EVENT_LIST,
    SCIENCE_EVENT_LIST,
    UNITY_EVENT_LIST,
    TERRARIAN_FEATURES,
    MILESTONE_POOL, 
    MILESTONE_RAW,
    LOCATION_ATTRIBUTES,
    // functions
    mulberry32,
    seededRandomInt,
    hashStringToSeed,
    applyEffects,
    buildEventObjects,
    buildFeatureObjects,
    generateLocation,
    applyLocationGeneration,
    getDangerColor,
    getAttributeLabel,
    updateUI,
    displayLocation,
    updateTerrarianDisplay,
    log,
    clearLog,
    scanLocation,
    settle,
    processSettlementStep,
    settlementMessages,
    checkGameOver,
    initializeSeed,
    startNewGame,
    loadGameData,
    // panel helpers
    manualHandlers: {},
    clearEventPanel: () => {
      ui.eventPanelDescription.textContent = 'No active event.';
      ui.eventPanelChoices.innerHTML = '';
    },
    disableActions: () => {
      ui.moveBtn.disabled = true;
      ui.settleBtn.disabled = true;
      if (ui.scanBtn) ui.scanBtn.disabled = true;
    },
    enableActions: () => {
      if (!GameState.gameOver && GameState.isActive) {
        ui.moveBtn.disabled = false;
        ui.settleBtn.disabled = false;
      }
    }
  };
})();