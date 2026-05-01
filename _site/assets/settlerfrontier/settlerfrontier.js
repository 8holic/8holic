
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
  let pendingBotMode = false;

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
    permanentLocationModifiers: {},   // { waterSupply: 5, radiation: -10, ... }
    botMode: false,                   // add this
    botProgram: null
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
    if (!GameState.gameOver && GameState.isActive && !GameState.botMode) {
      ui.moveBtn.disabled = false;
      ui.settleBtn.disabled = false;
      updateUI();
    }
  }

  function processEventQueue() {
    if (GameState.eventQueue.length === 0) {
      clearEventPanel();
      if (GameState.botMode) {
        const action = botAutoStep();
        if (action === 'settle') { settle(); return; }
        if (action === 'scan') {
          scanLocation();
          setTimeout(() => {
            GameState.currentLocation = applyLocationGeneration(GameState);
            log('📍 Moved to a new location.');
            displayLocation();
            updateUI();
            checkGameOver();
            if (!GameState.gameOver) moveToNextLocation();
          }, 1200);
          return;
        }
      }
      GameState.currentLocation = applyLocationGeneration(GameState);
      log('📍 Moved to a new location.');
      displayLocation();
      updateUI();
      checkGameOver();
      if (GameState.gameOver) return;
      if (GameState.botMode) {
        moveToNextLocation();   // keep looping
      } else {
        enableActions();
      }
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

    if (GameState.botMode) {
      const priority = findPriorityInProgram();
      const chosen = priority ? botDecidePriority(priority, event.choices) : event.choices[0];
      showBotReasoning('Chose: ' + chosen.text);
      setTimeout(() => {
        const message = chosen.effect(GameState);
        log(`📌 Event: ${event.name} – ${message}`);
        displayAutoEvent(event, message, chosen.text);
      }, 800);
    } else {
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
    }
    disableActions();
  }

  function displayAutoEvent(event, outcomeMessage, choiceText = null) {
    GameState.pendingEvent = event;
    let html = event.description;
    if (choiceText) html += '<br><br>➡️ ' + choiceText;
    html += '<br><br>' + outcomeMessage;
    ui.eventPanelDescription.innerHTML = html;
    ui.eventPanelChoices.innerHTML = '';

    if (GameState.botMode) {
      setTimeout(() => { processEventQueue(); }, 1800);
    } else {
      const ackBtn = document.createElement('button');
      ackBtn.textContent = '✔️ Acknowledge';
      ackBtn.classList.add('game-btn');
      ackBtn.addEventListener('click', () => { processEventQueue(); });
      ui.eventPanelChoices.appendChild(ackBtn);
    }
    disableActions();
  }
  // ---------- BOT ENGINE ----------
  function evaluateCondition(cond, state) {
    if (cond.type === 'comparison') {
      const left = state[cond.stat];
      switch (cond.op) {
        case '>': return left > cond.value;
        case '<': return left < cond.value;
        case '>=': return left >= cond.value;
        case '<=': return left <= cond.value;
        default: return false;
      }
    } else if (cond.type === 'attributeColor') {
      if (!state.currentLocation) return false;
      const attr = cond.attr;
      // Determine visible? Use visible flag if present, else treat as visible
      const visible = (state.currentLocation.visible && state.currentLocation.visible[attr] !== false);
      let tier;
      if (visible) {
        const roll = state.currentLocation[attr];
        tier = roll >= 200 ? 'red' : (roll >= 75 ? 'orange' : 'green');
      } else {
        // Attribute is hidden: use unknownAs if defined, otherwise use actual roll (cheating)
        if (cond.unknownAs) {
          tier = cond.unknownAs;
        } else {
          const roll = state.currentLocation[attr];
          tier = roll >= 200 ? 'red' : (roll >= 75 ? 'orange' : 'green');
        }
      }
      return tier === cond.color;
    } else if (cond.type === 'allVisibleGreen') {
      if (!state.currentLocation) return false;
      return LOCATION_ATTRIBUTES.every(attr => {
        return state.currentLocation.visible && state.currentLocation.visible[attr] && state.currentLocation[attr] < 75;
      });
    } else if (cond.type === 'equipmentAvailable') {
      return state.equipment > 0;
    } else if (cond.type === 'positiveFeaturesGreaterThanNegative') {
      if (!state.currentLocation || !state.currentLocation.scanned) return false;
      let pos = 0, neg = 0;
      state.currentLocation.terrarianFeatures.forEach(f => f.increasesDeath ? neg++ : pos++);
      return pos > neg;
    } else if (cond.type === 'countAttributeColor') {
      if (!state.currentLocation) return false;
      const targetColor = cond.color;
      let count = 0;
      LOCATION_ATTRIBUTES.forEach(attr => {
        const visible = (state.currentLocation.visible && state.currentLocation.visible[attr] !== false);
        let tier;
        if (visible) {
          const roll = state.currentLocation[attr];
          tier = roll >= 200 ? 'red' : (roll >= 75 ? 'orange' : 'green');
        } else {
          tier = cond.hiddenAs || null;
        }
        if (tier === targetColor) count++;
      });
      const threshold = cond.value || cond.minCount || 0;
      switch (cond.op) {
        case '>': return count > threshold;
        case '<': return count < threshold;
        case '>=': return count >= threshold;
        case '<=': return count <= threshold;
        case '==': return count === threshold;
        default: return count >= threshold;
      }
    } else if (cond.type === 'countUnknown') {
      if (!state.currentLocation) return false;
      let count = 0;
      LOCATION_ATTRIBUTES.forEach(attr => {
        if (!state.currentLocation.visible || !state.currentLocation.visible[attr]) count++;
      });
      const threshold = cond.value || cond.minCount || 0;
      switch (cond.op) {
        case '>': return count > threshold;
        case '<': return count < threshold;
        case '>=': return count >= threshold;
        case '<=': return count <= threshold;
        case '==': return count === threshold;
        default: return count >= threshold;
      }
    }
  }

  function botDecidePriority(priorityList, choices) {
    const harmScores = choices.map(choice => {
      let worstIndex = -1;
      (choice.effects || []).forEach(eff => {
        const stat = eff.type;
        if (priorityList.includes(stat)) {
          let delta = typeof eff.delta === 'object' ? 0 : (eff.delta || 0);
          if (delta < 0) {
            const idx = priorityList.indexOf(stat);
            if (idx > worstIndex) worstIndex = idx;
          }
        }
      });
      return { choice, worstIndex };
    });
    harmScores.sort((a, b) => {
      if (a.worstIndex === -1 && b.worstIndex !== -1) return -1;
      if (b.worstIndex === -1 && a.worstIndex !== -1) return 1;
      return b.worstIndex - a.worstIndex;
    });
    return harmScores[0].choice;
  }

  function botProcessActions(actions, state) {
    for (const action of actions) {
      if (action.type === 'settle') return 'settle';
      if (action.type === 'scan' && state.equipment > 0 && state.currentLocation && !state.currentLocation.scanned) return 'scan';
      if (action.type === 'move') return 'move';
    }
    return null;
  }

  function botAutoStep() {
    if (!GameState.botProgram) return 'move';
    for (const whenBlock of GameState.botProgram) {
      if (evaluateCondition(whenBlock.condition, GameState)) {
        for (const rule of whenBlock.rules) {
          if (rule.type === 'if') {
            if (rule.conditions.every(c => evaluateCondition(c, GameState))) {
              const action = botProcessActions(rule.actions, GameState);
              if (action) return action;
            } else if (rule.elseActions) {
              const action = botProcessActions(rule.elseActions, GameState);
              if (action) return action;
            }
          } else if (rule.type === 'settle' || rule.type === 'scan' || rule.type === 'move') {
            if (rule.type === 'scan' && GameState.equipment > 0 && GameState.currentLocation && !GameState.currentLocation.scanned) return 'scan';
            if (rule.type === 'settle') return 'settle';
            if (rule.type === 'move') return 'move';
          }
        }
        return 'move';
      }
    }
    return 'move';
  }

  function findPriorityInProgram() {
    if (!GameState.botProgram) return null;
    for (const when of GameState.botProgram) {
      if (evaluateCondition(when.condition, GameState)) {
        for (const rule of when.rules) {
          if (rule.type === 'priority') return rule.order;
        }
      }
    }
    return null;
  }

  function showBotReasoning(text) {
    const existing = document.getElementById('botReasoning');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'botReasoning';
    div.style.cssText = 'margin-top:8px;padding:6px 10px;background:#392467;border-radius:8px;font-size:0.9rem;color:#FFD1E3;';
    div.textContent = '🤖 ' + text;
    document.getElementById('eventPanel')?.appendChild(div);
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
    GameState.permanentLocationModifiers = {};   // reset permanent modifiers
    MILESTONE_POOL = buildEventObjects(MILESTONE_RAW);


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

      ui.eventPanelDescription.textContent = 'No active event.';
      ui.moveBtn.disabled = false;
      ui.settleBtn.disabled = false;
      console.log('✅ Game data loaded.');
    } catch (err) {
      console.error('Failed to load game data:', err);
      ui.eventPanelDescription.textContent = 'Error loading game data. Please refresh.';
    }
  }
  
  // ---------- BLOCK BUILDER (corrected) ----------
  const BlockBuilder = {
    program: [],
    canvas: null,
    init(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.program = [];   // always start EMPTY
      this.render();
    },
    addWhenBlock() {
      this.program.push({
        type: 'when',
        condition: { type: 'comparison', stat: 'settlers', op: '>', value: 700 },
        rules: []
      });
      this.render();
    },
    removeWhen(idx) { this.program.splice(idx,1); this.render(); },
    addRule(wen, rule) { this.program[wen].rules.push(rule); this.render(); },
    removeRule(wen, ridx) { this.program[wen].rules.splice(ridx,1); this.render(); },
    serialize() { return JSON.stringify(this.program, null, 2); },

    render() {
      const c = this.canvas;
      if (!c) return;
      c.innerHTML = '';
      if (this.program.length === 0) {
        c.innerHTML = '<p style="color:#aaa;text-align:center;">No rules yet. Click "Add When Block" to start.</p>';
        return;
      }
      this.program.forEach((when, wi) => {
        const d = document.createElement('div');
        d.className = 'when-block';
        d.style.cssText = 'background:#2a2340; border:1px solid #A367B1; border-radius:8px; padding:10px; margin:10px 0;';
        d.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <b>WHEN</b>
            <select class="whenStat" data-wi="${wi}">
              <option value="settlers" ${when.condition.stat==='settlers'?'selected':''}>Settlers</option>
              <option value="knowledge" ${when.condition.stat==='knowledge'?'selected':''}>Knowledge</option>
              <option value="unity" ${when.condition.stat==='unity'?'selected':''}>Unity</option>
              <option value="equipment" ${when.condition.stat==='equipment'?'selected':''}>Equipment</option>
            </select>
            <select class="whenOp" data-wi="${wi}">
              <option value=">" ${when.condition.op==='>'?'selected':''}>></option>
              <option value="<" ${when.condition.op==='<'?'selected':''}><</option>
              <option value=">=" ${when.condition.op==='>='?'selected':''}>>=</option>
              <option value="<=" ${when.condition.op==='<='?'selected':''}><=</option>
            </select>
            <input type="number" class="whenValue" value="${when.condition.value}" style="width:80px;" data-wi="${wi}">
            <button class="game-btn removeWhen" data-wi="${wi}">🗑 Remove</button>
            <button class="game-btn addRuleToWhen" data-wi="${wi}">➕ Add Rule</button>
          </div>
          <div class="rules-cont" style="margin-left:20px;margin-top:8px;"></div>`;
        const rc = d.querySelector('.rules-cont');
        when.rules.forEach((r,ri) => rc.appendChild(this._renderRule(r, wi, ri)));
        c.appendChild(d);

        d.querySelector('.removeWhen').onclick = () => this.removeWhen(wi);
        d.querySelector('.addRuleToWhen').onclick = () => this._showRuleMenu(wi);
        d.querySelector('.whenStat').onchange = e => { when.condition.stat = e.target.value; };
        d.querySelector('.whenOp').onchange = e => { when.condition.op = e.target.value; };
        d.querySelector('.whenValue').onchange = e => { when.condition.value = parseInt(e.target.value)||0; };
      });
    },

    _showRuleMenu(wi) {
      const type = prompt('Rule type: "priority", "if", "settle", "scan", "move"');
      if (!type) return;
      let rule;
      switch(type) {
        case 'priority':
          rule = { type:'priority', order: ['knowledge','terrainScanner','atmosphericScanner','unity','settlers'] };
          break;
        case 'if':
          rule = { type:'if', conditions:[], actions:[], elseActions:[] };
          break;
        case 'settle': case 'scan': case 'move':
          rule = { type };
          break;
        default: return;
      }
      this.addRule(wi, rule);
    },

    _renderRule(rule, wi, ri) {
      const div = document.createElement('div');
      div.className = 'rule-item';
      div.style.cssText = 'background:#392467;border-radius:6px;padding:8px;margin:5px 0;';
      const self = this;

      if (rule.type === 'priority') {
        div.innerHTML = `<b>PRIORITY</b>
          <ul class="prioList" style="list-style:none;padding:0;margin:4px 0;">
            ${(rule.order||[]).map((s,i)=>`
              <li style="background:#5D3587;margin:2px 0;padding:4px 8px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
                📌 ${s}
                <span>
                  <button class="moveUp" ${i===0?'disabled':''}>▲</button>
                  <button class="moveDown" ${i===rule.order.length-1?'disabled':''}>▼</button>
                  <button class="removeStat">✖</button>
                </span></li>`).join('')}
          </ul>
          <button class="addStatBtn">➕ Add Stat</button>
          <button class="game-btn removeRule" style="float:right;">🗑 Remove</button>`;

        div.querySelector('.removeRule').onclick = () => self.removeRule(wi, ri);
        div.querySelector('.addStatBtn').onclick = () => {
          const s = prompt('Stat name (e.g., "knowledge", "settlers")');
          if (s) { rule.order.push(s); self.render(); }
        };
        const lis = div.querySelectorAll('.prioList li');
        lis.forEach((li, i) => {
          li.querySelector('.moveUp').onclick = () => {
            if (i > 0) {
              const t = rule.order[i-1];
              rule.order[i-1] = rule.order[i];
              rule.order[i] = t;
              self.render();
            }
          };
          li.querySelector('.moveDown').onclick = () => {
            if (i < rule.order.length-1) {
              const t = rule.order[i+1];
              rule.order[i+1] = rule.order[i];
              rule.order[i] = t;
              self.render();
            }
          };
          li.querySelector('.removeStat').onclick = () => {
            rule.order.splice(i, 1);
            self.render();
          };
        });
      } else if (rule.type === 'if') {
        div.innerHTML = `<b>IF</b>
          <div class="cond-list" style="margin-left:10px;"></div>
          <button class="addCondBtn">➕ Condition</button>
          <div style="margin-top:5px;"><b>THEN:</b><span class="then-acts"></span></div>
          <div style="margin-top:3px;"><b>ELSE:</b><span class="else-acts"></span></div>
          <button class="addThenAct">➕ Action to THEN</button>
          <button class="addElseAct">➕ Action to ELSE</button>
          <button class="game-btn removeRule" style="float:right;">🗑 Remove</button>`;

        const condList = div.querySelector('.cond-list');
        (rule.conditions||[]).forEach((c,ci) => condList.appendChild(self._renderCondition(c, wi, ri, ci)));
        self._renderActions(div.querySelector('.then-acts'), rule.actions||[], wi, ri, 'then');
        self._renderActions(div.querySelector('.else-acts'), rule.elseActions||[], wi, ri, 'else');

        div.querySelector('.addCondBtn').onclick = () => {
          rule.conditions.push({ type:'attributeColor', attr:'waterSupply', color:'green' });
          self.render();
        };
        div.querySelector('.addThenAct').onclick = () => { rule.actions.push({ type:'settle' }); self.render(); };
        div.querySelector('.addElseAct').onclick = () => { rule.elseActions.push({ type:'move' }); self.render(); };
        div.querySelector('.removeRule').onclick = () => self.removeRule(wi, ri);
      } else {
        // simple action
        div.innerHTML = `<b>ACTION:</b> ${rule.type.toUpperCase()}
          <button class="game-btn removeRule" style="float:right;">🗑 Remove</button>`;
        div.querySelector('.removeRule').onclick = () => self.removeRule(wi, ri);
      }
      return div;
    },

    _renderCondition(cond, wi, ri, ci) {
      const d = document.createElement('div');
      d.style.margin = '3px 0';
      const type = cond.type || 'attributeColor';
      d.innerHTML = `
        <select class="condType">
          <option value="attributeColor" ${type==='attributeColor'?'selected':''}>Attribute Color</option>
          <option value="countAttributeColor" ${type==='countAttributeColor'?'selected':''}>Count of Attributes (Color)</option>
          <option value="countUnknown" ${type==='countUnknown'?'selected':''}>Count of Unknown</option>
          <option value="equipmentAvailable" ${type==='equipmentAvailable'?'selected':''}>Equipment Available</option>
          <option value="allVisibleGreen" ${type==='allVisibleGreen'?'selected':''}>All Visible Green</option>
        </select>
        <span class="condDetails"></span>
        <button class="removeCond">✖</button>`;
      const details = d.querySelector('.condDetails');
      const self = this;

      function renderDetails() {
        details.innerHTML = '';
        if (cond.type === 'attributeColor' || cond.type === undefined) {
          details.innerHTML = `
            <select class="attrName">
              ${LOCATION_ATTRIBUTES.map(a => `<option value="${a}" ${cond.attr===a?'selected':''}>${a}</option>`).join('')}
            </select>
            <select class="attrColor">
              <option value="green" ${cond.color==='green'?'selected':''}>Green</option>
              <option value="orange" ${cond.color==='orange'?'selected':''}>Orange</option>
              <option value="red" ${cond.color==='red'?'selected':''}>Red</option>
            </select>
            <select class="unknownAs">
              <option value="" ${!cond.unknownAs?'selected':''}>If hidden: use actual</option>
              <option value="green" ${cond.unknownAs==='green'?'selected':''}>treat as Green</option>
              <option value="orange" ${cond.unknownAs==='orange'?'selected':''}>treat as Orange</option>
              <option value="red" ${cond.unknownAs==='red'?'selected':''}>treat as Red</option>
            </select>`;
        } else if (cond.type === 'countAttributeColor') {
          const op = cond.op || '>=';
          const val = cond.value || cond.minCount || 1;
          details.innerHTML = `
            <select class="countColor">
              <option value="green" ${cond.color==='green'?'selected':''}>Green</option>
              <option value="orange" ${cond.color==='orange'?'selected':''}>Orange</option>
              <option value="red" ${cond.color==='red'?'selected':''}>Red</option>
            </select>
            <select class="countOp">
              <option value=">=" ${op==='>='?'selected':''}>>=</option>
              <option value=">" ${op==='>'?'selected':''}>></option>
              <option value="<=" ${op==='<='?'selected':''}><=</option>
              <option value="<" ${op==='<'?'selected':''}><</option>
              <option value="==" ${op==='=='?'selected':''}>==</option>
            </select>
            <input type="number" class="countValue" value="${val}" style="width:60px;" min="0">
            `;
        } else if (cond.type === 'countUnknown') {
          const op = cond.op || '>=';
          const val = cond.value || cond.minCount || 1;
          details.innerHTML = `
            <select class="unknownOp">
              <option value=">=" ${op==='>='?'selected':''}>>=</option>
              <option value=">" ${op==='>'?'selected':''}>></option>
              <option value="<=" ${op==='<='?'selected':''}><=</option>
              <option value="<" ${op==='<'?'selected':''}><</option>
              <option value="==" ${op==='=='?'selected':''}>==</option>
            </select>
            <input type="number" class="unknownValue" value="${val}" style="width:60px;" min="0">
            unknown`;
        }
      }
      renderDetails();

      d.querySelector('.condType').onchange = function(e) {
        cond.type = e.target.value;
        delete cond.attr; delete cond.color; delete cond.minCount; delete cond.unknownAs;
        delete cond.op; delete cond.value;
        if (cond.type === 'attributeColor') { cond.attr = 'waterSupply'; cond.color = 'green'; }
        else if (cond.type === 'countAttributeColor') { cond.color = 'green'; cond.op = '>='; cond.value = 1; }
        else if (cond.type === 'countUnknown') { cond.op = '>='; cond.value = 1; }
        renderDetails();
      };

      d.querySelector('.removeCond').onclick = function() {
        self.program[wi].rules[ri].conditions.splice(ci, 1);
        self.render();
      };

      details.addEventListener('change', function(e) {
        if (e.target.classList.contains('attrName')) cond.attr = e.target.value;
        else if (e.target.classList.contains('attrColor')) cond.color = e.target.value;
        else if (e.target.classList.contains('unknownAs')) {
          cond.unknownAs = e.target.value || null;
        }
        else if (e.target.classList.contains('countColor')) cond.color = e.target.value;
        else if (e.target.classList.contains('countOp')) cond.op = e.target.value;
        else if (e.target.classList.contains('countValue')) cond.value = parseInt(e.target.value) || 0;
        else if (e.target.classList.contains('unknownOp')) cond.op = e.target.value;
        else if (e.target.classList.contains('unknownValue')) cond.value = parseInt(e.target.value) || 0;
      });

      return d;
    },

    _renderActions(container, actions, wi, ri, target) {
      container.innerHTML = '';
      actions.forEach((a, ai) => {
        const span = document.createElement('span');
        span.style.marginRight = '8px';
        span.innerHTML = `
          <select class="actType">
            <option value="settle" ${a.type==='settle'?'selected':''}>Settle</option>
            <option value="scan" ${a.type==='scan'?'selected':''}>Scan</option>
            <option value="move" ${a.type==='move'?'selected':''}>Move</option>
          </select>
          <button class="remAct">✖</button>`;
        span.querySelector('.actType').onchange = e => { a.type = e.target.value; };
        span.querySelector('.remAct').onclick = () => {
          actions.splice(ai, 1);
          this.render();
        };
        container.appendChild(span);
      });
    }
  };

  function showBotBuilder(chosenSeed) {
    const overlay = document.getElementById('botBuilderOverlay');
    if (!overlay) {
      alert('Bot builder overlay not found. Ensure the HTML overlay is present.');
      return;
    }
    overlay._botSeed = chosenSeed;
    overlay.style.display = 'block';

    const saved = localStorage.getItem('settlerBotProgram');
    BlockBuilder.init('blockCanvas', saved);

    document.getElementById('addWhenBlock').onclick = () => BlockBuilder.addWhenBlock();

    document.getElementById('launchBotBtn').onclick = () => {
      const json = BlockBuilder.serialize();
      let program;
      try { program = JSON.parse(json); } catch(e) { alert('Invalid program structure.'); return; }
      GameState.botProgram = program;
      localStorage.setItem('settlerBotProgram', json);
      GameState.botMode = true;
      overlay.style.display = 'none';
      ui.gameScreen.style.display = 'block';
      startNewGame(overlay._botSeed || null);
    };
    document.getElementById('cancelBotBtn').onclick = () => {
      overlay.style.display = 'none';
    };
    // ---- NEW: Export & Import bindings ----
    document.getElementById('exportBotBtn').onclick = () => {
      const json = BlockBuilder.serialize();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'caravan-bot-program.json';
      a.click();
      URL.revokeObjectURL(url);
    };

    document.getElementById('importBotBtn').onclick = () => {
      document.getElementById('importBotFile').click();
    };
    document.getElementById('importBotFile').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const program = JSON.parse(ev.target.result);
          BlockBuilder.program = program;
          BlockBuilder.render();
        } catch (err) {
          alert('Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    };
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
      pendingBotMode = true;
      ui.menuScreen.style.display = 'none';
      ui.backstoryOverlay.style.display = 'block';
      ui.currentSeedDisplay.textContent = Date.now();
      ui.seedInput.value = '';
    });
    document.getElementById('startGameBtn').addEventListener('click', () => {
      const seed = ui.seedInput.value || null;
      ui.backstoryOverlay.style.display = 'none';
      if (pendingBotMode) {
        pendingBotMode = false;
        showBotBuilder(seed);
      } else {
        ui.gameScreen.style.display = 'block';
        startNewGame(seed);
      }
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
