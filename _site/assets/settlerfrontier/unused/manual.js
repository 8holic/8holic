/************************************************************
 * CARAVAN SURVIVAL – MANUAL MODE
 ************************************************************/
(function() {
  "use strict";

  const C = window.Caravan;
  if (!C) throw new Error('Core not loaded');

  const {
    GameState, rng, currentSeed, ui, EVENT_LIST, SCIENCE_EVENT_LIST, UNITY_EVENT_LIST,
    LOCATION_ATTRIBUTES, seededRandomInt, hashStringToSeed,
    applyLocationGeneration, updateUI, displayLocation, log, checkGameOver,
    scanLocation, settle, startNewGame, loadGameData
  } = C;

  // ---------- EVENT PANEL ----------
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

  // ---------- EVENT FLOW ----------
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
    ackBtn.addEventListener('click', () => {
      processEventQueue();
    });
    ui.eventPanelChoices.appendChild(ackBtn);
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

  function processEventQueue() {
    if (GameState.eventQueue.length === 0) {
      clearEventPanel();
      GameState.currentLocation = applyLocationGeneration(GameState);
      log('📍 Moved to a new location.');
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

  // ---------- MOVEMENT ----------
  function moveToNextLocation() {
    if (!GameState.isActive || GameState.gameOver) return;
    GameState.moves++;
    // Milestone check
    if (GameState.moves > 0 && GameState.moves % 6 === 0 && C.MILESTONE_POOL.length > 0) {
      const idx = seededRandomInt(0, C.MILESTONE_POOL.length - 1);
      const milestoneEvent = C.MILESTONE_POOL.splice(idx, 1)[0];
      log('🌟 A milestone has been reached!');
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
    GameState.eventQueue.push(EVENT_LIST[eventIndex]);

    // Science event (probability = knowledge%)
    if (SCIENCE_EVENT_LIST.length > 0) {
      const scienceChance = GameState.knowledge / 100;
      if (Math.random() < scienceChance) {   // manual mode uses the shared rng? We'll use rng()
        const idx = seededRandomInt(0, SCIENCE_EVENT_LIST.length - 1);
        GameState.eventQueue.push(SCIENCE_EVENT_LIST[idx]);
      }
    }

    // Unity event (probability = (100 - unity)%)
    if (UNITY_EVENT_LIST.length > 0) {
      const unityChance = (100 - GameState.unity) / 100;
      if (Math.random() < unityChance) {
        const idx = seededRandomInt(0, UNITY_EVENT_LIST.length - 1);
        GameState.eventQueue.push(UNITY_EVENT_LIST[idx]);
      }
    }

    processEventQueue();
  }

  // ---------- DOM READY ----------
  document.addEventListener('DOMContentLoaded', function() {
    // Assign all UI elements to the shared object
    Object.assign(ui, {
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
    });

    loadGameData();

    // Seed buttons
    document.getElementById('randomSeedBtn').addEventListener('click', () => {
      const randomStr = Math.random().toString(36).substring(2, 10);
      ui.seedInput.value = randomStr;
      ui.currentSeedDisplay.textContent = hashStringToSeed(randomStr);
    });
    document.getElementById('useSeedBtn').addEventListener('click', () => {
      const seedStr = ui.seedInput.value;
      ui.currentSeedDisplay.textContent = hashStringToSeed(seedStr);
    });

    // Manual mode launch
    document.getElementById('manualModeBtn').addEventListener('click', () => {
      GameState.botMode = false;
      ui.menuScreen.style.display = 'none';
      ui.backstoryOverlay.style.display = 'block';
      ui.currentSeedDisplay.textContent = Date.now();
      ui.seedInput.value = '';
    });

    // Begin journey (manual)
    document.getElementById('startGameBtn').addEventListener('click', () => {
      ui.backstoryOverlay.style.display = 'none';
      ui.gameScreen.style.display = 'block';
      startNewGame(ui.seedInput.value || null);
    });

    // Restart
    ui.restartBtn.addEventListener('click', () => {
      ui.gameScreen.style.display = 'block';
      startNewGame(ui.seedInput.value || null);
    });

    // Action buttons
    ui.moveBtn.addEventListener('click', moveToNextLocation);
    ui.settleBtn.addEventListener('click', settle);
    ui.scanBtn.addEventListener('click', scanLocation);

    console.log('✅ Manual mode ready.');
  });

})();