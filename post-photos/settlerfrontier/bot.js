// bot.js — refactored into a real tree/chain control-flow system
(function () {
  'use strict';

  const GAME_STATS = ['settlers', 'scanner', 'unity', 'knowledge', 'moves'];
  const LOCATION_ATTRS = ['waterSupply', 'land', 'temperature', 'radiation'];

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

  const CONTROL_TYPES = new Set(['while', 'if', 'elseif', 'else']);
  const SCRIPT_CONTAINER_ID = 'botScript';

  let botActive = false;
  let botSpeed = 800;
  let currentScriptRoot = null;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function log(msg) {
    const logDiv = document.getElementById('botLog');
    if (!logDiv) return;
    logDiv.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'botOverlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:1000', 'background:rgba(0,0,0,0.9)',
      'color:#eee', 'font-family:monospace', 'display:flex', 'align-items:center', 'justify-content:center'
    ].join(';');

    overlay.innerHTML = `
      <div style="background:#1a1a2e;padding:20px;border-radius:10px;width:95%;max-width:1000px;max-height:90vh;overflow-y:auto;">
        <h2 style="margin-top:0;">Bot Builder</h2>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <button class="addBlock" data-type="while">+ While</button>
          <button class="addBlock" data-type="if">+ If</button>
          <button class="addBlock" data-type="elseif">+ Else If</button>
          <button class="addBlock" data-type="else">+ Else</button>
          <button class="addBlock" data-type="action">+ Action</button>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <button class="tpl" data-tpl="safe">Safe Settle</button>
          <button class="tpl" data-tpl="explorer">Explorer</button>
          <button class="tpl" data-tpl="balanced">Balanced</button>
          <button class="tpl" data-tpl="rush">Rush</button>
          <button class="tpl" data-tpl="empty">Empty</button>
        </div>

        <div id="${SCRIPT_CONTAINER_ID}" style="background:#16213e;padding:12px;min-height:240px;border:1px dashed #4ecdc4;margin-bottom:10px;">
          <p class="placeholder" style="opacity:.75;margin:0;">Add blocks to build the bot's logic...</p>
        </div>

        <button id="runBot" style="display:block;width:100%;padding:10px;background:#27ae60;color:white;border:none;font-size:18px;cursor:pointer;">Run Bot</button>
        <div id="botLog" style="background:#000;color:#0f0;margin-top:10px;padding:8px;max-height:180px;overflow-y:auto;font-size:12px;"></div>
      </div>`;

    return overlay;
  }

  function isStatAttr(attr) {
    return GAME_STATS.includes(attr);
  }

  function isBranchType(type) {
    return type === 'if' || type === 'elseif' || type === 'else';
  }

  function makeId() {
    return 'b' + Math.random().toString(36).slice(2, 8);
  }

  function conditionOperatorsFor(attr) {
    return isStatAttr(attr) ? NUM_OPERATORS : COLOUR_LEVELS;
  }

  function defaultAttrFor(type) {
    if (type === 'while') return 'settlers';
    if (type === 'if' || type === 'elseif') return 'waterSupply';
    return 'waterSupply';
  }

  function defaultOpFor(attr) {
    return isStatAttr(attr) ? '>' : 'green';
  }

  function blockHTML(type, defaults = {}) {
    const id = makeId();

    if (type === 'while' || type === 'if' || type === 'elseif') {
      const attr = defaults.attr || defaultAttrFor(type);
      const opOptions = conditionOperatorsFor(attr);
      const valDisplay = isStatAttr(attr) ? 'inline' : 'none';
      const title = type === 'while' ? 'WHILE' : (type === 'elseif' ? 'ELSE IF' : 'IF');

      return `
        <div class="block ${type}" data-id="${id}" data-type="${type}">
          <div class="header">
            <span>${title}</span>
            <select class="attr">${ATTRIBUTES.map(a => `<option value="${a.value}" ${a.value === attr ? 'selected' : ''}>${a.label}</option>`).join('')}</select>
            <select class="op">${opOptions.map(o => `<option value="${o.value}" ${o.value === (defaults.op || defaultOpFor(attr)) ? 'selected' : ''}>${o.label}</option>`).join('')}</select>
            <input class="val" type="number" value="${defaults.val ?? (type === 'while' ? 500 : 100)}" min="0" style="display:${valDisplay}">
            <button class="del" title="Delete">x</button>
          </div>
          <div class="body"></div>
        </div>`;
    }

    if (type === 'else') {
      return `
        <div class="block else-block" data-id="${id}" data-type="else">
          <div class="header">
            <span>ELSE</span>
            <button class="del" title="Delete">x</button>
          </div>
          <div class="body"></div>
        </div>`;
    }

    if (type === 'action') {
      const action = defaults.action || 'move';
      if (action === 'pickBestFor') {
        return `
          <div class="block action" data-id="${id}" data-type="action">
            <div class="header">
              <span>DO Pick best for</span>
              <select class="pickStat">${PRIORITY_STATS.map(p => `<option value="${p.value}" ${p.value === (defaults.pickStat || 'settlers') ? 'selected' : ''}>${p.label}</option>`).join('')}</select>
              <button class="del" title="Delete">x</button>
            </div>
          </div>`;
      }
      return `
        <div class="block action" data-id="${id}" data-type="action">
          <div class="header">
            <span>DO</span>
            <select class="act">${ACTIONS.map(a => `<option value="${a.value}" ${a.value === action ? 'selected' : ''}>${a.label}</option>`).join('')}</select>
            <button class="del" title="Delete">x</button>
          </div>
        </div>`;
    }

    return '';
  }

  function addBlockTo(container, def) {
    const temp = document.createElement('div');
    temp.innerHTML = blockHTML(def.type, def);
    const el = temp.firstElementChild;
    if (!el) return null;
    container.appendChild(el);
    bindBlockEvents(el);
    if (def.children && def.children.length) {
      const body = el.querySelector(':scope > .body');
      if (body) addTemplate(body, def.children);
    }
    return el;
  }

  function addTemplate(parent, defs) {
    defs.forEach(def => addBlockTo(parent, def));
  }

  function bindBlockEvents(el) {
    el.querySelector('.del')?.addEventListener('click', e => {
      e.stopPropagation();
      el.remove();
    });

    el.querySelector('.attr')?.addEventListener('change', e => {
      const block = e.currentTarget.closest('.block');
      if (!block) return;
      const attr = e.currentTarget.value;
      const opSelect = block.querySelector('.op');
      const valInput = block.querySelector('.val');
      if (!opSelect || !valInput) return;

      const options = conditionOperatorsFor(attr);
      opSelect.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
      opSelect.value = defaultOpFor(attr);
      valInput.style.display = isStatAttr(attr) ? 'inline' : 'none';
      if (isStatAttr(attr) && !valInput.value) valInput.value = '100';
    });

    el.querySelector('.act')?.addEventListener('change', e => {
      const block = e.currentTarget.closest('.block');
      if (!block) return;
      const selected = e.currentTarget.value;
      if (selected === 'pickBestFor' && !block.querySelector('.pickStat')) {
        const header = block.querySelector('.header');
        const wrap = document.createElement('span');
        wrap.innerHTML = `<select class="pickStat">${PRIORITY_STATS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}</select>`;
        header.insertBefore(wrap.firstElementChild, header.querySelector('.del'));
      }
    });
  }

  function showBotBuilder() {
    const root = document.getElementById('botBuilderRoot');
    if (!root) {
      console.error('botBuilderRoot missing');
      return;
    }

    root.innerHTML = '';
    root.appendChild(createOverlay());

    const scriptArea = document.getElementById(SCRIPT_CONTAINER_ID);
    currentScriptRoot = scriptArea;

    scriptArea.addEventListener('change', e => {
      if (!e.target.classList.contains('attr')) return;
      const block = e.target.closest('.block');
      if (!block) return;
      const attr = e.target.value;
      const opSelect = block.querySelector('.op');
      const valInput = block.querySelector('.val');
      if (!opSelect || !valInput) return;

      const options = conditionOperatorsFor(attr);
      opSelect.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
      opSelect.value = defaultOpFor(attr);
      valInput.style.display = isStatAttr(attr) ? 'inline' : 'none';
    });

    document.querySelectorAll('.addBlock').forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.type;
        const html = blockHTML(type, {
          attr: defaultAttrFor(type),
          op: defaultOpFor(defaultAttrFor(type)),
          val: type === 'while' ? 500 : 100,
          action: 'move',
          pickStat: 'settlers'
        });
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const el = temp.firstElementChild;
        scriptArea.appendChild(el);
        scriptArea.querySelector('.placeholder')?.remove();
        bindBlockEvents(el);
      };
    });

    document.querySelectorAll('.tpl').forEach(btn => {
      btn.onclick = () => {
        scriptArea.innerHTML = '';
        const tpl = btn.dataset.tpl;

        if (tpl === 'safe') {
          addTemplate(scriptArea, [
            {
              type: 'while', attr: 'settlers', op: '>', val: 500, children: [
                { type: 'if', attr: 'waterSupply', op: 'green', children: [
                  { type: 'if', attr: 'radiation', op: 'green', children: [
                    { type: 'action', action: 'settle' }
                  ]},
                  { type: 'elseif', attr: 'land', op: 'green', children: [
                    { type: 'action', action: 'move' },
                    { type: 'action', action: 'pickBestFor', pickStat: 'waterSupply' }
                  ]},
                  { type: 'else', children: [
                    { type: 'action', action: 'move' }
                  ]}
                ] }
              ]
            }
          ]);
        } else if (tpl === 'explorer') {
          addTemplate(scriptArea, [
            {
              type: 'while', attr: 'moves', op: '<', val: 15, children: [
                { type: 'if', attr: 'radiation', op: 'green', children: [
                  { type: 'if', attr: 'waterSupply', op: 'green', children: [
                    { type: 'action', action: 'settle' }
                  ]},
                  { type: 'else', children: [
                    { type: 'action', action: 'move' },
                    { type: 'action', action: 'pickBestFor', pickStat: 'waterSupply' }
                  ]}
                ] }
              ]
            }
          ]);
        } else if (tpl === 'balanced') {
          addTemplate(scriptArea, [
            {
              type: 'while', attr: 'settlers', op: '>', val: 300, children: [
                { type: 'if', attr: 'unity', op: '>', val: 80, children: [
                  { type: 'if', attr: 'temperature', op: 'green', children: [
                    { type: 'action', action: 'settle' }
                  ]},
                  { type: 'elseif', attr: 'knowledge', op: '>', val: 90, children: [
                    { type: 'action', action: 'move' }
                  ]},
                  { type: 'else', children: [
                    { type: 'action', action: 'pickBestFor', pickStat: 'settlers' }
                  ]}
                ] }
              ]
            }
          ]);
        } else if (tpl === 'rush') {
          addTemplate(scriptArea, [
            { type: 'action', action: 'settle' }
          ]);
        } else {
          scriptArea.innerHTML = '<p class="placeholder" style="opacity:.75;margin:0;">Add blocks to build the bot\'s logic...</p>';
        }
      };
    });

    const runBtn = document.getElementById('runBot');
    if (runBtn) runBtn.onclick = () => runBot(scriptArea);
  }

  function getDirectChildren(container) {
    return Array.from(container.children).filter(el => el.classList && el.classList.contains('block'));
  }

  function findMatchingBranchChain(children, startIndex) {
    const chain = [];
    const first = children[startIndex];
    if (!first || first.dataset.type !== 'if') return chain;

    chain.push(first);
    for (let i = startIndex + 1; i < children.length; i++) {
      const type = children[i].dataset.type;
      if (type === 'elseif' || type === 'else') {
        chain.push(children[i]);
        continue;
      }
      break;
    }
    return chain;
  }

  async function runBot(scriptRoot) {
    if (botActive) return;
    botActive = true;
    log('Bot started.');

    try {
      if (!window.GameState || !window.GameState.isActive) {
        const seed = document.getElementById('seedInput')?.value || null;
        if (typeof window.startNewGame === 'function') {
          window.startNewGame(seed);
          await sleep(500);
        }
      }

      await executeContainer(scriptRoot);
    } catch (err) {
      console.error(err);
      log('Bot error: ' + (err?.message || String(err)));
    } finally {
      botActive = false;
      log('Bot finished.');
    }
  }

  async function executeContainer(container) {
    const children = getDirectChildren(container);
    let i = 0;

    while (i < children.length && botActive && window.GameState?.isActive && !window.GameState?.gameOver) {
      const block = children[i];
      block.classList.add('exec-hl');
      await sleep(botSpeed / 2);
      block.classList.remove('exec-hl');

      const type = block.dataset.type;

      if (type === 'while') {
        let guard = 0;
        while (botActive && window.GameState?.isActive && !window.GameState?.gameOver && guard < 200) {
          if (!evaluateCondition(block)) break;
          const body = block.querySelector(':scope > .body');
          if (body) await executeContainer(body);
          guard++;
        }
        i++;
        continue;
      }

      if (type === 'if') {
        const chain = findMatchingBranchChain(children, i);
        let matched = false;

        for (const branch of chain) {
          const branchType = branch.dataset.type;
          if (branchType === 'else') {
            if (!matched) {
              const body = branch.querySelector(':scope > .body');
              if (body) await executeContainer(body);
            }
            break;
          }

          const ok = evaluateCondition(branch);
          if (ok) {
            matched = true;
            const body = branch.querySelector(':scope > .body');
            if (body) await executeContainer(body);
            break;
          }
        }

        i += chain.length;
        continue;
      }

      if (type === 'elseif' || type === 'else') {
        i++;
        continue;
      }

      await executeBlock(block, children, i);
      await sleep(botSpeed);
      i++;
    }
  }

  async function executeBlock(block, siblings, index) {
    const type = block.dataset.type;

    if (type === 'action') {
      await executeAction(block, siblings, index);
      return;
    }
  }

  async function executeAction(block, siblings, index) {
    const actEl = block.querySelector('.act');
    let action = actEl ? actEl.value : 'move';

    if (action === 'pickBestFor' && !block.querySelector('.pickStat')) {
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
      await autoHandleEvents();
    }

    if (action === 'pickBestFor') {
      await autoAcknowledgeIfPresent();
    }

    await waitForIdle();
  }

  async function pickBestFor(block) {
    let tries = 0;
    while (botActive && tries < 40) {
      const btns = document.querySelectorAll('#eventPanelChoices .event-choice-btn');
      if (btns.length > 0) break;
      await sleep(100);
      tries++;
    }

    const event = window.GameState?.pendingEvent;
    if (!event || !event.choices || !event.choices.length) {
      log('No choice event for Pick best for');
      return;
    }

    const stat = block.querySelector('.pickStat')?.value || 'settlers';
    let bestIndex = 0;
    let bestVal = -Infinity;

    event.choices.forEach((choice, idx) => {
      const info = choice.info;
      const val = info && info[stat] !== undefined ? info[stat] : 0;
      if (val > bestVal) {
        bestVal = val;
        bestIndex = idx;
      }
    });

    log('Picked option ' + (bestIndex + 1) + ' for ' + stat);
    clickChoice(bestIndex);
  }

  async function autoHandleEvents() {
    let handled = true;
    while (handled && botActive && window.GameState?.isActive && !window.GameState?.gameOver) {
      handled = false;
      const ackBtn = document.querySelector('#eventPanelChoices button:not(.event-choice-btn)');
      if (ackBtn && /Acknowledge/i.test(ackBtn.textContent)) {
        ackBtn.click();
        log('Acknowledged event');
        handled = true;
        await sleep(botSpeed);
      }
    }
  }

  async function autoAcknowledgeIfPresent() {
    let attempts = 0;
    while (attempts < 20 && botActive) {
      const ackBtn = document.querySelector('#eventPanelChoices button:not(.event-choice-btn)');
      if (ackBtn && /Acknowledge/i.test(ackBtn.textContent)) {
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
      log('Chose option ' + (index + 1));
    } else {
      log('Choice option ' + (index + 1) + ' not available');
    }
  }

  function clickAcknowledge() {
    const ack = document.querySelector('#eventPanelChoices button:not(.event-choice-btn)');
    if (ack && /Acknowledge/i.test(ack.textContent)) {
      ack.click();
      log('Acknowledged');
    }
  }

  function evaluateCondition(block) {
    const attr = block.querySelector('.attr')?.value;
    const op = block.querySelector('.op')?.value;
    const valInput = block.querySelector('.val');
    const val = valInput ? (parseInt(valInput.value, 10) || 0) : 0;

    if (!attr || !op) return true;

    const isStat = GAME_STATS.includes(attr);
    let curValue;

    if (!window.GameState) return false;

    if (isStat) {
      curValue = window.GameState[attr];
      switch (op) {
        case '>': return curValue > val;
        case '<': return curValue < val;
        case '>=': return curValue >= val;
        case '<=': return curValue <= val;
        default: return false;
      }
    }

    curValue = window.GameState.currentLocation ? window.GameState.currentLocation[attr] : null;
    if (curValue == null) return false;

    if (op === 'green') return curValue < 100;
    if (op === 'orange') return curValue >= 100 && curValue < 250;
    if (op === 'red') return curValue >= 250;
    return false;
  }

  async function waitForIdle() {
    let wait = 0;
    while (botActive && wait < 50) {
      const moveBtn = document.getElementById('moveBtn');
      const settleBtn = document.getElementById('settleBtn');
      if ((moveBtn && !moveBtn.disabled) || (settleBtn && !settleBtn.disabled)) break;
      await sleep(200);
      wait++;
    }
  }

  window.showBotBuilder = showBotBuilder;
})();
