  let pendingBotMode = false;

  // ---------- 6. UI ELEMENTS (simplified) ----------
  let ui = {};

  function updateUI() {
    ui.settlers.textContent = GameState.settlers;
    ui.scanner.textContent = GameState.scanner;
    ui.unity.textContent = GameState.unity;
    ui.knowledge.textContent = GameState.knowledge;
    ui.moves.textContent = GameState.moves;

  }

function displayLocation() {
  const loc = GameState.currentLocation;
  if (!loc) return;

  if (ui.biomeName) {
    ui.biomeName.textContent =
      loc.biomeName || `Biome ${GameState.currentBiome}`;
  }

  if (ui.biomeDescription) {
    ui.biomeDescription.textContent =
      loc.biomeDescription || '';
  }

  if (!GameState.pendingEvent) {
    ui.eventPanelDescription.innerHTML =
      `<strong>${loc.biomeName}</strong><br>${loc.biomeDescription}`;
  }

  loc.flavourTexts = {};

  LOCATION_ATTRIBUTES.forEach(attr => {
    const roll = loc[attr];
    const uiElement = ui[attr];

    if (!uiElement) return;

    const label = getAttributeLabel(attr, roll);
    loc.flavourTexts[attr] = label;

    if (loc.visible && loc.visible[attr]) {
      uiElement.textContent =
        `${getDangerColor(roll)} ${label}`;
    } else {
      uiElement.textContent = '❓ ???';
    }
  });
}


  // ---------- 16. DOM READY (updated element IDs) ----------
  document.addEventListener('DOMContentLoaded', function() {
    ui = {
      menuScreen: document.getElementById('gameMenuScreen'),
      backstoryOverlay: document.getElementById('backstoryOverlay'),
      gameScreen: document.getElementById('gameScreen'),

      settlers: document.getElementById('settlersValue'),
      scanner: document.getElementById('scannerValue'),
      unity: document.getElementById('unityValue'),
      knowledge: document.getElementById('databaseValue'),

      moves: document.getElementById('movesValue'),

      waterSupply: document.getElementById('waterSupplyValue'),
      land: document.getElementById('landValue'),
      temperature: document.getElementById('temperatureValue'),
      radiation: document.getElementById('radiationValue'),

      moveBtn: document.getElementById('moveBtn'),
      settleBtn: document.getElementById('settleBtn'),
      restartBtn: document.getElementById('restartBtn'),

      eventPanelDescription: document.getElementById('eventPanelDescription'),
      eventPanelChoices: document.getElementById('eventPanelChoices'),

      // ADD THESE
      biomeName: document.getElementById('biomeName'),
      biomeDescription: document.getElementById('biomeDescription'),

      terrarianStatus: document.getElementById('terrarianStatus'),
      terrarianList: document.getElementById('terrarianList'),

      gameOverPanel: document.getElementById('gameOverPanel'),
      finalScore: document.getElementById('finalScore'),

      seedInput: document.getElementById('seedInput'),
      currentSeedDisplay: document.getElementById('currentSeedDisplay'),
      gameSeedDisplay: document.getElementById('gameSeedDisplay')
    };

    window.settlerfrontierDataReady = window.settlerfrontierDataReady || loadGameData();

    document.getElementById('randomSeedBtn').addEventListener('click', () => {
      const randomStr = Math.random().toString(36).substring(2,10);
      ui.seedInput.value = randomStr;
      ui.currentSeedDisplay.textContent = hashStringToSeed(randomStr);
    });
    document.getElementById('useSeedBtn').addEventListener('click', () => {
      const seedStr = ui.seedInput.value;
      ui.currentSeedDisplay.textContent = hashStringToSeed(seedStr);
    });

    document.getElementById('manualModeBtn').addEventListener('click', () => {
      pendingBotMode = false;
      ui.menuScreen.style.display = 'none';
      ui.backstoryOverlay.style.display = 'none';
      ui.gameScreen.style.display = 'block';
      whenGameDataReady().then(() => {
        startNewGame(ui.seedInput.value || null);
      });
    });
    document.getElementById('botModeBtn').addEventListener('click', () => {
      ui.menuScreen.style.display = 'none';
      ui.backstoryOverlay.style.display = 'none';
      ui.gameScreen.style.display = 'block';          // game screen visible behind overlay
      whenGameDataReady().then(() => {
        showBotBuilder();                             // defined in bot.js
      });
    });
    const startGameButton = document.getElementById('startGameBtn');
    if (startGameButton) {
      startGameButton.addEventListener('click', () => {
        const seed = ui.seedInput.value || null;
        ui.backstoryOverlay.style.display = 'none';
        whenGameDataReady().then(() => {
          if (pendingBotMode) {
            pendingBotMode = false;
            showBotBuilder(seed, true);
          } else {
            ui.gameScreen.style.display = 'block';
            startNewGame(seed);
          }
        });
      });
    }
    ui.restartBtn.addEventListener('click', () => {
      whenGameDataReady().then(() => {
        ui.gameScreen.style.display = 'block';
        startNewGame(ui.seedInput.value || null);
      });
    });

    ui.moveBtn.addEventListener('click', moveToNextLocation);
    ui.settleBtn.addEventListener('click', settle);

  });