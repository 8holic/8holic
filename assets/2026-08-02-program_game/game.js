// game.js - Minimal programming puzzle game
window.initProgrammingGame = function(container) {
    'use strict';

    // --- Config ---
    const config = {
        gridSize: 7,
        startPos: { x: 0, y: 0, dir: 'right' },
        goalPos: { x: 6, y: 6 },
        obstacles: [
            { x: 2, y: 2 },
            { x: 4, y: 3 },
            { x: 1, y: 5 },
            { x: 5, y: 2 }
        ],
        cellSize: 50, // for grid display
        speed: 300
    };

    // --- State ---
    const state = {
        player: { ...config.startPos },
        program: [],
        isRunning: false,
        hasWon: false
    };

    // --- UI ---
    container.innerHTML = `
        <div class="controls">
            <button data-action="move">Move Forward</button>
            <button data-action="left">Turn Left</button>
            <button data-action="right">Turn Right</button>
            <button data-action="ifPathAhead">If Path Ahead</button>
            <button data-action="repeat">Repeat 2x</button>
            <button id="runProgram">Run Program</button>
            <button id="stepProgram">Step</button>
            <button id="resetGame">Reset</button>
            <button id="clearProgram">Clear</button>
        </div>
        <div id="programDisplay" style="margin:10px 0; min-height:40px; color:white;"></div>
        <div id="grid" style="display:grid; grid-template-columns:repeat(${config.gridSize}, ${config.cellSize}px); gap:2px; margin-top:10px;"></div>
    `;

    const gridEl = container.querySelector('#grid');
    const programEl = container.querySelector('#programDisplay');

    // --- Grid Rendering ---
    function renderGrid() {
        gridEl.innerHTML = '';
        for (let y = 0; y < config.gridSize; y++) {
            for (let x = 0; x < config.gridSize; x++) {
                const cell = document.createElement('div');
                cell.style.width = cell.style.height = config.cellSize + 'px';
                cell.style.border = '1px solid #444';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontSize = '24px';

                // Obstacles
                if (config.obstacles.some(o => o.x === x && o.y === y)) {
                    cell.textContent = '⬛';
                }

                // Goal
                if (x === config.goalPos.x && y === config.goalPos.y) {
                    cell.textContent = '🏁';
                }

                // Player
                if (state.player.x === x && state.player.y === y) {
                    switch (state.player.dir) {
                        case 'up': cell.textContent = '↑'; break;
                        case 'down': cell.textContent = '↓'; break;
                        case 'left': cell.textContent = '←'; break;
                        case 'right': cell.textContent = '→'; break;
                    }
                }

                gridEl.appendChild(cell);
            }
        }
    }

    // --- Program Handling ---
    function addCommand(cmd) {
        state.program.push(cmd);
        updateProgramDisplay();
    }

    function updateProgramDisplay() {
        programEl.innerHTML = state.program.map(c => {
            if (typeof c === 'string') return c;
            if (typeof c === 'object' && c.type === 'repeat') return `repeat ${c.times}x`;
            if (typeof c === 'object' && c.type === 'ifPathAhead') return 'if path ahead';
            return c;
        }).join(' → ');
    }

    // --- Execution ---
    async function runProgram() {
        if (state.isRunning || state.hasWon) return;
        state.isRunning = true;
        await executeProgram(state.program.slice());
        state.isRunning = false;
    }

    async function executeProgram(program) {
        for (let i = 0; i < program.length; i++) {
            const cmd = program[i];

            if (typeof cmd === 'string') {
                await executeCommand(cmd);
            } else if (cmd.type === 'repeat') {
                for (let r = 0; r < cmd.times; r++) {
                    await executeProgram(cmd.commands);
                }
            } else if (cmd.type === 'ifPathAhead') {
                if (canMoveForward()) {
                    await executeProgram(cmd.commands);
                }
            }

            renderGrid();
            await sleep(config.speed);
            if (state.hasWon) break;
        }
    }

    async function executeCommand(cmd) {
        switch (cmd) {
            case 'move':
                if (canMoveForward()) moveForward();
                break;
            case 'left':
                turnLeft();
                break;
            case 'right':
                turnRight();
                break;
        }
        checkWin();
    }

    // --- Movement ---
    function moveForward() {
        switch (state.player.dir) {
            case 'up': state.player.y--; break;
            case 'down': state.player.y++; break;
            case 'left': state.player.x--; break;
            case 'right': state.player.x++; break;
        }
    }

    function canMoveForward() {
        let { x, y } = state.player;
        switch (state.player.dir) {
            case 'up': y--; break;
            case 'down': y++; break;
            case 'left': x--; break;
            case 'right': x++; break;
        }
        if (x < 0 || x >= config.gridSize || y < 0 || y >= config.gridSize) return false;
        if (config.obstacles.some(o => o.x === x && o.y === y)) return false;
        return true;
    }

    function turnLeft() {
        const dirs = ['up', 'left', 'down', 'right'];
        state.player.dir = dirs[(dirs.indexOf(state.player.dir) + 1) % 4];
    }

    function turnRight() {
        const dirs = ['up', 'right', 'down', 'left'];
        state.player.dir = dirs[(dirs.indexOf(state.player.dir) + 1) % 4];
    }

    // --- Win Condition ---
    function checkWin() {
        if (state.player.x === config.goalPos.x && state.player.y === config.goalPos.y) {
            state.hasWon = true;
            alert('🎉 You reached the goal!');
        }
    }

    // --- Controls ---
    container.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'repeat') {
                state.program.push({ type: 'repeat', times: 2, commands: ['move'] });
            } else if (action === 'ifPathAhead') {
                state.program.push({ type: 'ifPathAhead', commands: ['move'] });
            } else {
                addCommand(action);
            }
            updateProgramDisplay();
        });
    });

    container.querySelector('#runProgram').addEventListener('click', runProgram);
    container.querySelector('#stepProgram').addEventListener('click', async () => {
        if (!state.isRunning) {
            state.isRunning = true;
            const nextCmd = state.program.shift();
            if (nextCmd) await executeProgram([nextCmd]);
            state.isRunning = false;
            updateProgramDisplay();
        }
    });

    container.querySelector('#resetGame').addEventListener('click', () => {
        state.player = { ...config.startPos };
        state.hasWon = false;
        state.program = [];
        updateProgramDisplay();
        renderGrid();
    });

    container.querySelector('#clearProgram').addEventListener('click', () => {
        state.program = [];
        updateProgramDisplay();
    });

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Init ---
    renderGrid();
    updateProgramDisplay();
};
