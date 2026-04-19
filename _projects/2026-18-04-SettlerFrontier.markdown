---
layout: post
title: "Settler Frontier"
date: 2026-04-18
categories: [project]
---
<!-- CARAVAN SURVIVAL GAME UI (static HTML) -->
<div id="caravan-game-root" class="caravan-game">
  
  <!-- MENU SCREEN -->
  <div id="gameMenuScreen" class="game-menu">
    <h1 class="game-title">🚐 Caravan Survival</h1>
    <p>Choose your mode:</p>
    <button id="manualModeBtn" class="game-btn game-btn-large">🕹️ Manual Mode</button>
    <button id="botModeBtn" class="game-btn game-btn-large">🤖 Bot Mode (Coming Soon)</button>
  </div>

  <!-- BACKSTORY MODAL (hidden by default) -->
  <div id="backstoryOverlay" class="game-modal-overlay" style="display: none;">
    <div class="game-modal">
      <h2>🌄 The Surface</h2>
      <p>The bunker doors grind open. Resources are gone. You lead 1,000 settlers into the unknown, seeking a new permanent home. The landbase is intact, spirits are high, but the wasteland is unpredictable.</p>
      <p>Guide them wisely.</p>
      <button id="startGameBtn" class="game-btn">Begin Journey</button>
    </div>
  </div>

  <!-- GAME SCREEN (hidden initially) -->
  <div id="gameScreen" class="game-panel" style="display: none;">
    <h2>Caravan Status</h2>
    <div class="game-stats-grid">
      <div class="stat-item">👥 Settlers: <span id="settlersValue">1000</span></div>
      <div class="stat-item">🚐 Landbase Condition: <span id="conditionValue">100</span>%</div>
      <div class="stat-item">🤝 Unity: <span id="unityValue">100</span>%</div>
      <div class="stat-item">🔬 Analysis Equipment: <span id="equipmentValue">10</span></div>
      <div class="stat-item">📅 Moves Taken: <span id="movesValue">0</span></div>
    </div>

    <h2>Current Location</h2>
    <div class="game-stats-grid">
      <div class="stat-item">💧 Water: <span id="waterValue">—</span></div>
      <div class="stat-item">🌡️ Climate: <span id="climateValue">—</span></div>
      <div class="stat-item">📦 Resources: <span id="resourcesValue">—</span></div>
      <div class="stat-item">☢️ Radiation: <span id="radiationValue">—</span></div>
    </div>

    <div class="game-actions">
      <button id="moveBtn" class="game-btn">🚶 Move to Next Location</button>
      <button id="settleBtn" class="game-btn">🏠 Attempt Settlement</button>
    </div>

    <!-- EVENT CONTAINER (hidden by default) -->
    <div id="eventContainer" class="game-event-box" style="display: none;">
      <h3>Event</h3>
      <p id="eventDescription"></p>
      <div id="eventChoices" class="event-choices"></div>
    </div>

    <!-- GAME LOG -->
    <h2>Log</h2>
    <div id="gameLog" class="game-log"></div>

    <!-- GAME OVER PANEL (hidden) -->
    <div id="gameOverPanel" class="game-over-panel" style="display: none;">
      <h2>Journey Complete</h2>
      <p id="finalScore"></p>
      <button id="restartBtn" class="game-btn">🔄 Start New Journey</button>
    </div>
  </div>
</div>