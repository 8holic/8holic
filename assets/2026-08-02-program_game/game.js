window.initProgrammingGame = function(container) {
    // ------------------- CONFIG -------------------
    const cellSize = 50; // pixels per cell

    const stages = [
        { 
            name: "Stage 1",
            gridSize: 7 // default 7x7 grid
        },
        { 
            name: "Stage 2",
            gridSize: 6
        },
        { 
            name: "Stage 3",
            gridSize: 8
        }
    ];

    // ------------------- STATE -------------------
    let state = {
        stageIndex: null
    };

    // ------------------- DOM -------------------
    const stageSelectEl = document.getElementById('stageSelect');
    const gameContainer = container;

    // Create a grid container if it doesn't exist
    let gridEl = document.getElementById('grid');
    if(!gridEl) {
        gridEl = document.createElement('div');
        gridEl.id = 'grid';
        gridEl.style.display = 'grid';
        gridEl.style.gap = '1px';
        gridEl.style.marginTop = '20px';
        gameContainer.appendChild(gridEl);
    }

    // ------------------- STAGE SELECT -------------------
    function renderStageSelect() {
        stageSelectEl.innerHTML = ''; // Clear previous buttons

        stages.forEach((stage, i) => {
            const btn = document.createElement('button');
            btn.className = 'pg-code-block';
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

    // ------------------- GRID RENDER -------------------
    function renderGrid() {
        gridEl.innerHTML = '';

        if (state.stageIndex === null) {
            // Show "No Stage Selected" message
            gridEl.textContent = "No Stage Selected";
            gridEl.style.color = "white";
            gridEl.style.fontSize = "20px";
            gridEl.style.textAlign = "center";
            gridEl.style.height = "200px";
            gridEl.style.display = "flex";
            gridEl.style.alignItems = "center";
            gridEl.style.justifyContent = "center";
            gridEl.style.background = "rgba(255,255,255,0.1)";
            return;
        }

        const stage = stages[state.stageIndex];
        const size = stage.gridSize;

        // Reset grid styles for actual grid
        gridEl.style.display = "grid";
        gridEl.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
        gridEl.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
        gridEl.style.background = "#222";

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cell = document.createElement('div');
                cell.style.width = cell.style.height = cellSize + "px";
                cell.style.border = "1px solid #555";
                cell.style.boxSizing = "border-box";
                gridEl.appendChild(cell);
            }
        }
    }

    // ------------------- INIT -------------------
    renderStageSelect();
    renderGrid(); // show default "No Stage Selected"
};
