---
layout: project
title: "Settler Frontier"
date: 2026-04-18
project_type: "Javascript Game"
status: 'Ongoing'
categories: [project]
---
<!-- CARAVAN SURVIVAL – WITH TERRARIAN FEATURES & SEED SYSTEM -->
<div id="caravan-game-root" class="caravan-game">

  <!-- MENU SCREEN -->
  <div id="gameMenuScreen" class="card" style="text-align: center;">
    <h1 class="game-title" style="border-bottom: none;">🚐 Caravan Survival</h1>
    <p>Choose your mode:</p>
    <button id="manualModeBtn" class="game-btn game-btn-large">🕹️ Manual Mode</button>
    <button id="botModeBtn" class="game-btn game-btn-large">🤖 Bot Mode</button>
  </div>

  <!-- BACKSTORY MODAL (with seed input) -->
  <div id="backstoryOverlay" class="card" style="display: none; background: rgba(30,26,47,0.95);">
    <h2>🌄 The Bunker Opens</h2>
    <p>In 2030, a great disaster occurred. Nobody knows what it is. When it became obvious that the era of man was over, 2000 people were sealed in a bunker.</p>
    <p>You are the trusted leader of the caravan. A brave new Frontier awaits among the ruins of the old. Your goal is to find a suitable place for the caravan to settle down.</p>
    <div style="margin: 20px 0;">
      <label for="seedInput" style="display: block; margin-bottom: 8px;">🎲 Seed (optional):</label>
      <input type="text" id="seedInput" placeholder="Enter a seed or leave blank for random" style="width: 100%; padding: 10px; border-radius: 40px; border: 1px solid #A367B1; background: #1e1a2f; color: #f0f0f0;">
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <button id="randomSeedBtn" class="game-btn" style="flex: 1;">🎲 Random Seed</button>
        <button id="useSeedBtn" class="game-btn" style="flex: 1;">✅ Use This Seed</button>
      </div>
      <p style="font-size: 0.9rem; margin-top: 10px; opacity: 0.8;">Current seed: <span id="currentSeedDisplay">—</span></p>
    </div>
    <button id="startGameBtn" class="game-btn">Begin Journey</button>
  </div>

  <!-- BOT BUILDER OVERLAY (hidden initially) -->
  <div id="botBuilderOverlay" class="card" style="display: none; background: rgba(30,26,47,0.95);">
    <h2>🤖 Bot Program Builder</h2>
    <p>Build your decision tree. Blocks are evaluated top‑to‑bottom.</p>
    <div id="blockToolbar" style="margin-bottom:15px;">
      <button id="addWhenBlock" class="game-btn">➕ Add When Block</button>
    </div>
    <div id="blockCanvas" style="background:#1e1a2f; border:1px solid #A367B1; border-radius:8px; padding:15px; min-height:200px;">
      <!-- Blocks will be rendered here -->
    </div>
    <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
      <button id="launchBotBtn" class="game-btn">🚀 Launch Bot</button>
      <button id="cancelBotBtn" class="game-btn">✖ Cancel</button>
      <button id="exportBotBtn" class="game-btn">📥 Export Program</button>
      <button id="importBotBtn" class="game-btn">📤 Import Program</button>
    </div>
    <input type="file" id="importBotFile" accept=".json" style="display:none;">
    <div style="margin-top: 10px; opacity: 0.7; font-size: 0.9rem;">
      <p>💡 <b>Conditions:</b> <code>settlers > 700</code>, <code>allVisibleGreen</code>, <code>equipmentAvailable</code>, <code>attributeColor</code>.</p>
      <p>💡 <b>Actions:</b> <code>settle</code>, <code>scan</code>, <code>move</code>, <code>priority</code>.</p>
    </div>
  </div>

  <!-- GAME SCREEN (hidden initially) -->
  <div id="gameScreen" class="game-panel" style="display: none;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2>Caravan Status</h2>
      <span style="background: #2a2340; padding: 6px 12px; border-radius: 20px; font-size: 0.9rem;">
        🎲 Seed: <span id="gameSeedDisplay">—</span>
      </span>
    </div>
    <div class="game-stats-grid">
      <div class="stat-item">👥 Settlers: <span id="settlersValue">2000</span></div>
      <div class="stat-item">🛰️ Terrain Scanner: <span id="terrainScannerValue">100</span>%</div>
      <div class="stat-item">🛰️ Atmospheric Scanner: <span id="atmosphericScannerValue">100</span>%</div>
      <div class="stat-item">🤝 Unity: <span id="unityValue">100</span>%</div>
      <div class="stat-item">💾 Knowledge: <span id="databaseValue">100</span>%</div>
      <div class="stat-item">🔬 Analysis Equipment: <span id="equipmentValue">5</span></div>
      <div class="stat-item">📅 Moves Taken: <span id="movesValue">0</span></div>
    </div>

    <h2>Current Location</h2>
    <ul class="location-list">
      <li>💧 Water Supply: <span id="waterSupplyValue">—</span></li>
      <li>🏞️ Land: <span id="landValue">—</span></li>
      <li>🌿 Vegetation: <span id="vegetationValue">—</span></li>
      <li>🌡️ Temperature: <span id="temperatureValue">—</span></li>
      <li>🌧️ Precipitation: <span id="precipitationValue">—</span></li>
      <li>☢️ Radiation: <span id="radiationValue">—</span></li>
      <li>🏚️ Shelter: <span id="shelterValue">—</span></li>
    </ul>

    <!-- SCAN BUTTON & TERRARIAN FEATURES DISPLAY -->
    <div style="margin: 15px 0;">
      <button id="scanBtn" class="game-btn" disabled>🔍 Scan Location (Cost: 1 Equipment)</button>
      <div id="terrarianDisplay" style="margin-top: 10px; padding: 10px; background: #1e1a2f; border-radius: 12px; border-left: 4px solid #A367B1;">
        <span id="terrarianStatus">❓ Further investigation needed.</span>
        <div id="terrarianList" style="margin-top: 5px;"></div>
      </div>
    </div>

    <!-- PERMANENT EVENT PANEL -->
    <div id="eventPanel" class="game-event-panel">
      <h3>⚡ Decision Maker 1000</h3>
      <p id="eventPanelDescription">Loading game data...</p>
      <div id="eventPanelChoices" class="event-choices"></div>
    </div>

    <div class="game-actions">
      <button id="moveBtn" class="game-btn" disabled>🚶 Move to Next Location</button>
      <button id="settleBtn" class="game-btn" disabled>🏠 Attempt Settlement</button>
    </div>

    <!-- GAME LOG -->
    <h2>📋 Log</h2>
    <div id="gameLog" class="game-log"></div>

    <!-- GAME OVER PANEL -->
    <div id="gameOverPanel" class="game-over-panel" style="display: none;">
      <h2>Journey Complete</h2>
      <p id="finalScore"></p>
      <button id="restartBtn" class="game-btn">🔄 Start New Journey</button>
    </div>
  </div>
</div>

<!-- Styles (updated for list and new layout) -->
<style>
  .caravan-game .game-btn {
    background: #392467;
    border: none;
    color: #FFD1E3;
    font-weight: bold;
    padding: 12px 20px;
    border-radius: 60px;
    font-size: 1.1rem;
    cursor: pointer;
    box-shadow: 0 4px 0 #1e1a2f;
    transition: all 0.1s ease;
    border: 1px solid #A367B1;
    margin: 5px;
  }
  .caravan-game .game-btn:hover {
    background: #5D3587;
    transform: translateY(-2px);
    box-shadow: 0 6px 0 #1e1a2f;
  }
  .caravan-game .game-btn:disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  .caravan-game .game-btn-large {
    font-size: 1.4rem;
    padding: 18px 20px;
  }
  .caravan-game .game-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 18px;
    background: #1e1a2f;
    padding: 18px 20px;
    border-radius: 24px;
    border: 1px solid #5D3587;
    margin-bottom: 20px;
  }
  .caravan-game .stat-item {
    font-weight: 500;
    font-size: 1.2rem;
    color: #f0f0f0;
  }
  .caravan-game .stat-item span {
    font-weight: 700;
    color: #FFD1E3;
  }
  .caravan-game .location-list {
    list-style: none;
    padding: 0;
    background: #1e1a2f;
    border-radius: 24px;
    border: 1px solid #5D3587;
    padding: 18px 20px;
    margin: 10px 0 20px 0;
    color: #f0f0f0;
    font-size: 1.1rem;
  }
  .caravan-game .location-list li {
    padding: 4px 0;
    border-bottom: 1px solid #2a2440;
  }
  .caravan-game .location-list li:last-child {
    border-bottom: none;
  }
  .caravan-game .location-list li span {
    font-weight: 700;
    color: #FFD1E3;
  }
  .caravan-game .game-actions {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    justify-content: center;
    margin: 20px 0;
  }
  .caravan-game .game-event-panel {
    background: #2a2340;
    padding: 18px 22px;
    border-radius: 24px;
    border-left: 8px solid #A367B1;
    margin: 10px 0 20px 0;
  }
  .caravan-game .event-choices {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 15px;
  }
  .caravan-game .event-choice-btn {
    background: #3c2e2a;
    border-color: #b17e5a;
  }
  .caravan-game .game-log {
    background: #0f0c17;
    padding: 16px 18px;
    border-radius: 20px;
    height: 150px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 0.95rem;
    border: 1px solid #5D3587;
    line-height: 1.5;
    color: #f0e6ff;
    margin-top: 10px;
  }
  .caravan-game .game-over-panel {
    background: #1e1b13;
    padding: 16px 20px;
    border-radius: 24px;
    text-align: center;
    border: 2px solid #A367B1;
    margin-top: 20px;
  }
  .caravan-game h2 {
    color: #FFD1E3;
    border-bottom: 1px dashed #A367B1;
    padding-bottom: 6px;
  }
  .caravan-game h3 {
    color: #FFD1E3;
    margin-top: 0;
  }
  #terrarianList div {
    color: #FFD1E3;
    margin: 5px 0;
  }
</style>
<script>
  // Define the base path for game assets (works with Jekyll's relative_url)
  window.SETTLERFRONTIER_BASE = "{{ '/assets/settlerfrontier/' | relative_url }}";
</script>
<!-- Load the three split scripts in order -->
<script src="{{ '/assets/settlerfrontier/settlerfrontier.js' | relative_url }}"></script>
