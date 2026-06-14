"use strict";

let botRunning = false;
let botTimer = null;
let botStatusEl = null;

const BOT_ASPECTS = [
    "settlers",
    "scanner",
    "unity",
    "knowledge",
    "waterSupply",
    "land",
    "temperature",
    "radiation"
];

const BOT_WEIGHTS = {
    settlers: 4,
    scanner: 3,
    unity: 3,
    knowledge: 3,
    waterSupply: 2,
    land: 2,
    temperature: 2,
    radiation: 2
};

const BOT_TARGETS = {
    settlers: 700,
    scanner: 100,
    unity: 90,
    knowledge: 100,
    waterSupply: 120,
    land: 120,
    temperature: 120,
    radiation: 120
};

function getBotAspectValue(name) {
    if (name in GameState) {
        return GameState[name];
    }

    const loc = GameState.currentLocation || {};
    return loc[name] ?? 0;
}

function getBotAspectBand(value) {
    if (value < 100) return 0;
    if (value < 250) return 1;
    return 2;
}

function scoreBotState() {
    let score = 0;

    BOT_ASPECTS.forEach(name => {
        const value = getBotAspectValue(name);
        const target = BOT_TARGETS[name];
        const weight = BOT_WEIGHTS[name];
        const distance = Math.abs(target - value);

        score += Math.max(0, 300 - distance) * weight;

        if (name === "settlers") {
            score += value * 2;
        }

        if (name === "scanner" || name === "unity" || name === "knowledge") {
            score += value;
        }
    });

    return score;
}

function refreshBotStatus(message) {
    if (botStatusEl) {
        botStatusEl.textContent = message;
    }
}

function chooseEventOption() {
    const event = GameState.pendingEvent;
    if (!event) {
        return;
    }

    const buttons = Array.from(ui?.eventPanelChoices?.querySelectorAll("button") || []);
    if (!buttons.length) {
        return;
    }

    const choices = Array.isArray(event.choices) && event.choices.length > 0
        ? event.choices
        : buttons.map((button, index) => ({
            text: button.textContent || "",
            index
        }));

    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    choices.forEach((choice, index) => {
        let choiceScore = 0;

        if (Array.isArray(choice.effects)) {
            choice.effects.forEach(effect => {
                const delta = typeof effect.delta === "number"
                    ? effect.delta
                    : Math.max(effect.delta?.min ?? 0, effect.delta?.max ?? 0);

                if (effect.type === "settlers") choiceScore += delta * 6;
                if (effect.type === "scanner") choiceScore += delta * 4;
                if (effect.type === "unity") choiceScore += delta * 4;
                if (effect.type === "knowledge") choiceScore += delta * 4;
                if (effect.type === "waterSupply") choiceScore += delta * 2;
                if (effect.type === "land") choiceScore += delta * 2;
                if (effect.type === "temperature") choiceScore += delta * 2;
                if (effect.type === "radiation") choiceScore += delta * 2;
                if (effect.type === "equipment") choiceScore += delta * 3;
            });
        }

        if (choice.text) {
            const lowered = choice.text.toLowerCase();
            if (lowered.includes("save") || lowered.includes("protect") || lowered.includes("shield")) {
                choiceScore += 10;
            }
            if (lowered.includes("leave") || lowered.includes("avoid") || lowered.includes("continue")) {
                choiceScore += 4;
            }
            if (lowered.includes("settler") || lowered.includes("people") || lowered.includes("unity")) {
                choiceScore += GameState.unity < 80 ? 12 : 6;
            }
            if (lowered.includes("knowledge") || lowered.includes("database") || lowered.includes("data")) {
                choiceScore += GameState.knowledge < 90 ? 10 : 5;
            }

            if (event.kind === "milestone") {
                if (lowered.includes("water") || lowered.includes("lake")) {
                    choiceScore += GameState.settlers < 700 ? 8 : 4;
                }
                if (lowered.includes("science") || lowered.includes("museum") || lowered.includes("knowledge")) {
                    choiceScore += GameState.knowledge < 120 ? 8 : 4;
                }
                if (lowered.includes("forest") || lowered.includes("unity")) {
                    choiceScore += GameState.unity < 90 ? 8 : 4;
                }
                if (lowered.includes("hospital") || lowered.includes("settler") || lowered.includes("refugee")) {
                    choiceScore += GameState.settlers < 800 ? 8 : 4;
                }
                if (lowered.includes("military") || lowered.includes("base") || lowered.includes("scanner")) {
                    choiceScore += GameState.scanner < 100 ? 8 : 4;
                }
                if (lowered.includes("safe") || lowered.includes("shelter") || lowered.includes("underground")) {
                    choiceScore += 5;
                }
            }
        }

        const loc = GameState.currentLocation || {};
        BOT_ASPECTS.slice(4).forEach(name => {
            const band = getBotAspectBand(loc[name] ?? 0);
            if (band === 2) {
                choiceScore -= 2;
            }
        });

        if (choiceScore > bestScore) {
            bestScore = choiceScore;
            bestIndex = index;
        }
    });

    buttons[bestIndex]?.click();
}

function chooseActionByState() {
    if (!GameState.isActive || GameState.gameOver) {
        return;
    }

    if (GameState.pendingEvent) {
        chooseEventOption();
        return;
    }

    const currentScore = scoreBotState();
    const settleScore = currentScore + Math.max(0, 1000 - GameState.moves * 5) - (GameState.currentBiome * 25);
    const moveScore = currentScore + 150 + Math.max(0, 200 - getBotAspectValue("scanner"));

    if (GameState.moves >= 6 && settleScore >= moveScore) {
        settle();
        return;
    }

    if (GameState.settlers <= 250 || GameState.scanner <= 40 || GameState.unity <= 35) {
        settle();
        return;
    }

    moveToNextLocation();
}

function runBotTick() {
    if (!botRunning) {
        return;
    }

    if (!GameState.isActive || GameState.gameOver) {
        refreshBotStatus("Bot idle.");
        return;
    }

    if (GameState.pendingEvent && ui?.eventPanelChoices?.children?.length) {
        refreshBotStatus("Bot resolving event.");
        chooseEventOption();
        return;
    }

    refreshBotStatus("Bot planning next action.");
    chooseActionByState();
}

function stopBot() {
    botRunning = false;
    if (botTimer) {
        clearInterval(botTimer);
        botTimer = null;
    }
    refreshBotStatus("Bot stopped.");
}

function startBot() {
    botRunning = true;

    if (botTimer) {
        clearInterval(botTimer);
    }

    botTimer = setInterval(runBotTick, 250);
    refreshBotStatus("Bot running.");
}

function showBotBuilder(seed, autoStart = false) {
    const overlay = document.getElementById("botBuilderOverlay");

    if (overlay) {
        overlay.classList.remove("hidden-shell");
        overlay.style.display = "block";
        overlay.innerHTML = "";

        const panel = document.createElement("div");
        panel.style.cssText = "position:fixed;inset:20px;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);";

        const card = document.createElement("div");
        card.style.cssText = "min-width:280px;max-width:420px;padding:20px;background:#fff;color:#111;border:1px solid #bbb;box-shadow:0 10px 30px rgba(0,0,0,0.2);font-family:system-ui,sans-serif;";

        const title = document.createElement("div");
        title.textContent = "Bot Mode";
        title.style.cssText = "font-size:20px;font-weight:700;margin-bottom:10px;";

        botStatusEl = document.createElement("div");
        botStatusEl.style.cssText = "font-size:14px;line-height:1.4;margin-bottom:14px;";
        botStatusEl.textContent = "Ready to run the automated player.";

        const seedLine = document.createElement("div");
        seedLine.style.cssText = "font-size:12px;color:#555;margin-bottom:14px;";
        seedLine.textContent = seed ? `Seed: ${seed}` : "Seed: current time";

        const startButton = document.createElement("button");
        startButton.className = "game-btn";
        startButton.textContent = "Start bot";
        startButton.addEventListener("click", () => {
            overlay.style.display = "none";
            if (ui?.gameScreen) {
                ui.gameScreen.style.display = "block";
            }
            if (typeof startNewGame === "function") {
                startNewGame(seed || null);
            }
            startBot();
        });

        const stopButton = document.createElement("button");
        stopButton.className = "game-btn";
        stopButton.textContent = "Stop bot";
        stopButton.style.marginLeft = "8px";
        stopButton.addEventListener("click", () => {
            stopBot();
            overlay.style.display = "none";
        });

        card.appendChild(title);
        card.appendChild(botStatusEl);
        card.appendChild(seedLine);
        card.appendChild(startButton);
        card.appendChild(stopButton);
        panel.appendChild(card);
        overlay.appendChild(panel);
    }

    refreshBotStatus("Bot builder ready.");

    if (autoStart) {
        startBot();
    }
}

window.startBot = startBot;
window.stopBot = stopBot;
window.showBotBuilder = showBotBuilder;