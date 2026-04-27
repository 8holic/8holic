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
  let EVENT_LIST = [];        // normal events
  let SCIENCE_EVENT_LIST = [];// science events (from science.json)
  let UNITY_EVENT_LIST = [];  // unity events (from unity.json)
  let TERRARIAN_FEATURES = [];
  let MILESTONE_POOL = [];        // available milestone events (executable)
  let MILESTONE_RAW = [];         // raw JSON data for reset on new game

  // ---------- 3. GAME STATE ----------
  const GameState = {
    settlers: 1000,
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
    permanentLocationModifiers: {}   // { waterSupply: 5, radiation: -10, ... }
  };

  // ---------- 4. UTILITIES ----------
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // Apply declarative effects to state (updated for scanners, removed condition)
  function applyEffects(state, effects) {
    let message = '';
    effects.forEach(eff => {
      // Allow custom message templates from JSON
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
        // equipment delta is usually a fixed number, not a range
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
          // Permanent modifier – stored forever, applied every future location
          if (!state.permanentLocationModifiers) state.permanentLocationModifiers = {};
          if (!state.permanentLocationModifiers[eff.type]) state.permanentLocationModifiers[eff.type] = 0;
          state.permanentLocationModifiers[eff.type] += delta;
          if (template) {
            message = template.replace('{delta}', Math.abs(delta));
          } else {
            message = `${eff.type} permanently ${delta > 0 ? 'improved' : 'worsened'} by ${Math.abs(delta)}.`;
          }
        } else {
          // Temporary modifier – only affects the very next location
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

  // Build feature objects from JSON data (with safeguard for missing modifier)
  function buildFeatureObjects(rawFeatures) {
    return rawFeatures.map(f => ({
      name: f.name,
      target: f.target,
      desc: f.desc,
      increasesDeath: f.increasesDeath,
      modifier: f.modifier
        ? () => seededRandomInt(f.modifier.min, f.modifier.max)
        : () => 0  // fallback – no modifier
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
      modifier: f.modifier()   // execute the function to get a concrete number
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

    // Visibility based on scanners
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
    location.visible.shelter = true;   // always visible

    const featureCount = rollFeatureCount();
    location.terrarianFeatures = pickUniqueFeatures(featureCount);
    location.scanned = false;
    return location;
  }

  // Danger tiers
  function getDangerColor(roll) {
    if (roll >= 200) return '🔴';
    if (roll >= 75) return '🟠';
    return '🟢';
  }

  // Flavour text pools (vegetation replaces food)
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
    // Apply permanent modifiers first (they always apply)
    if (state.permanentLocationModifiers) {
      for (const [attr, delta] of Object.entries(state.permanentLocationModifiers)) {
        location[attr] = Math.max(0, location[attr] + delta);
      }
    }
    // Apply temporary one‑time modifiers, then clear them
    if (state.locationModifiers) {
      for (const [attr, delta] of Object.entries(state.locationModifiers)) {
        location[attr] = Math.max(0, location[attr] + delta);
      }
      delete state.locationModifiers;   // temporary, consume after use
    }
    return location;
  }

  // ---------- 8. UI ELEMENTS ----------
  let ui = {};

  function updateUI() {
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

  // ---------- 9. SCANNING (now also reveals hidden attributes) ----------
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

  function processEventQueue() {
    if (GameState.eventQueue.length === 0) {
      clearEventPanel();
      GameState.currentLocation = applyLocationGeneration(GameState);
      log(`📍 Moved to a new location.`);
      displayLocation();
      updateUI();
      checkGameOver();
      enableActions();
      return;
    }

    const event = GameState.eventQueue.shift();
    GameState.pendingEvent = event;

    if (!event.hasChoice) {
      const message = event.effect(GameState);
      log(`📌 Event: ${event.name} – ${message}`);
      displayAutoEvent(event, message);
    } else {
      displayChoiceEvent(event);
    }
    disableActions();
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
        displayAutoEvent(event, message, choice.text);
      });
      ui.eventPanelChoices.appendChild(btn);
    });
    disableActions();
  }

  function displayAutoEvent(event, outcomeMessage, choiceText = null) {
    GameState.pendingEvent = event;
    let html = event.description;
    if (choiceText) {
      html += '<br><br>➡️ ' + choiceText;
    }
    html += '<br><br>' + outcomeMessage;
    ui.eventPanelDescription.innerHTML = html;
    ui.eventPanelChoices.innerHTML = '';

    const ackBtn = document.createElement('button');
    ackBtn.textContent = '✔️ Acknowledge';
    ackBtn.classList.add('game-btn');
    ackBtn.addEventListener('click', () => {
      processEventQueue();
    });
    ui.eventPanelChoices.appendChild(ackBtn);
    disableActions();
  }

  // ---------- 11. MOVE (with science/unity probability) ----------
  function moveToNextLocation() {
    if (!GameState.isActive || GameState.gameOver) return;
    GameState.moves++;
    // ---------- MILESTONE CHECK (every 6 moves) ----------
    if (GameState.moves > 0 && GameState.moves % 6 === 0 && MILESTONE_POOL.length > 0) {
        const idx = seededRandomInt(0, MILESTONE_POOL.length - 1);
        const milestoneEvent = MILESTONE_POOL.splice(idx, 1)[0];   // remove from pool (unique)
        log('Event');
        // The milestone will be processed first (before normal/science/unity events)
        GameState.eventQueue.unshift(milestoneEvent);
}
    GameState.eventQueue = [];

    // Normal event
    const FLOOR_BASE = 0;
    const MAX_BASE = 20;
    const MAX_CAP = 70;
    const SHIFT_PER_MOVE = 2;

    let floor = FLOOR_BASE + SHIFT_PER_MOVE * GameState.moves;
    let max = MAX_BASE + SHIFT_PER_MOVE * GameState.moves;
    if (max > MAX_CAP) max = MAX_CAP;
    if (floor > max) floor = max;

    let eventIndex = seededRandomInt(floor, max);
    if (eventIndex >= EVENT_LIST.length) {
      eventIndex = EVENT_LIST.length - 1;
    }
    const normalEvent = EVENT_LIST[eventIndex];

    // Science event (probability = (knowledge)%)
    if (SCIENCE_EVENT_LIST.length > 0) {
      const scienceChance = GameState.knowledge / 100;
      if (rng() < scienceChance) {
        const idx = seededRandomInt(0, SCIENCE_EVENT_LIST.length - 1);
        GameState.eventQueue.push(SCIENCE_EVENT_LIST[idx]);
      }
    }

    // Unity event (probability = (100 - unity)%)
    if (UNITY_EVENT_LIST.length > 0) {
      const unityChance = (100 - GameState.unity) / 100;
      if (rng() < unityChance) {
        const idx = seededRandomInt(0, UNITY_EVENT_LIST.length - 1);
        GameState.eventQueue.push(UNITY_EVENT_LIST[idx]);
      }
    }

    GameState.eventQueue.push(normalEvent);
    processEventQueue();
  }

  // ---------- 12. SETTLE (step‑by‑step narrative, effective roll after hidden modifiers) ----------

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
        log(`📌 ${step.attributeName} claimed ${step.deaths} settlers.`);
        updateUI();
      }
      if (GameState.settlers <= 0) {
        log('💀 The settlement was never formed as everyone died trying to make it come true.');
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

    // Gather Terrarian modifiers
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
      const roll = loc[attr];                              // original, as displayed
      const modifier = (terrarianModifiers[attr] || 0) + terrarianModifiers.general;
      const effectiveRoll = Math.max(0, roll + modifier);  // hidden truth

      // Death calculation based on effective roll
      let deaths = 0;
      if (effectiveRoll >= 200) {
        deaths = effectiveRoll + 30;
      } else if (effectiveRoll >= 75) {
        deaths = effectiveRoll - 30;
      } // else deaths stays 0

      // Message tier also based on effective roll (surprise!)
      let tier;
      if (effectiveRoll < 75) tier = 'good';
      else if (effectiveRoll < 200) tier = 'moderate';
      else tier = 'bad';

      // Flavours still from original exploration (display never changes)
      const flavour = loc.flavourTexts
        ? loc.flavourTexts[attr]
        : getAttributeLabel(attr, roll);

      const msg = settlementMessages[attr][tier](flavour, deaths);

      steps.push({ description: msg, deaths: deaths, attributeName: featureNames[attr] });
    });

    disableActions();
    clearEventPanel();
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
    GameState.permanentLocationModifiers = {};   // reset permanent modifiers

    GameState.currentLocation = generateLocation(0, GameState);
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
      const [eventsResp, scienceResp, unityResp, featuresResp] = await Promise.all([
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

      EVENT_LIST = buildEventObjects(rawEvents);
      SCIENCE_EVENT_LIST = buildEventObjects(rawScience);
      UNITY_EVENT_LIST = buildEventObjects(rawUnity);
      TERRARIAN_FEATURES = buildFeatureObjects(rawFeatures);
      MILESTONE_RAW = rawMilestones;                           // keep raw for restarts
      MILESTONE_POOL = buildEventObjects(rawMilestones);       // initial pool

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
      terrainScanner: document.getElementById('terrainScannerValue'),
      atmosphericScanner: document.getElementById('atmosphericScannerValue'),
      unity: document.getElementById('unityValue'),
      knowledge: document.getElementById('databaseValue'),
      equipment: document.getElementById('equipmentValue'),
      moves: document.getElementById('movesValue'),
      waterSupply: document.getElementById('waterSupplyValue'),
      land: document.getElementById('landValue'),
      temperature: document.getElementById('temperatureValue'),
      precipitation: document.getElementById('precipitationValue'),
      vegetation: document.getElementById('vegetationValue'),
      radiation: document.getElementById('radiationValue'),
      shelter: document.getElementById('shelterValue'),
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

    loadGameData();

    document.getElementById('randomSeedBtn').addEventListener('click', () => {
      const randomStr = Math.random().toString(36).substring(2, 10);
      ui.seedInput.value = randomStr;
      ui.currentSeedDisplay.textContent = hashStringToSeed(randomStr);
    });
    document.getElementById('useSeedBtn').addEventListener('click', () => {
      const seedStr = ui.seedInput.value;
      ui.currentSeedDisplay.textContent = hashStringToSeed(seedStr);
    });

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