// game.js

// ------------------- INIT GAME FUNCTION -------------------
window.initProgrammingGame = function() {

    // ------------------- CONFIG: STAGES -------------------
    // Each stage has:
    // - gridSize: number of rows/columns
    // - layout: 2D array with symbols
    // - character: initial position (x, y) and direction
    const stages = [
        {
            name: "Stage 1",
            gridSize: 5,
            layout: [
                ['C', '', '', '', 'E'],
                ['', '', 'O', '', ''],
                ['', 'M', '', 'M', ''],
                ['', '', '', '', ''],
                ['', '', '', '', '']
            ],
            character: { x: 0, y: 0, dir: 'up' }
        },
        {
            name: "Stage 2",
            gridSize: 6,
            layout: [
                ['', '', '', '', '', 'E'],
                ['', 'O', '', 'M', '', ''],
                ['C', '', '', '', 'O', ''],
                ['', '', 'M', '', '', ''],
                ['', 'O', '', '', '', ''],
                ['', '', '', '', '', '']
            ],
            character: { x: 0, y: 2, dir: 'up' }
        },
        {
            name: "Stage 3",
            gridSize: 7,
            layout: [
                ['C', '', '', '', '', '', 'E'],
                ['', '', 'O', '', 'M', '', ''],
                ['', '', '', '', '', '', ''],
                ['', 'M', '', 'O', '', '', ''],
                ['', '', '', '', '', '', ''],
                ['', 'O', '', '', '', 'M', ''],
                ['', '', '', '', '', '', '']
            ],
            character: { x: 0, y: 0, dir: 'up' }
        }
    ];

    // ------------------- STATE -------------------
    let state = {
        stageIndex: null // no stage selected initially
    };

    // ------------------- DOM ELEMENTS -------------------
    const stageSelectEl = document.getElementById('stageSelect');
    const gridEl = document.getElementById('grid');

    if (!stageSelectEl || !gridEl) {
        console.error('Required elements not found');
        return;
    }

    // ------------------- SYMBOL TO EMOJI MAPPING -------------------
    const cellSymbols = {
        'C': '⬆️', // Character (arrow indicates direction)
        'O': '🌳', // Obstacle (tree)
        'M': '🪙', // Coin
        'E': '🏰', // End point (castle)
        '': ''     // Empty cell
    };

    // ------------------- RENDER STAGE SELECT BUTTONS -------------------
    function renderStageSelect() {
        stageSelectEl.innerHTML = ''; // clear previous buttons

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
        gridEl.innerHTML = ''; // clear grid

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
        gridEl.style.display = 'grid';
        gridEl.style.gridTemplateColumns = `repeat(${stage.gridSize}, 50px)`;
        gridEl.style.gridTemplateRows = `repeat(${stage.gridSize}, 50px)`;
        gridEl.style.minHeight = 'auto';

        for (let y = 0; y < stage.gridSize; y++) {
            for (let x = 0; x < stage.gridSize; x++) {
                const cell = document.createElement('div');
                const symbol = stage.layout[y][x];
                cell.textContent = cellSymbols[symbol] || '';
                gridEl.appendChild(cell);
            }
        }
    }

    // ------------------- INIT -------------------
    renderStageSelect(); // show stage buttons
    renderGrid();        // show initial empty grid ("No Stage Selected")
};
