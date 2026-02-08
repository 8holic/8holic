// ------------------- INIT FUNCTION -------------------
window.initProgrammingGame = function() {
    // ------------------- CONFIG -------------------
    const stages = [
        {
            name: "Stage 1",
            gridSize: 5,
            character: { x: 0, y: 0, direction: 'right' }, // direction can be: up, down, left, right
            obstacles: [ { x: 2, y: 1 }, { x: 1, y: 3 } ],
            coins: [ { x: 4, y: 0 }, { x: 3, y: 3 } ],
            endPoint: { x: 4, y: 4 }
        },
        {
            name: "Stage 2",
            gridSize: 6,
            character: { x: 0, y: 0, direction: 'down' },
            obstacles: [ { x: 1, y: 2 }, { x: 4, y: 1 } ],
            coins: [ { x: 2, y: 4 }, { x: 5, y: 5 } ],
            endPoint: { x: 5, y: 0 }
        },
        {
            name: "Stage 3",
            gridSize: 7,
            character: { x: 0, y: 6, direction: 'up' },
            obstacles: [ { x: 3, y: 3 }, { x: 5, y: 2 } ],
            coins: [ { x: 1, y: 1 }, { x: 6, y: 6 }, { x: 4, y: 5 } ],
            endPoint: { x: 6, y: 0 }
        }
    ];

    // ------------------- STATE -------------------
    let state = {
        stageIndex: null
    };

    // ------------------- DOM ELEMENTS -------------------
    const stageSelectEl = document.getElementById('stageSelect');
    const gridEl = document.getElementById('grid');

    if (!stageSelectEl || !gridEl) {
        console.error('Required elements not found');
        return;
    }

    // ------------------- RENDER STAGE SELECT BUTTONS -------------------
    function renderStageSelect() {
        stageSelectEl.innerHTML = '';
        stages.forEach((stage, i) => {
            const btn = document.createElement('button');
            btn.textContent = stage.name;
            if (i === state.stageIndex) btn.classList.add('selected');
            btn.addEventListener('click', () => {
                state.stageIndex = i;
                renderStageSelect();
                renderGrid();
            });
            stageSelectEl.appendChild(btn);
        });
    }

    // ------------------- RENDER GRID -------------------
    function renderGrid() {
        gridEl.innerHTML = '';

        if (state.stageIndex === null) {
            // No stage selected
            gridEl.textContent = 'No Stage Selected';
            gridEl.style.display = 'flex';
            gridEl.style.justifyContent = 'center';
            gridEl.style.alignItems = 'center';
            gridEl.style.minHeight = '200px';
            return;
        }

        const stage = stages[state.stageIndex];
        const size = stage.gridSize;

        // Set grid layout
        gridEl.style.display = 'grid';
        gridEl.style.gridTemplateColumns = `repeat(${size}, 50px)`;
        gridEl.style.gridTemplateRows = `repeat(${size}, 50px)`;
        gridEl.style.minHeight = 'auto';

        // Helper: find what goes in each cell
        function getCellContent(x, y) {
            // Character
            if (stage.character.x === x && stage.character.y === y) {
                switch(stage.character.direction) {
                    case 'up': return '⬆️';
                    case 'down': return '⬇️';
                    case 'left': return '⬅️';
                    case 'right': return '➡️';
                }
            }

            // Obstacle
            for (let obs of stage.obstacles) {
                if (obs.x === x && obs.y === y) return '🌳';
            }

            // Coin
            for (let coin of stage.coins) {
                if (coin.x === x && coin.y === y) return '🪙';
            }

            // End point
            if (stage.endPoint.x === x && stage.endPoint.y === y) return '🏰';

            // Empty
            return '';
        }

        // Build the grid
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cell = document.createElement('div');
                cell.textContent = getCellContent(x, y);
                gridEl.appendChild(cell);
            }
        }
    }
    // ------------------- AVAILABLE BLOCKS / PROGRAM AREA -------------------

    // DOM elements
    const codePalette = document.getElementById('codePalette');
    const programArea = document.getElementById('programArea');
    const runProgramBtn = document.getElementById('runProgram');
    const stepProgramBtn = document.getElementById('stepProgram');
    const resetProgramBtn = document.getElementById('resetProgram');
    const clearProgramBtn = document.getElementById('clearProgram');

    // Program sequence state
    let programSequence = []; // stores 'move' or 'turn'

    // 1️⃣ Render Available Blocks
    function renderCodePalette() {
        codePalette.innerHTML = '';
        const blocks = [
            { name: 'Move', action: 'move' },
            { name: 'Turn Right', action: 'turn' }
        ];

        blocks.forEach(block => {
            const btn = document.createElement('button');
            btn.textContent = block.name;
            btn.className = 'pg-code-block';
            btn.dataset.action = block.action;

            btn.addEventListener('click', () => {
                // Add block to sequence
                programSequence.push(block.action);
                renderProgramSequence();
            });

            codePalette.appendChild(btn);
        });
    }

    // 2️⃣ Render Program Sequence
    function renderProgramSequence() {
        programArea.innerHTML = '';
        programSequence.forEach(cmd => {
            const stepEl = document.createElement('div');
            stepEl.className = 'pg-program-step';
            stepEl.textContent = cmd === 'move' ? 'Move' : 'Turn ⟳';
            programArea.appendChild(stepEl);
        });
    }

    // 3️⃣ Clear Program
    clearProgramBtn.addEventListener('click', () => {
        programSequence = [];
        renderProgramSequence();
    });

    // 4️⃣ Reset Stage
    resetProgramBtn.addEventListener('click', () => {
        programSequence = [];
        renderProgramSequence();
        renderGrid(); // reset character
    });

    // ------------------- INIT -------------------
    renderStageSelect();
    renderGrid();
    renderCodePalette();
    renderProgramSequence();
};

