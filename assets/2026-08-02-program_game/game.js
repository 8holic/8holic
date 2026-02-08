// ------------------- INIT FUNCTION -------------------
window.initProgrammingGame = function() {
    // ------------------- CONFIG -------------------
    const stages = [
        {
            name: "Stage 1",
            gridSize: 5,
            character: { x: 0, y: 0, direction: 'right' },
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
        stageIndex: null,
        programSequence: [],
    };

    // ------------------- CREATE CONTAINERS -------------------
    const body = document.body;

    // Container for entire game
    const gameContainer = document.createElement('div');
    gameContainer.id = 'programming-game';
    gameContainer.style.display = 'flex';
    gameContainer.style.flexDirection = 'column';
    gameContainer.style.alignItems = 'center';
    gameContainer.style.gap = '20px';
    body.appendChild(gameContainer);

    // Stage select
    const stageSelectEl = document.createElement('div');
    stageSelectEl.id = 'stageSelect';
    stageSelectEl.style.display = 'flex';
    stageSelectEl.style.gap = '10px';
    gameContainer.appendChild(stageSelectEl);

    // Grid
    const gridEl = document.createElement('div');
    gridEl.id = 'grid';
    gridEl.style.display = 'grid';
    gridEl.style.gridGap = '2px';
    gameContainer.appendChild(gridEl);

    // Code palette
    const codePalette = document.createElement('div');
    codePalette.id = 'codePalette';
    codePalette.style.display = 'flex';
    codePalette.style.gap = '10px';
    gameContainer.appendChild(codePalette);

    // Program area
    const programArea = document.createElement('div');
    programArea.id = 'programArea';
    programArea.style.display = 'flex';
    programArea.style.gap = '5px';
    programArea.style.minHeight = '50px';
    programArea.style.border = '1px solid #ccc';
    programArea.style.padding = '5px';
    gameContainer.appendChild(programArea);

    // Program controls
    const programControls = document.createElement('div');
    programControls.id = 'programControls';
    programControls.style.display = 'flex';
    programControls.style.gap = '10px';
    gameContainer.appendChild(programControls);

    const runProgramBtn = document.createElement('button');
    runProgramBtn.textContent = 'Run';
    programControls.appendChild(runProgramBtn);

    const stepProgramBtn = document.createElement('button');
    stepProgramBtn.textContent = 'Step';
    programControls.appendChild(stepProgramBtn);

    const resetProgramBtn = document.createElement('button');
    resetProgramBtn.textContent = 'Reset';
    programControls.appendChild(resetProgramBtn);

    const clearProgramBtn = document.createElement('button');
    clearProgramBtn.textContent = 'Clear';
    programControls.appendChild(clearProgramBtn);

    // ------------------- RENDER FUNCTIONS -------------------

    // 1️⃣ Stage Select Buttons
    function renderStageSelect() {
        stageSelectEl.innerHTML = '';
        stages.forEach((stage, i) => {
            const btn = document.createElement('button');
            btn.textContent = stage.name;
            btn.style.padding = '5px 10px';
            btn.style.cursor = 'pointer';
            if (i === state.stageIndex) btn.style.background = '#38a169';
            btn.addEventListener('click', () => {
                state.stageIndex = i;
                state.programSequence = [];
                renderStageSelect();
                renderGrid();
                renderProgramSequence();
            });
            stageSelectEl.appendChild(btn);
        });
    }

    // 2️⃣ Grid Rendering
    function renderGrid() {
        gridEl.innerHTML = '';

        if (state.stageIndex === null) {
            gridEl.textContent = 'Select a Stage';
            gridEl.style.display = 'flex';
            gridEl.style.justifyContent = 'center';
            gridEl.style.alignItems = 'center';
            gridEl.style.minHeight = '100px';
            return;
        }

        const stage = stages[state.stageIndex];
        const size = stage.gridSize;

        gridEl.style.gridTemplateColumns = `repeat(${size}, 50px)`;
        gridEl.style.gridTemplateRows = `repeat(${size}, 50px)`;

        function getCellContent(x, y) {
            const char = stage.character;
            if (char.x === x && char.y === y) {
                switch(char.direction){
                    case 'up': return '⬆️';
                    case 'down': return '⬇️';
                    case 'left': return '⬅️';
                    case 'right': return '➡️';
                }
            }
            for (let obs of stage.obstacles) if (obs.x===x && obs.y===y) return '🌳';
            for (let coin of stage.coins) if (coin.x===x && coin.y===y) return '🪙';
            if (stage.endPoint.x===x && stage.endPoint.y===y) return '🏰';
            return '';
        }

        for (let y=0; y<size; y++){
            for (let x=0; x<size; x++){
                const cell = document.createElement('div');
                cell.style.width = '50px';
                cell.style.height = '50px';
                cell.style.display = 'flex';
                cell.style.justifyContent = 'center';
                cell.style.alignItems = 'center';
                cell.style.border = '1px solid #ccc';
                cell.textContent = getCellContent(x,y);
                gridEl.appendChild(cell);
            }
        }
    }

    // 3️⃣ Code Palette
    function renderCodePalette() {
        codePalette.innerHTML = '';
        const blocks = [
            { name: 'Move', action: 'move' },
            { name: 'Turn ⟳', action: 'turn' }
        ];
        blocks.forEach(block=>{
            const btn = document.createElement('button');
            btn.textContent = block.name;
            btn.style.cursor='pointer';
            btn.addEventListener('click', ()=>{
                state.programSequence.push(block.action);
                renderProgramSequence();
            });
            codePalette.appendChild(btn);
        });
    }

    // 4️⃣ Program Sequence Display
    function renderProgramSequence() {
        programArea.innerHTML = '';
        state.programSequence.forEach(cmd=>{
            const stepEl = document.createElement('div');
            stepEl.textContent = cmd==='move'?'Move':'Turn ⟳';
            stepEl.style.padding='5px';
            stepEl.style.border='1px solid #ccc';
            stepEl.style.borderRadius='4px';
            programArea.appendChild(stepEl);
        });
    }

    // ------------------- PROGRAM CONTROLS -------------------
    // Clear
    clearProgramBtn.addEventListener('click', ()=>{
        state.programSequence=[];
        renderProgramSequence();
    });

    // Reset
    resetProgramBtn.addEventListener('click', ()=>{
        state.programSequence=[];
        renderProgramSequence();
        renderGrid();
    });

    // Step & Run (simplified)
    function executeStep() {
        if(state.stageIndex===null || state.programSequence.length===0) return;
        const stage = stages[state.stageIndex];
        const cmd = state.programSequence.shift();

        if(cmd==='turn'){
            // Always turn right
            switch(stage.character.direction){
                case 'up': stage.character.direction='right'; break;
                case 'right': stage.character.direction='down'; break;
                case 'down': stage.character.direction='left'; break;
                case 'left': stage.character.direction='up'; break;
            }
        } else if(cmd==='move'){
            let {x,y,direction} = stage.character;
            let newX=x, newY=y;
            switch(direction){
                case 'up': newY--; break;
                case 'down': newY++; break;
                case 'left': newX--; break;
                case 'right': newX++; break;
            }
            // Check boundaries and obstacles
            if(newX>=0 && newY>=0 && newX<stage.gridSize && newY<stage.gridSize){
                if(!stage.obstacles.some(o=>o.x===newX && o.y===newY)){
                    stage.character.x=newX;
                    stage.character.y=newY;
                    // Collect coins
                    stage.coins = stage.coins.filter(c=>!(c.x===newX && c.y===newY));
                }
            }
        }

        renderGrid();
        renderProgramSequence();
    }

    stepProgramBtn.addEventListener('click', executeStep);

    runProgramBtn.addEventListener('click', ()=>{
        while(state.programSequence.length>0){
            executeStep();
        }
    });

    // ------------------- INIT -------------------
    renderStageSelect();
    renderGrid();
    renderCodePalette();
    renderProgramSequence();
};

// ------------------- AUTO INIT -------------------
document.addEventListener('DOMContentLoaded', ()=>{
    if(window.initProgrammingGame) window.initProgrammingGame();
});
