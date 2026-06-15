// bot.js – IF and ELSE as separate blocks, linear script execution
(function() {
  'use strict';

  // ---- GAME STATS (show numbers) ----
  const GAME_STATS = ['settlers','scanner','unity','knowledge','moves'];

  // ---- LOCATION ATTRIBUTES (show colours) ----
  const LOCATION_ATTRS = ['waterSupply','land','temperature','radiation'];

  const ATTRIBUTES = [
    { value: 'settlers', label: 'Settlers', type: 'stat' },
    { value: 'scanner', label: 'Scanner', type: 'stat' },
    { value: 'unity', label: 'Unity', type: 'stat' },
    { value: 'knowledge', label: 'Knowledge', type: 'stat' },
    { value: 'moves', label: 'Moves', type: 'stat' },
    { value: 'waterSupply', label: 'Water', type: 'location' },
    { value: 'land', label: 'Land', type: 'location' },
    { value: 'temperature', label: 'Temperature', type: 'location' },
    { value: 'radiation', label: 'Radiation', type: 'location' }
  ];

  const NUM_OPERATORS = [
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' }
  ];

  const COLOUR_LEVELS = [
    { value: 'green', label: 'Green' },
    { value: 'orange', label: 'Orange' },
    { value: 'red', label: 'Red' }
  ];

  const ACTIONS = [
    { value: 'move', label: 'Move' },
    { value: 'settle', label: 'Settle' },
    { value: 'pickBestFor', label: 'Pick best for...' },
    { value: 'wait', label: 'Wait / Acknowledge' }
  ];

  const PRIORITY_STATS = [
    { value: 'settlers', label: 'Settlers' },
    { value: 'scanner', label: 'Scanner' },
    { value: 'unity', label: 'Unity' },
    { value: 'knowledge', label: 'Knowledge' },
    { value: 'upgrade', label: 'Upgrade' }
  ];

  // ---------- BUILDER UI ----------
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'botOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;background:rgba(0,0,0,0.9);color:#eee;font-family:monospace;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#1a1a2e;padding:20px;border-radius:10px;width:95%;max-width:900px;max-height:90vh;overflow-y:auto;">
        <h2>Bot Builder</h2>
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          <button class="addBlock" data-type="while">+ While</button>
          <button class="addBlock" data-type="if">+ If</button>
          <button class="addBlock" data-type="else">+ Else</button>
          <button class="addBlock" data-type="action">+ Action</button>
        </div>
        <div id="botScript" style="background:#16213e;padding:10px;min-height:200px;border:1px dashed #4ecdc4;margin-bottom:10px;">
          <p class="placeholder">Add blocks to build the bot's logic...</p>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          <button class="tpl" data-tpl="safe">Safe Settle</button>
          <button class="tpl" data-tpl="explorer">Explorer</button>
          <button class="tpl" data-tpl="balanced">Balanced</button>
          <button class="tpl" data-tpl="rush">Rush</button>
        </div>
        <button id="runBot" style="display:block;width:100%;padding:10px;background:#27ae60;color:white;border:none;font-size:18px;cursor:pointer;">Run Bot</button>
        <div id="botLog" style="background:#000;color:#0f0;margin-top:10px;padding:5px;max-height:150px;overflow-y:auto;font-size:12px;"></div>
      </div>`;
    return overlay;
  }

  // ---- BLOCK HTML (IF/ELSE are separate, no nested bodies) ----
  function blockHTML(type, defaults = {}) {
    const id = 'b' + Math.random().toString(36).substr(2,6);
    if (type === 'while') {
      const attr = defaults.attr || 'settlers';
      const isStat = GAME_STATS.includes(attr);
      const opOptions = isStat ? NUM_OPERATORS : COLOUR_LEVELS;
      const valDisplay = isStat ? 'inline' : 'none';
      return `<div class="block while" data-id="${id}" data-type="while">
        <div class="header">WHILE
          <select class="attr">${ATTRIBUTES.map(a => `<option value="${a.value}" ${a.value===attr?'selected':''}>${a.label}</option>`).join('')}</select>
          <select class="op">${opOptions.map(o => `<option value="${o.value}" ${o.value===(defaults.op||(isStat?'>':'green'))?'selected':''}>${o.label}</option>`).join('')}</select>
          <input class="val" type="number" value="${defaults.val||500}" min="0" style="display:${valDisplay}">
          <button class="del">x</button>
        </div>
        <div class="body"></div>
      </div>`;
    }
    if (type === 'if') {
      const attr = defaults.attr || 'waterSupply';
      const isStat = GAME_STATS.includes(attr);
      const opOptions = isStat ? NUM_OPERATORS : COLOUR_LEVELS;
      const valDisplay = isStat ? 'inline' : 'none';
      return `<div class="block if" data-id="${id}" data-type="if">
        <div class="header">IF
          <select class="attr">${ATTRIBUTES.map(a => `<option value="${a.value}" ${a.value===attr?'selected':''}>${a.label}</option>`).join('')}</select>
          <select class="op">${opOptions.map(o => `<option value="${o.value}" ${o.value===(defaults.op||(isStat?'>':'green'))?'selected':''}>${o.label}</option>`).join('')}</select>
          <input class="val" type="number" value="${defaults.val||100}" min="0" style="display:${valDisplay}">
          <button class="del">x</button>
        </div>
      </div>`;
    }
    if (type === 'else') {
      return `<div class="block else-block" data-id="${id}" data-type="else">
        <div class="header">ELSE <button class="del">x</button></div>
      </div>`;
    }
    if (type === 'action') {
      if (defaults.action === 'pickBestFor') {
        return `<div class="block action" data-id="${id}" data-type="action">
          <div class="header">DO Pick best for
            <select class="pickStat">${PRIORITY_STATS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}</select>
            <button class="del">x</button>
          </div>
        </div>`;
      }
      return `<div class="block action" data-id="${id}" data-type="action">
        <div class="header">DO
          <select class="act">${ACTIONS.map(a => `<option value="${a.value}" ${a.value===defaults.action?'selected':''}>${a.label}</option>`).join('')}</select>
          <button class="del">x</button>
        </div>
      </div>`;
    }
  }

  // ---- STYLES ----
  const style = document.createElement('style');
  style.textContent = `
    .block { margin:5px 0; padding:8px; background:#0f3460; border-left:4px solid #4ecdc4; position:relative; }
    .while { border-left-color:#e74c3c; }
    .if { border-left-color:#f39c12; }
    .else-block { border-left-color:#95a5a6; }
    .action { border-left-color:#2ecc71; }
    .header { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .header select, .header input { background:#1a1a2e; color:#eee; border:1px solid #4ecdc4; padding:2px 5px; }
    .header input { width:80px; }
    .body { margin-left:20px; padding-left:10px; border-left:2px solid #4ecdc4; }
    .del { background:#e74c3c; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:14px; line-height:1; position:absolute; right:5px; top:5px; }
    .exec-hl { box-shadow: 0 0 15px #4ecdc4; transition: 0.2s; }
  `;
  document.head.appendChild(style);

  // ---------- BOT STATE ----------
  let botActive = false;
  const botSpeed = 800;
  let currentScriptRoot = null;

  // ---------- SHOW BUILDER ----------
  window.showBotBuilder = function() {
    const root = document.getElementById('botBuilderRoot');
    root.innerHTML = '';
    root.appendChild(createOverlay());

    const scriptArea = document.getElementById('botScript');
    currentScriptRoot = scriptArea;

    // Attribute change -> toggle operator/value
    scriptArea.addEventListener('change', (e) => {
      if (e.target.classList.contains('attr')) {
        const block = e.target.closest('.block');
        const attr = e.target.value;
        const isStat = GAME_STATS.includes(attr);
        const opSelect = block.querySelector('.op');
        const valInput = block.querySelector('.val');
        if (!opSelect || !valInput) return;
        const opOptions = isStat ? NUM_OPERATORS : COLOUR_LEVELS;
        opSelect.innerHTML = opOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
        valInput.style.display = isStat ? 'inline' : 'none';
      }
    });

    // Block type buttons
    document.querySelectorAll('.addBlock').forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.type;
        const html = blockHTML(type, {attr:'settlers', op:'>', val:500, action:'move'});
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const el = temp.firstChild;
        scriptArea.appendChild(el);
        const ph = scriptArea.querySelector('.placeholder');
        if (ph) ph.remove();
        bindBlockEvents(el);
      };
    });

    // Templates
    document.querySelectorAll('.tpl').forEach(btn => {
      btn.onclick = () => {
        scriptArea.innerHTML = '';
        const tpl = btn.dataset.tpl;
        if (tpl === 'safe') {
          addTemplate(scriptArea, [
            {type:'while', attr:'settlers', op:'>', val:500, children:[
              {type:'if', attr:'waterSupply', op:'green'},
              {type:'if', attr:'radiation', op:'green'},
              {type:'action', action:'settle'},
              {type:'else'},
              {type:'action', action:'move'},
              {type:'action', action:'pickBestFor', pickStat:'waterSupply'},
              {type:'action', action:'pickBestFor', pickStat:'radiation'}
            ]}
          ]);
        } else if (tpl === 'explorer') {
          addTemplate(scriptArea, [
            {type:'while', attr:'moves', op:'<', val:15, children:[
              {type:'if', attr:'radiation', op:'green'},
              {type:'if', attr:'waterSupply', op:'green'},
              {type:'action', action:'settle'},
              {type:'else'},
              {type:'action', action:'move'},
              {type:'action', action:'pickBestFor', pickStat:'waterSupply'}
            ]}
          ]);
        } else if (tpl === 'balanced') {
          addTemplate(scriptArea, [
            {type:'while', attr:'settlers', op:'>', val:300, children:[
              {type:'if', attr:'unity', op:'>', val:80},
              {type:'if', attr:'temperature', op:'green'},
              {type:'action', action:'settle'},
              {type:'else'},
              {type:'action', action:'move'},
              {type:'action', action:'pickBestFor', pickStat:'settlers'}
            ]}
          ]);
        } else if (tpl === 'rush') {
          addTemplate(scriptArea, [{type:'action', action:'settle'}]);
        }
      };
    });

    document.getElementById('runBot').onclick = () => runBot(scriptArea);
  };

  function addTemplate(parent, defs) {
    defs.forEach(def => {
      const html = blockHTML(def.type, def);
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const el = temp.firstChild;
      parent.appendChild(el);
      bindBlockEvents(el);
      if (def.children) {
        const body = el.querySelector('.body');
        if (body) addTemplate(body, def.children);
      }
    });
  }

  function bindBlockEvents(el) {
    el.querySelector('.del')?.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
    });
  }

  // ---------- EXECUTION (flat model with separate ELSE) ----------
  async function runBot(scriptRoot) {
    if (botActive) return;
    botActive = true;
    log('Bot started.');

    if (!window.GameState || !window.GameState.isActive) {
      const seed = document.getElementById('seedInput')?.value || null;
      window.startNewGame(seed);
      await sleep(500);
    }

    await executeContainer(scriptRoot);

    botActive = false;
    log('Bot finished.');
  }

  // Execute a list of sibling blocks
  async function executeContainer(container) {
    const children = Array.from(container.children);
    let i = 0;
    while (i < children.length && botActive && window.GameState.isActive && !window.GameState.gameOver) {
      const child = children[i];
      child.classList.add('exec-hl');
      await sleep(botSpeed / 2);
      child.classList.remove('exec-hl');

      if (child.dataset.type === 'if') {
        // Find matching ELSE
        let elseBlock = null;
        for (let j = i + 1; j < children.length; j++) {
          if (children[j].dataset.type === 'else') {
            elseBlock = children[j];
            break;
          }
        }

        const conditionTrue = evaluateCondition(child);
        if (conditionTrue) {
          // Execute blocks after IF up to the ELSE (or end)
          let k = i + 1;
          while (k < children.length && children[k] !== elseBlock) {
            const block = children[k];
            block.classList.add('exec-hl');
            await sleep(botSpeed / 2);
            block.classList.remove('exec-hl');
            await executeBlock(block, children, k);
            await sleep(botSpeed);
            k++;
          }
        } else {
          // Execute blocks after ELSE (if present)
          if (elseBlock) {
            let k = children.indexOf(elseBlock) + 1;
            while (k < children.length) {
              const block = children[k];
              // Stop at the next IF at this level? For simplicity, execute to end.
              block.classList.add('exec-hl');
              await sleep(botSpeed / 2);
              block.classList.remove('exec-hl');
              await executeBlock(block, children, k);
              await sleep(botSpeed);
              k++;
            }
          }
        }
        // Skip past the entire if-else construct
        i = elseBlock ? children.indexOf(elseBlock) + 1 : children.length;
        continue;
      }

      // Non-IF block
      await executeBlock(child, children, i);
      await sleep(botSpeed);
      i++;
    }
  }

  async function executeBlock(block, siblings, index) {
    const type = block.dataset.type;
    if (type === 'while') {
      let iter = 0;
      while (botActive && window.GameState.isActive && !window.GameState.gameOver && iter < 100) {
        if (!evaluateCondition(block)) break;
        const body = block.querySelector('.body');
        if (body) await executeContainer(body);
        iter++;
      }
    }
    else if (type === 'action') {
      await executeAction(block, siblings, index);
    }
    // else blocks are just markers, no action
  }

  async function executeAction(block, siblings, index) {
    const actEl = block.querySelector('.act');
    let action = actEl ? actEl.value : null;
    if (!action) {
      action = 'pickBestFor';
    }

    log('DO ' + action);

    switch (action) {
      case 'move':
        clickButton('moveBtn');
        break;
      case 'settle':
        clickButton('settleBtn');
        break;
      case 'pickBestFor':
        await pickBestFor(block);
        break;
      case 'wait':
        clickAcknowledge();
        break;
    }

    if (action === 'move' || action === 'settle') {
      await autoHandleEvents(siblings, index);
    }
    if (action === 'pickBestFor') {
      await autoAcknowledgeIfPresent();
    }
    await waitForIdle();
  }

  async function pickBestFor(block) {
    let tries = 0;
    while (botActive && tries < 30) {
      const btns = document.querySelectorAll('#eventPanelChoices .event-choice-btn');
      if (btns.length > 0) break;
      await sleep(100);
      tries++;
    }

    const event = window.GameState?.pendingEvent;
    if (!event || !event.choices || event.choices.length === 0) {
      log('No choice event for Pick best for');
      return;
    }

    const stat = block.querySelector('.pickStat')?.value || 'settlers';
    let bestIndex = 0;
    let bestVal = -Infinity;

    event.choices.forEach((choice, idx) => {
      const info = choice.info;
      if (!info) return;
      const val = info[stat] !== undefined ? info[stat] : 0;
      if (val > bestVal) {
        bestVal = val;
        bestIndex = idx;
      }
    });

    log('Picked option ' + (bestIndex+1) + ' for ' + stat);
    clickChoice(bestIndex);
  }

  async function autoHandleEvents(siblings, currentIndex) {
    let handled = true;
    while (handled && botActive && window.GameState.isActive && !window.GameState.gameOver) {
      handled = false;
      const ackBtn = document.querySelector('#eventPanelChoices button:not(.event-choice-btn)');
      if (ackBtn && ackBtn.textContent.includes('Acknowledge')) {
        ackBtn.click();
        log('Acknowledged event');
        handled = true;
        await sleep(botSpeed);
        continue;
      }
      const choiceBtns = document.querySelectorAll('#eventPanelChoices .event-choice-btn');
      if (choiceBtns.length > 0) break;
    }
  }

  async function autoAcknowledgeIfPresent() {
    let attempts = 0;
    while (attempts < 20 && botActive) {
      const ackBtn = document.querySelector('#eventPanelChoices button:not(.event-choice-btn)');
      if (ackBtn && ackBtn.textContent.includes('Acknowledge')) {
        ackBtn.click();
        log('Acknowledged after choice');
        await sleep(botSpeed);
        return;
      }
      await sleep(100);
      attempts++;
    }
  }

  function clickButton(id) {
    const btn = document.getElementById(id);
    if (btn && !btn.disabled) {
      btn.click();
      log('Clicked ' + id);
    } else {
      log('Button ' + id + ' not available');
    }
  }

  function clickChoice(index) {
    const choices = document.querySelectorAll('#eventPanelChoices .event-choice-btn');
    if (choices.length > index) {
      choices[index].click();
      log('Chose Option ' + (index+1));
    } else {
      log('Choice option ' + (index+1) + ' not available');
    }
  }

  function clickAcknowledge() {
    const ack = document.querySelector('#eventPanelChoices button:not(.event-choice-btn)');
    if (ack && ack.textContent.includes('Acknowledge')) {
      ack.click();
      log('Acknowledged');
    }
  }

  function evaluateCondition(block) {
    const src = block.querySelector('.src')?.value || 'current';
    const attr = block.querySelector('.attr')?.value;
    const op = block.querySelector('.op')?.value;
    const valInput = block.querySelector('.val');
    const val = valInput ? (parseInt(valInput.value) || 0) : 0;
    if (!attr || !op) return true;

    let curValue;
    const isStat = GAME_STATS.includes(attr);

    if (src === 'current') {
      if (isStat) {
        curValue = window.GameState[attr];
      } else if (window.GameState.currentLocation) {
        curValue = window.GameState.currentLocation[attr];
      } else {
        return false;
      }

      if (isStat) {
        switch (op) {
          case '>': return curValue > val;
          case '<': return curValue < val;
          case '>=': return curValue >= val;
          case '<=': return curValue <= val;
          default: return false;
        }
      } else {
        if (op === 'green') return curValue < 100;
        if (op === 'orange') return curValue >= 100 && curValue < 250;
        if (op === 'red') return curValue >= 250;
        return false;
      }
    } else if (src === 'choice1info' || src === 'choice2info') {
      const event = window.GameState?.pendingEvent;
      if (!event || !event.choices) return false;
      const idx = src === 'choice1info' ? 0 : 1;
      if (idx >= event.choices.length) return false;
      const info = event.choices[idx].info;
      if (!info || info[attr] === undefined) return false;
      curValue = info[attr];
      switch (op) {
        case '>': return curValue > val;
        case '<': return curValue < val;
        case '>=': return curValue >= val;
        case '<=': return curValue <= val;
        default: return false;
      }
    }
    return false;
  }

  async function waitForIdle() {
    let wait = 0;
    while (botActive && wait < 50) {
      const moveBtn = document.getElementById('moveBtn');
      if (moveBtn && !moveBtn.disabled) break;
      await sleep(200);
      wait++;
    }
  }

  function log(msg) {
    const logDiv = document.getElementById('botLog');
    if (logDiv) {
      logDiv.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
      logDiv.scrollTop = logDiv.scrollHeight;
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();