---
layout: post
title: "Settler Frontier"
date: 2026-04-18
categories: [project]
---
<!-- CARAVAN GAME UI -->
<div id="caravan-game" class="game-panel">
  <!-- Status Panel -->
  <div class="status-panel">
    <h2>Caravan Status</h2>
    <p>👥 Settlers: <span id="settlersValue">1000</span></p>
    <p>🚐 Landbase Condition: <span id="conditionValue">100</span>%</p>
    <p>🤝 Unity: <span id="unityValue">100</span>%</p>
    <p>🔬 Analysis Equipment: <span id="equipmentValue">10</span></p>
    <p>📅 Moves Taken: <span id="movesValue">0</span></p>
  </div>

  <!-- Current Location Panel -->
  <div class="location-panel">
    <h2>Current Location</h2>
    <p>💧 Water: <span id="waterValue">Unknown</span></p>
    <p>🌡️ Climate: <span id="climateValue">Unknown</span></p>
    <p>📦 Resources: <span id="resourcesValue">Unknown</span></p>
    <p>☢️ Radiation: <span id="radiationValue">Unknown</span></p>
  </div>

  <!-- Action Buttons -->
  <div class="action-panel">
    <button id="moveBtn">🚶 Move to Next Location</button>
    <button id="settleBtn">🏠 Attempt Settlement</button>
  </div>

  <!-- Event Display Area -->
  <div id="eventContainer" class="event-container" style="display: none;">
    <h3>Event</h3>
    <p id="eventDescription"></p>
    <div id="eventChoices"></div>
  </div>

  <!-- Game Log -->
  <div id="gameLog" class="log-box"></div>

  <!-- Game Over / Score Display -->
  <div id="gameOverPanel" style="display: none;">
    <h2>Journey Complete</h2>
    <p id="finalScore"></p>
    <button id="restartBtn">🔄 Start New Journey</button>
  </div>
</div>