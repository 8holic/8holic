window.initProgrammingGame = function() {
    // ------------------- CONFIG -------------------
    const stages = [
        { name: "Stage 1", gridSize: 5 },
        { name: "Stage 2", gridSize: 6 },
        { name: "Stage 3", gridSize: 7 }
    ];

    // ------------------- STATE -------------------
    let state = {
        stageIndex: null
    };

    // ------------------- DOM -------------------
    const stageSelectEl = document.getElementById('stageSelect');
    const gridEl = document.getElementById('grid');

    if(!stageSelectEl || !gridEl){
        console.error('Required elements not found');
        return;
    }

    // ------------------- STAGE SELECT -------------------
    function renderStageSelect() {
        stageSelectEl.innerHTML = '';
        stages.forEach((stage, i) => {
            const btn = document.createElement('button');
            btn.textContent = stage.name;
            if(i === state.stageIndex) btn.classList.add('selected');
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
        if(state.stageIndex === null) {
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

        for(let y=0; y<stage.gridSize; y++){
            for(let x=0; x<stage.gridSize; x++){
                const cell = document.createElement('div');
                cell.textContent = ''; // empty for now
                gridEl.appendChild(cell);
            }
        }
    }

    // ------------------- INIT -------------------
    renderStageSelect();
    renderGrid();
};
