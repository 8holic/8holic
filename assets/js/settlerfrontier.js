/************************************************************
 * CARAVAN LOGIC GAME – TEACHING LOGICAL STATEMENTS
 * 
 * This script manages:
 * - Building conditional rules via UI
 * - Evaluating those rules each turn
 * - Updating caravan and area state
 * - Handling game end (settlement or death)
 * 
 * All functions are prefixed with comments for easy editing.
 ************************************************************/

// ========== 1. GLOBAL STATE ==========
const caravan = {
  supply: 100,
  manpower: 10,
  isAlive: true,
  hasSettled: false
};

const currentArea = {
  forestry: 50,
  water: 50,
  temperature: 50,
  wildlife: 'docile'      // 'docile' or 'dangerous'
};

let turn = 0;
let gameActive = false;   // true after player clicks "Start Journey"
let rules = [];           // will hold rule objects built from UI

// ========== 2. DOM ELEMENT REFERENCES ==========
// (Update these if your IDs differ)
const DOM = {
  supply: document.getElementById('supplyValue'),
  manpower: document.getElementById('manpowerValue'),
  turn: document.getElementById('turnValue'),
  forestry: document.getElementById('forestryValue'),
  water: document.getElementById('waterValue'),
  temperature: document.getElementById('temperatureValue'),
  wildlife: document.getElementById('wildlifeValue'),
  rulesContainer: document.getElementById('rulesContainer'),
  addRuleBtn: document.getElementById('addRuleBtn'),
  startGameBtn: document.getElementById('startGameBtn'),
  nextTurnBtn: document.getElementById('nextTurnBtn'),
  gameLog: document.getElementById('gameLog'),
  settlementScore: document.getElementById('settlementScoreDisplay')
};

// ========== 3. HELPER FUNCTIONS ==========

/**
 * Log a message to the game log panel.
 * @param {string} message
 */
function log(message) {
  if (!DOM.gameLog) return;
  const entry = document.createElement('div');
  entry.textContent = `> ${message}`;
  DOM.gameLog.appendChild(entry);
  DOM.gameLog.scrollTop = DOM.gameLog.scrollHeight;
}

/**
 * Clear the game log.
 */
function clearLog() {
  if (DOM.gameLog) DOM.gameLog.innerHTML = '';
}

/**
 * Generate a random integer between min and max (inclusive).
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ========== 4. AREA GENERATION ==========
function generateNewArea() {
  currentArea.forestry = randomInt(0, 100);
  currentArea.water = randomInt(0, 100);
  currentArea.temperature = randomInt(0, 100);
  // 30% chance of dangerous wildlife
  currentArea.wildlife = Math.random() < 0.3 ? 'dangerous' : 'docile';
}

// ========== 5. UI UPDATE FUNCTIONS ==========
function updateCaravanUI() {
  DOM.supply.textContent = caravan.supply;
  DOM.manpower.textContent = caravan.manpower;
  DOM.turn.textContent = turn;
}

function updateAreaUI() {
  DOM.forestry.textContent = currentArea.forestry;
  DOM.water.textContent = currentArea.water;
  DOM.temperature.textContent = currentArea.temperature;
  DOM.wildlife.textContent = currentArea.wildlife;
}

function updateAllUI() {
  updateCaravanUI();
  updateAreaUI();
}

// ========== 6. RULE EVALUATION ENGINE ==========

/**
 * Evaluate a single condition node against current caravan and area.
 * @param {object} cond - Condition object (type: 'comparison', 'AND', 'OR')
 * @returns {boolean}
 */
function evaluateCondition(cond) {
  switch (cond.type) {
    case 'comparison': {
      let leftValue;
      if (cond.attr === 'supply' || cond.attr === 'manpower') {
        leftValue = caravan[cond.attr];
      } else {
        leftValue = currentArea[cond.attr];
      }
      switch (cond.op) {
        case '<':  return leftValue < cond.value;
        case '>':  return leftValue > cond.value;
        case '<=': return leftValue <= cond.value;
        case '>=': return leftValue >= cond.value;
        case '==': return leftValue == cond.value;
        default:   return false;
      }
    }
    case 'AND':
      return evaluateCondition(cond.left) && evaluateCondition(cond.right);
    case 'OR':
      return evaluateCondition(cond.left) || evaluateCondition(cond.right);
    default:
      return false;
  }
}

/**
 * Find the first rule whose condition evaluates to true.
 * @returns {object|null} The matching rule object, or null if none.
 */
function findMatchingRule() {
  for (let rule of rules) {
    if (evaluateCondition(rule.condition)) {
      return rule;
    }
  }
  return null;
}

// ========== 7. GAME ACTIONS (EFFECTS) ==========
function applyAction(action) {
  switch (action) {
    case 'move':
      caravan.supply -= 10;
      if (currentArea.wildlife === 'dangerous') {
        caravan.manpower = Math.max(0, caravan.manpower - 2);
        log('⚠️ Dangerous wildlife! Lost 2 manpower while moving.');
      }
      log('Caravan moved to a new area. Supply -10.');
      break;
    case 'rest':
      caravan.supply -= 5;
      // optional: recover a small amount of manpower?
      log('Caravan rested. Supply -5.');
      break;
    case 'settle':
      caravan.hasSettled = true;
      gameActive = false;
      log('✅ The caravan has settled!');
      break;
    default:
      log('❓ Unknown action – doing nothing.');
  }

  // Check for death conditions
  if (caravan.supply <= 0 || caravan.manpower <= 0) {
    caravan.isAlive = false;
    caravan.hasSettled = false;
    gameActive = false;
    log('💀 The caravan has perished...');
  }
}

// ========== 8. SCORE CALCULATION ==========
function calculateSettlementScore() {
  const survivalBonus = (caravan.supply * 2) + (caravan.manpower * 10);
  const areaBonus = (currentArea.forestry + currentArea.water + currentArea.temperature) * 2;
  const wildlifePenalty = currentArea.wildlife === 'dangerous' ? -50 : 0;
  const turnPenalty = turn * 5;
  return Math.max(0, survivalBonus + areaBonus + wildlifePenalty - turnPenalty);
}

function displayScore() {
  if (DOM.settlementScore) {
    const score = calculateSettlementScore();
    DOM.settlementScore.textContent = `Final Score: ${score}`;
  }
}

// ========== 9. TURN SIMULATION ==========
function advanceTurn() {
  if (!gameActive) {
    log('⏸️ Game is not active. Press "Start Journey" to begin.');
    return;
  }

  turn++;
  log(`--- Turn ${turn} ---`);

  // 1. Generate new area
  generateNewArea();
  log(`Area: Forestry ${currentArea.forestry}, Water ${currentArea.water}, Temp ${currentArea.temperature}, Wildlife ${currentArea.wildlife}`);

  // 2. Find matching rule
  const matchedRule = findMatchingRule();
  let actionTaken = 'move'; // fallback default

  if (matchedRule) {
    actionTaken = matchedRule.action;
    log(`📋 Rule matched: ${matchedRule.description || 'custom rule'} → Action: ${actionTaken}`);
  } else {
    log('⚠️ No rule matched. Default action: MOVE.');
  }

  // 3. Apply action effects
  applyAction(actionTaken);

  // 4. Update UI
  updateAllUI();

  // 5. Check end states
  if (caravan.hasSettled) {
    displayScore();
    DOM.nextTurnBtn.disabled = true;
  } else if (!caravan.isAlive) {
    DOM.nextTurnBtn.disabled = true;
  }

  // Prevent negative values in display
  if (caravan.supply < 0) caravan.supply = 0;
  if (caravan.manpower < 0) caravan.manpower = 0;
  updateCaravanUI();
}

// ========== 10. RULE BUILDER UI ==========

/**
 * Create a new rule row in the DOM.
 * @param {object} ruleData - Optional pre-filled rule (for editing)
 * @returns {HTMLElement} The row element
 */
function createRuleRow(ruleData = null) {
  const row = document.createElement('div');
  row.className = 'rule-row';
  row.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; padding: 8px; background: #2a2a2a; border-radius: 8px;';

  // Condition builder (simplified: one comparison per rule for clarity)
  // For a more advanced builder you'd add AND/OR connectors, but this keeps it simple.
  const attrSelect = document.createElement('select');
  attrSelect.innerHTML = `
    <option value="supply">Supply</option>
    <option value="manpower">Manpower</option>
    <option value="forestry">Forestry</option>
    <option value="water">Water</option>
    <option value="temperature">Temperature</option>
  `;
  
  const opSelect = document.createElement('select');
  opSelect.innerHTML = `
    <option value="<">&lt;</option>
    <option value=">">&gt;</option>
    <option value="<=">&le;</option>
    <option value=">=">&ge;</option>
    <option value="==">=</option>
  `;

  const valueInput = document.createElement('input');
  valueInput.type = 'number';
  valueInput.min = 0;
  valueInput.max = 100;
  valueInput.value = 50;
  valueInput.style.width = '70px';

  // Action select
  const actionSelect = document.createElement('select');
  actionSelect.innerHTML = `
    <option value="move">Move</option>
    <option value="rest">Rest</option>
    <option value="settle">Settle</option>
  `;

  // Description (visible in log)
  const descInput = document.createElement('input');
  descInput.type = 'text';
  descInput.placeholder = 'Rule description';
  descInput.style.flex = '1 1 150px';

  const removeBtn = document.createElement('button');
  removeBtn.textContent = '✕';
  removeBtn.style.background = '#8b3a3a';
  removeBtn.onclick = () => row.remove();

  row.appendChild(attrSelect);
  row.appendChild(opSelect);
  row.appendChild(valueInput);
  row.appendChild(document.createTextNode('then'));
  row.appendChild(actionSelect);
  row.appendChild(descInput);
  row.appendChild(removeBtn);

  // If we have ruleData, populate it
  if (ruleData) {
    attrSelect.value = ruleData.condition.attr;
    opSelect.value = ruleData.condition.op;
    valueInput.value = ruleData.condition.value;
    actionSelect.value = ruleData.action;
    descInput.value = ruleData.description || '';
  }

  return row;
}

/**
 * Build the `rules` array from the current UI rows.
 */
function buildRulesFromUI() {
  const rows = DOM.rulesContainer.querySelectorAll('.rule-row');
  rules = [];
  rows.forEach(row => {
    const selects = row.querySelectorAll('select');
    const attr = selects[0].value;
    const op = selects[1].value;
    const value = parseFloat(row.querySelector('input[type="number"]').value);
    const action = selects[2].value;
    const desc = row.querySelector('input[type="text"]').value || `${attr} ${op} ${value}`;

    rules.push({
      condition: {
        type: 'comparison',
        attr: attr,
        op: op,
        value: value
      },
      action: action,
      description: desc
    });
  });
}

// ========== 11. GAME INITIALIZATION / RESET ==========
function resetGame() {
  caravan.supply = 100;
  caravan.manpower = 10;
  caravan.isAlive = true;
  caravan.hasSettled = false;
  turn = 0;
  gameActive = false;

  generateNewArea();
  updateAllUI();
  clearLog();
  log('🔄 Game reset. Build your rules and press "Start Journey".');

  if (DOM.settlementScore) DOM.settlementScore.textContent = '';
  DOM.nextTurnBtn.disabled = true;
}

function startJourney() {
  if (gameActive) {
    log('⚠️ Journey already in progress.');
    return;
  }
  // Build rules from current UI
  buildRulesFromUI();
  if (rules.length === 0) {
    log('⚠️ You must add at least one rule before starting.');
    return;
  }

  resetGame();               // fresh state but keep rules
  gameActive = true;
  DOM.nextTurnBtn.disabled = false;
  log('🚀 Journey started! Press "Next Turn" to advance.');
}

// ========== 12. EVENT LISTENERS & SETUP ==========
function init() {
  // Add rule button
  DOM.addRuleBtn.addEventListener('click', () => {
    const newRow = createRuleRow();
    DOM.rulesContainer.appendChild(newRow);
  });

  // Start game button
  DOM.startGameBtn.addEventListener('click', startJourney);

  // Next turn button
  DOM.nextTurnBtn.addEventListener('click', () => {
    if (!gameActive) return;
    // Rebuild rules from UI in case player edited them while paused? (optional)
    // For simplicity we assume rules are final after start, but you can call buildRulesFromUI() again.
    advanceTurn();
  });

  // Initial reset
  resetGame();
  // Add one default rule row for convenience
  const defaultRow = createRuleRow({
    condition: { type: 'comparison', attr: 'supply', op: '<', value: 20 },
    action: 'settle',
    description: 'Low supplies, settle if possible'
  });
  DOM.rulesContainer.appendChild(defaultRow);
}

// Start everything when DOM is ready
document.addEventListener('DOMContentLoaded', init);