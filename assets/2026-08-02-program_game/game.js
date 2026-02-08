window.initProgrammingGame = function() {
    // ------------------- CONFIG -------------------
    const stages = [
        { name: "Stage 1", gridSize: 5 },
        { name: "Stage 2", gridSize: 6 },
        { name: "Stage 3", gridSize: 7 }
    ];

    const blocks = [
        { type: 'move', label: 'Move' },
        { type: 'turn', label: 'Turn Clockwise' }
    ];

    // ------------------- STATE -------------------
    let state = {
        stageIndex: null,
        program: [], // the program sequence
        stepIndex: 0
    };

    // ------------------- DOM -------------------
    const stageSelectEl = document.getElementById('stageSelect');
    const gridEl = document.getElementById('grid');
    const codePaletteEl = document.getElementById('codePalette');
    const programAreaEl = document.getElementById('programArea');
    const runBtn = document.getElementById('runProgram');
    const stepBtn = document.getElementById('stepProgram');
    const resetBtn = document.getElementById('resetProgram');
    const clearBtn = document.getElementById('clearProgram');

    if(!stageSelectEl || !gridEl || !codePaletteEl || !programAreaEl){
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
                cell.textContent = '';
                gridEl.appendChild(cell);
            }
        }
    }

    // ------------------- CODE PALETTE -------------------
    function renderCodePalette() {
        codePaletteEl.innerHTML = '';
        blocks.forEach(block => {
            const blockEl = document.createElement('div');
            blockEl.textContent = block.label;
            blockEl.draggable = true;
            blockEl.style.padding = '5px 10px';
            blockEl.style.background = 'rgba(255,255,255,0.2)';
            blockEl.style.cursor = 'grab';
            blockEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('type', block.type);
            });
            codePaletteEl.appendChild(blockEl);
        });
    }

    // ------------------- PROGRAM AREA -------------------
    programAreaEl.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    programAreaEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('type');
        if(type) {
            state.program.push({ type });
            renderProgram();
        }
    });

    function renderProgram() {
        programAreaEl.innerHTML = '';
        state.program.forEach((block, i) => {
            const blockEl = document.createElement('div');
            blockEl.textContent = block.type === 'move' ? 'Move' : 'Turn';
            blockEl.style.padding = '5px 10px';
            blockEl.style.background = 'rgba(255,255,255,0.2)';
            blockEl.style.border = '1px solid rgba(255,255,255,0.3)';
            blockEl.style.borderRadius = '4px';
            programAreaEl.appendChild(blockEl);
        });
    }

    // ------------------- PROGRAM CONTROLS -------------------
    runBtn.addEventListener('click', () => {
        alert('Program would run! (to be implemented)');
    });
    stepBtn.addEventListener('click', () => {
        alert('Step execution! (to be implemented)');
    });
    resetBtn.addEventListener('click', () => {
        state.stepIndex = 0;
        renderGrid();
    });
    clearBtn.addEventListener('click', () => {
        state.program = [];
        renderProgram();
    });

    // ------------------- INIT -------------------
    renderStageSelect();
    renderGrid();
    renderCodePalette();
    renderProgram();
};
