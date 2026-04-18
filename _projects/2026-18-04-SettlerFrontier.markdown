---
layout: post
title: "Settler Frontier"
date: 2026-04-18
categories: [project]
---
<!-- CARAVAN GAME UI -->
<div id="caravan-game" class="game-panel">
  <h2>Caravan Status</h2>
  <div class="stats">
    <p>🍞 Supply: <span id="supplyValue">100</span></p>
    <p>👥 Manpower: <span id="manpowerValue">10</span></p>
    <p>📅 Turn: <span id="turnValue">0</span></p>
  </div>

  <h2>Current Area</h2>
  <div class="stats">
    <p>🌲 Forestry: <span id="forestryValue">50</span></p>
    <p>💧 Water: <span id="waterValue">50</span></p>
    <p>🌡️ Temperature: <span id="temperatureValue">50</span></p>
    <p>🐾 Wildlife: <span id="wildlifeValue">docile</span></p>
  </div>

  <h2>Your Rules</h2>
  <div id="rulesContainer"></div>
  <button id="addRuleBtn">➕ Add Rule</button>

  <div class="game-controls" style="margin-top: 20px;">
    <button id="startGameBtn">🚀 Start Journey</button>
    <button id="nextTurnBtn" disabled>⏭️ Next Turn</button>
  </div>

  <h2>Log</h2>
  <div id="gameLog" class="log-box"></div>

  <h2 id="settlementScoreDisplay" style="margin-top: 20px;"></h2>
</div>

<script src="{{ '/assets/js/settlerfrontier.js' | relative_url }}"></script>