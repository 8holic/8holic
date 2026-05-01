/************************************************************
 * CARAVAN SURVIVAL – BOT MODE
 ************************************************************/
(function() {
  "use strict";

  const C = window.Caravan;
  if (!C) throw new Error('Core not loaded');

  const {
    GameState, ui, EVENT_LIST, SCIENCE_EVENT_LIST, UNITY_EVENT_LIST, MILESTONE_POOL, MILESTONE_RAW,
    LOCATION_ATTRIBUTES, seededRandomInt, hashStringToSeed,
    applyLocationGeneration, updateUI, displayLocation, updateTerrarianDisplay,
    log, clearLog, scanLocation, settle, startNewGame, loadGameData,
    clearEventPanel, disableActions, enableActions,
    manualHandlers
  } = C;

  let pendingBotMode = false;

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
      const visible = (state.currentLocation.visible && state.currentLocation.visible[attr] !== false);
      let tier;
      if (visible) {
        const roll = state.currentLocation[attr];
        tier = roll >= 200 ? 'red' : (roll >= 75 ? 'orange' : 'green');
      } else {
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
    return false;
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

  // ---------- BOT EVENT OVERRIDES ----------
  function displayAutoEventBot(event, outcomeMessage, choiceText = null) {
    GameState.pendingEvent = event;
    let html = event.description;
    if (choiceText) html += '<br><br>➡️ ' + choiceText;
    html += '<br><br>' + outcomeMessage;
    ui.eventPanelDescription.innerHTML = html;
    ui.eventPanelChoices.innerHTML = '';

    if (GameState.botMode) {
      setTimeout(() => { processEventQueueBot(); }, 1800);
    } else {
      // fallback to manual
      const ackBtn = document.createElement('button');
      ackBtn.textContent = '✔️ Acknowledge';
      ackBtn.classList.add('game-btn');
      ackBtn.addEventListener('click', () => { processEventQueueBot(); });
      ui.eventPanelChoices.appendChild(ackBtn);
    }
    disableActions();
  }

  function displayChoiceEventBot(event) {
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
        displayAutoEventBot(event, message, chosen.text);
      }, 800);
    } else {
      event.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.textContent = choice.text;
        btn.classList.add('game-btn', 'event-choice-btn');
        btn.addEventListener('click', () => {
          const message = choice.effect(GameState);
          log(`📌 Event: ${event.name} – ${message}`);
          displayAutoEventBot(event, message, choice.text);
        });
        ui.eventPanelChoices.appendChild(btn);
      });
    }
    disableActions();
  }

  function processEventQueueBot() {
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
            if (!GameState.gameOver) moveToNextLocationBot();
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
        moveToNextLocationBot();
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
      displayAutoEventBot(event, message);
    } else {
      displayChoiceEventBot(event);
    }
    disableActions();
  }

  function moveToNextLocationBot() {
    if (!GameState.isActive || GameState.gameOver) return;
    GameState.moves++;
    if (GameState.moves > 0 && GameState.moves % 6 === 0 && MILESTONE_POOL.length > 0) {
      const idx = seededRandomInt(0, MILESTONE_POOL.length - 1);
      const milestoneEvent = MILESTONE_POOL.splice(idx, 1)[0];
      log('🌟 A milestone has been reached!');
      GameState.eventQueue.unshift(milestoneEvent);
    }
    GameState.eventQueue = [];

    const FLOOR_BASE = 0, MAX_BASE = 20, MAX_CAP = 70, SHIFT_PER_MOVE = 2;
    let floor = FLOOR_BASE + SHIFT_PER_MOVE * GameState.moves;
    let max = MAX_BASE + SHIFT_PER_MOVE * GameState.moves;
    if (max > MAX_CAP) max = MAX_CAP;
    if (floor > max) floor = max;

    let eventIndex = seededRandomInt(floor, max);
    if (eventIndex >= EVENT_LIST.length) eventIndex = EVENT_LIST.length - 1;
    GameState.eventQueue.push(EVENT_LIST[eventIndex]);

    if (SCIENCE_EVENT_LIST.length > 0 && Math.random() < GameState.knowledge / 100) {
      const idx = seededRandomInt(0, SCIENCE_EVENT_LIST.length - 1);
      GameState.eventQueue.push(SCIENCE_EVENT_LIST[idx]);
    }

    if (UNITY_EVENT_LIST.length > 0 && Math.random() < (100 - GameState.unity) / 100) {
      const idx = seededRandomInt(0, UNITY_EVENT_LIST.length - 1);
      GameState.eventQueue.push(UNITY_EVENT_LIST[idx]);
    }

    processEventQueueBot();
  }

  // ---------- BLOCK BUILDER (identical to previous) ----------
  const BlockBuilder = {
    program: [],
    canvas: null,
    init(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.program = [];
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

  // ---------- BOT BUILDER UI ----------
  function showBotBuilder(chosenSeed) {
    const overlay = document.getElementById('botBuilderOverlay');
    if (!overlay) return;
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
      // Kick off bot loop
      moveToNextLocationBot();
    };
    document.getElementById('cancelBotBtn').onclick = () => overlay.style.display = 'none';

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

  // ---------- DOM READY (override and setup) ----------
  document.addEventListener('DOMContentLoaded', function() {
    // Override the manual functions with our bot-aware versions
    // We'll store the manual ones just in case, but we replace them.
    C.manualHandlers.displayChoiceEvent = displayChoiceEventBot;
    C.manualHandlers.displayAutoEvent = displayAutoEventBot;
    C.manualHandlers.processEventQueue = processEventQueueBot;
    C.manualHandlers.moveToNextLocation = moveToNextLocationBot;

    // Re-wire the action buttons to use the new functions
    ui.moveBtn.removeEventListener('click', moveToNextLocationBot); // remove the manual listener
    ui.moveBtn.addEventListener('click', moveToNextLocationBot);
    ui.settleBtn.removeEventListener('click', settle);
    ui.settleBtn.addEventListener('click', settle);  // settle is unchanged
    ui.scanBtn.removeEventListener('click', scanLocation);
    ui.scanBtn.addEventListener('click', scanLocation); // scan is unchanged

    // Override the start game button behavior
    const startGameBtn = document.getElementById('startGameBtn');
    // Remove old listeners (we don't know the reference, so we replace the button with a clone)
    const newStartBtn = startGameBtn.cloneNode(true);
    startGameBtn.parentNode.replaceChild(newStartBtn, startGameBtn);
    newStartBtn.addEventListener('click', () => {
      const seed = ui.seedInput.value || null;
      ui.backstoryOverlay.style.display = 'none';
      if (pendingBotMode) {
        pendingBotMode = false;
        showBotBuilder(seed);
      } else {
        // manual mode fallback (should not happen if bot.js loaded)
        ui.gameScreen.style.display = 'block';
        startNewGame(seed);
      }
    });

    // Bot mode button
    document.getElementById('botModeBtn').addEventListener('click', () => {
      pendingBotMode = true;
      ui.menuScreen.style.display = 'none';
      ui.backstoryOverlay.style.display = 'block';
      ui.currentSeedDisplay.textContent = Date.now();
      ui.seedInput.value = '';
    });

    console.log('✅ Bot mode ready.');
  });

})();