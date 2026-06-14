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

    loadGameData();

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

  });