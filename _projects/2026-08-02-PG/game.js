// Programming Game - Self-contained module
window.initProgrammingGame = function(container) {
    'use strict';
    
    // Configuration
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
        speed: 500
    };
    
    // State
    const state = {
        player: { ...config.startPos },
        program: [],
        isRunning: false,
        hasWon: false
    };
    
    // Initialize
    function init() {
        renderGame(container);
        setupEventListeners();
        updateGrid();
    }
    
    // Render game HTML
    function renderGame(container) {
        container.innerHTML = `
            <div class="programming-game">
                <div class="pg-container">
                    <div class="pg-header">
                        <h2>Programming Puzzle Game</h2>
                        <p>Reach the green goal using commands!</p>
                    </div>
                    
                    <div id="pg-grid" class="pg-grid-7x7"></div>
                    
                    <div class="pg-controls">
                        <h3>Code Blocks</h3>
                        <div class="pg-code-blocks">
                            <button class="pg-code-block" data-action="move">Move Forward</button>
                            <button class="pg-code-block" data-action="right">Turn Right</button>
                            <button class="pg-code-block" data-action="left">Turn Left</button>
                        </div>
                        
                        <div class="pg-execution-controls">
                            <button id="pg-run" class="pg-btn pg-btn-run">Run Program</button>
                            <button id="pg-step" class="pg-btn pg-btn-step">Step</button>
                            <button id="pg-reset" class="pg-btn pg-btn-reset">Reset</button>
                            <button id="pg-clear" class="pg-btn pg-btn-clear">Clear</button>
                        </div>
                    </div>
                    
                    <div class="pg-program-area">
                        <h3>Your Program:</h3>
                        <div id="pg-program" class="pg-program-sequence"></div>
                        <div style="text-align: center; margin-top: 10px;">
                            <small>Commands: <span id="pg-count">0</span></small>
                        </div>
                    </div>
                    
                    <div class="pg-instructions">
                        <h4>How to Play:</h4>
                        <ul>
                            <li>Click code blocks to add commands to your program</li>
                            <li>Click "Run Program" to execute all commands</li>
                            <li>Click "Step" to execute one command at a time</li>
                            <li>Reach the green cell to win!</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Code blocks
        document.querySelectorAll('.pg-code-block').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!state.isRunning && !state.hasWon) {
                    addToProgram(btn.dataset.action);
                }
            });
        });
        
        // Execution controls
        document.getElementById('pg-run').addEventListener('click', runProgram);
        document.getElementById('pg-step').addEventListener('click', executeStep);
        document.getElementById('pg-reset').addEventListener('click', resetGame);
        document.getElementById('pg-clear').addEventListener('click', clearProgram);
    }
    
    // Create grid
    function createGrid() {
        const grid = document.getElementById('pg-grid');
        grid.innerHTML = '';
        
        for (let y = 0; y < config.gridSize; y++) {
            for (let x = 0; x < config.gridSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'pg-cell';
                cell.id = `pg-cell-${x}-${y}`;
                grid.appendChild(cell);
            }
        }
    }
    
    // Update grid display
    function updateGrid() {
        if (!document.getElementById('pg-grid')) {
            createGrid();
        }
        
        // Clear all cells
        document.querySelectorAll('.pg-cell').forEach(cell => {
            cell.className = 'pg-cell';
            cell.textContent = '';
            
            const coords = cell.id.match(/\d+/g);
            const x = parseInt(coords[0]);
            const y = parseInt(coords[1]);
            
            // Check obstacles
            if (config.obstacles.some(obs => obs.x === x && obs.y === y)) {
                cell.classList.add('pg-cell-obstacle');
                cell.textContent = '⬛';
            }
            
            // Check goal
            if (x === config.goalPos.x && y === config.goalPos.y) {
                cell.classList.add('pg-cell-goal');
                cell.textContent = '🏁';
            }
            
            // Check player
            if (x === state.player.x && y === state.player.y) {
                cell.classList.add('pg-cell-player');
                cell.classList.add(state.player.dir);
            }
        });
    }
    
    // Add command to program
    function addToProgram(action) {
        state.program.push(action);
        updateProgramDisplay();
    }
    
    // Update program display
    function updateProgramDisplay() {
        const programEl = document.getElementById('pg-program');
        const countEl = document.getElementById('pg-count');
        
        programEl.innerHTML = '';
        state.program.forEach((action, index) => {
            const step = document.createElement('div');
            step.className = 'pg-program-step';
            step.textContent = getActionText(action);
            programEl.appendChild(step);
        });
        
        countEl.textContent = state.program.length;
    }
    
    function getActionText(action) {
        const texts = {
            'move': 'Move',
            'right': 'Turn Right',
            'left': 'Turn Left'
        };
        return texts[action] || action;
    }
    
    // Run entire program
    async function runProgram() {
        if (state.isRunning || state.program.length === 0 || state.hasWon) return;
        
        state.isRunning = true;
        updateButtons();
        
        for (const action of state.program) {
            if (state.hasWon) break;
            await executeAction(action);
            await sleep(config.speed);
        }
        
        state.isRunning = false;
        updateButtons();
        checkWin();
    }
    
    // Execute single step
    async function executeStep() {
        if (state.isRunning || state.program.length === 0 || state.hasWon) return;
        
        state.isRunning = true;
        updateButtons();
        
        const nextAction = state.program.shift();
        await executeAction(nextAction);
        
        state.isRunning = false;
        updateProgramDisplay();
        updateButtons();
        checkWin();
    }
    
    // Execute specific action
    async function executeAction(action) {
        switch (action) {
            case 'move':
                await moveForward();
                break;
            case 'right':
                turnRight();
                break;
            case 'left':
                turnLeft();
                break;
        }
        updateGrid();
    }
    
    // Move player forward
    function moveForward() {
        let newX = state.player.x;
        let newY = state.player.y;
        
        switch (state.player.dir) {
            case 'right': newX++; break;
            case 'left': newX--; break;
            case 'up': newY--; break;
            case 'down': newY++; break;
        }
        
        // Check if move is valid
        if (isValidMove(newX, newY)) {
            state.player.x = newX;
            state.player.y = newY;
            return Promise.resolve();
        }
        return Promise.resolve();
    }
    
    // Check if move is valid
    function isValidMove(x, y) {
        // Check boundaries
        if (x < 0 || x >= config.gridSize || y < 0 || y >= config.gridSize) {
            return false;
        }
        
        // Check obstacles
        if (config.obstacles.some(obs => obs.x === x && obs.y === y)) {
            return false;
        }
        
        return true;
    }
    
    // Turn right
    function turnRight() {
        const directions = ['up', 'right', 'down', 'left'];
        const currentIndex = directions.indexOf(state.player.dir);
        state.player.dir = directions[(currentIndex + 1) % 4];
    }
    
    // Turn left
    function turnLeft() {
        const directions = ['up', 'right', 'down', 'left'];
        const currentIndex = directions.indexOf(state.player.dir);
        state.player.dir = directions[(currentIndex + 3) % 4];
    }
    
    // Check win condition
    function checkWin() {
        if (state.player.x === config.goalPos.x && state.player.y === config.goalPos.y) {
            state.hasWon = true;
            setTimeout(() => {
                alert('🎉 Congratulations! You reached the goal!');
            }, 300);
        }
    }
    
    // Reset game
    function resetGame() {
        state.player = { ...config.startPos };
        state.isRunning = false;
        state.hasWon = false;
        updateGrid();
        updateButtons();
    }
    
    // Clear program
    function clearProgram() {
        if (!state.isRunning) {
            state.program = [];
            updateProgramDisplay();
        }
    }
    
    // Update button states
    function updateButtons() {
        const runBtn = document.getElementById('pg-run');
        const stepBtn = document.getElementById('pg-step');
        const clearBtn = document.getElementById('pg-clear');
        
        if (runBtn) runBtn.disabled = state.isRunning || state.program.length === 0 || state.hasWon;
        if (stepBtn) stepBtn.disabled = state.isRunning || state.program.length === 0 || state.hasWon;
        if (clearBtn) clearBtn.disabled = state.isRunning || state.program.length === 0;
    }
    
    // Utility: sleep function
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Initialize the game
    init();
};