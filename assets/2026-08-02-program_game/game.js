// ------------------- INIT FUNCTION -------------------
window.initProgrammingGame = function() {
    // ------------------- CONFIG -------------------
    const stages = [
        {
            name: "Stage 1",
            gridSize: 6,
            character: { x: 0, y: 2, direction: 'right' },
            obstacles: [ { x: 2, y: 2 } ],
            coins: [ { x: 1, y: 0 }, { x: 3, y: 0 } ],
            endPoint: { x: 3, y: 4 }
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
        currentView: 'stageSelect',
        currentStageIndex: null,
        programSequence: [], // Array to store programmed commands
        stageState: null // Copy of current stage for gameplay
    };

    // ------------------- CREATE MAIN CONTAINER -------------------
    const body = document.body;
    
    // Clear any existing game
    const existingGame = document.getElementById('programming-game');
    if (existingGame) existingGame.remove();
    
    // Container for entire game
    const gameContainer = document.createElement('div');
    gameContainer.id = 'programming-game';
    gameContainer.style.display = 'flex';
    gameContainer.style.flexDirection = 'column';
    gameContainer.style.alignItems = 'center';
    gameContainer.style.gap = '20px';
    gameContainer.style.padding = '20px';
    body.appendChild(gameContainer);

    // ------------------- UTILITY FUNCTIONS -------------------

    // Deep copy a stage object
    function cloneStage(stage) {
        return JSON.parse(JSON.stringify(stage));
    }

    // ------------------- GAME LOGIC FUNCTIONS -------------------

    // Execute a single command on the stage
    function executeCommand(command) {
        if (!state.stageState) return false;
        
        const stage = state.stageState;
        const char = stage.character;
        
        if (command === 'turn') {
            // Always turn right
            switch(char.direction) {
                case 'up': char.direction = 'right'; break;
                case 'right': char.direction = 'down'; break;
                case 'down': char.direction = 'left'; break;
                case 'left': char.direction = 'up'; break;
            }
            return true;
        }
        
        if (command === 'move') {
            let newX = char.x;
            let newY = char.y;
            
            // Calculate new position based on direction
            switch(char.direction) {
                case 'up': newY--; break;
                case 'down': newY++; break;
                case 'left': newX--; break;
                case 'right': newX++; break;
            }
            
            // Check boundaries
            if (newX < 0 || newY < 0 || newX >= stage.gridSize || newY >= stage.gridSize) {
                return false; // Can't move out of bounds
            }
            
            // Check obstacles
            if (stage.obstacles.some(obs => obs.x === newX && obs.y === newY)) {
                return false; // Can't move through obstacles
            }
            
            // Move is valid
            char.x = newX;
            char.y = newY;
            
            // Collect coin if on coin position
            const coinIndex = stage.coins.findIndex(coin => coin.x === newX && coin.y === newY);
            if (coinIndex !== -1) {
                stage.coins.splice(coinIndex, 1); // Remove collected coin
            }
            
            return true;
        }
        
        return false;
    }

    // Check win condition
    function checkWinCondition() {
        const stage = state.stageState;
        const char = stage.character;
        
        // Must have collected all coins AND be at the endpoint
        const allCoinsCollected = stage.coins.length === 0;
        const atEndpoint = char.x === stage.endPoint.x && char.y === stage.endPoint.y;
        
        return allCoinsCollected && atEndpoint;
    }

    // ------------------- RENDER FUNCTIONS -------------------

    // Render Stage Select View
    function renderStageSelectView() {
        gameContainer.innerHTML = '';
        state.currentView = 'stageSelect';
        
        // Title
        const title = document.createElement('h1');
        title.textContent = 'Select a Stage';
        title.style.marginBottom = '20px';
        gameContainer.appendChild(title);
        
        // Scrollable stage list container
        const stageListContainer = document.createElement('div');
        stageListContainer.style.width = '300px';
        stageListContainer.style.maxHeight = '400px';
        stageListContainer.style.overflowY = 'auto';
        stageListContainer.style.border = '1px solid #ccc';
        stageListContainer.style.borderRadius = '8px';
        stageListContainer.style.padding = '10px';
        stageListContainer.style.display = 'flex';
        stageListContainer.style.flexDirection = 'column';
        stageListContainer.style.gap = '10px';
        gameContainer.appendChild(stageListContainer);
        
        // Create stage buttons
        stages.forEach((stage, index) => {
            const stageButton = document.createElement('button');
            stageButton.textContent = `${stage.name} (${stage.gridSize}×${stage.gridSize})`;
            stageButton.style.width = '100%';
            stageButton.style.padding = '12px';
            stageButton.style.border = 'none';
            stageButton.style.borderRadius = '6px';
            stageButton.style.background = '#38a169';
            stageButton.style.color = 'white';
            stageButton.style.cursor = 'pointer';
            stageButton.style.fontSize = '16px';
            stageButton.style.textAlign = 'left';
            stageButton.style.display = 'flex';
            stageButton.style.justifyContent = 'space-between';
            stageButton.style.alignItems = 'center';
            
            // Stage info
            const info = document.createElement('span');
            info.textContent = `${stage.coins.length} coins`;
            info.style.fontSize = '14px';
            info.style.opacity = '0.8';
            stageButton.appendChild(info);
            
            stageButton.addEventListener('click', () => {
                state.currentStageIndex = index;
                state.stageState = cloneStage(stages[index]);
                state.programSequence = [];
                renderStageView();
            });
            
            stageButton.addEventListener('mouseenter', () => {
                stageButton.style.background = '#2f855a';
            });
            
            stageButton.addEventListener('mouseleave', () => {
                stageButton.style.background = '#38a169';
            });
            
            stageListContainer.appendChild(stageButton);
        });
    }

    // Render Grid
    function renderGrid() {
        const gridContainer = document.getElementById('gridContainer');
        if (!gridContainer) return;
        
        gridContainer.innerHTML = '';
        
        const stage = state.stageState;
        const size = stage.gridSize;
        
        // Create grid element
        const gridEl = document.createElement('div');
        gridEl.style.display = 'grid';
        gridEl.style.gridTemplateColumns = `repeat(${size}, 50px)`;
        gridEl.style.gridTemplateRows = `repeat(${size}, 50px)`;
        gridEl.style.gap = '2px';
        gridEl.style.border = '2px solid #333';
        gridEl.style.padding = '5px';
        gridEl.style.backgroundColor = '#f0f0f0';
        
        // Function to get cell content
        function getCellContent(x, y) {
            const char = stage.character;
            
            // Check character position
            if (char.x === x && char.y === y) {
                switch(char.direction) {
                    case 'up': return '⬆️';
                    case 'down': return '⬇️';
                    case 'left': return '⬅️';
                    case 'right': return '➡️';
                }
            }
            
            // Check obstacles
            if (stage.obstacles.some(obs => obs.x === x && obs.y === y)) {
                return '🌳';
            }
            
            // Check coins
            if (stage.coins.some(coin => coin.x === x && coin.y === y)) {
                return '🪙';
            }
            
            // Check endpoint
            if (stage.endPoint.x === x && stage.endPoint.y === y) {
                return '🏰';
            }
            
            return ''; // Empty cell
        }
        
        // Create cells
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cell = document.createElement('div');
                cell.style.width = '50px';
                cell.style.height = '50px';
                cell.style.display = 'flex';
                cell.style.justifyContent = 'center';
                cell.style.alignItems = 'center';
                cell.style.border = '1px solid #ccc';
                cell.style.backgroundColor = 'white';
                cell.style.fontSize = '20px';
                cell.textContent = getCellContent(x, y);
                gridEl.appendChild(cell);
            }
        }
        
        gridContainer.appendChild(gridEl);
    }

    // Render Code Palette
    function renderCodePalette() {
        const paletteContainer = document.getElementById('paletteContainer');
        if (!paletteContainer) return;
        
        paletteContainer.innerHTML = '';
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Drag Commands:';
        title.style.marginBottom = '10px';
        paletteContainer.appendChild(title);
        
        // Command blocks
        const commands = [
            { name: 'Move', action: 'move', color: '#4299e1' },
            { name: 'Turn ⟳', action: 'turn', color: '#ed8936' }
        ];
        
        commands.forEach(cmd => {
            const block = document.createElement('div');
            block.textContent = cmd.name;
            block.dataset.action = cmd.action;
            block.style.padding = '10px';
            block.style.margin = '5px';
            block.style.backgroundColor = cmd.color;
            block.style.color = 'white';
            block.style.borderRadius = '4px';
            block.style.cursor = 'grab';
            block.style.textAlign = 'center';
            block.style.userSelect = 'none'; // Prevent text selection
            block.draggable = true;
            
            // Drag events
            block.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', cmd.action);
                block.style.opacity = '0.5';
            });
            
            block.addEventListener('dragend', () => {
                block.style.opacity = '1';
            });
            
            paletteContainer.appendChild(block);
        });
        
        // Instructions
        const instructions = document.createElement('p');
        instructions.textContent = 'Drag commands to the program area below';
        instructions.style.fontSize = '12px';
        instructions.style.color = '#666';
        instructions.style.marginTop = '10px';
        paletteContainer.appendChild(instructions);
    }

    // Render Program Area
    function renderProgramArea() {
        const programContainer = document.getElementById('programContainer');
        if (!programContainer) return;
        
        programContainer.innerHTML = '';
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Your Program:';
        title.style.marginBottom = '10px';
        programContainer.appendChild(title);
        
        // Drop zone
        const dropZone = document.createElement('div');
        dropZone.id = 'programDropZone';
        dropZone.style.minHeight = '100px';
        dropZone.style.maxHeight = '200px'; // ← ADD THIS LINE
        dropZone.style.overflowY = 'auto';  // ← ADD THIS LINE
        dropZone.style.border = '2px dashed #ccc';
        dropZone.style.borderRadius = '8px';
        dropZone.style.padding = '10px';
        dropZone.style.display = 'flex';
        dropZone.style.flexWrap = 'wrap';
        dropZone.style.gap = '5px';
        dropZone.style.alignContent = 'flex-start';
        
        // Drag over event
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#4299e1';
            dropZone.style.backgroundColor = '#ebf8ff';
        });
        
        // Drag leave event
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = '#ccc';
            dropZone.style.backgroundColor = 'white';
        });
        
        // Drop event
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#ccc';
            dropZone.style.backgroundColor = 'white';
            
            const action = e.dataTransfer.getData('text/plain');
            if (action === 'move' || action === 'turn') {
                state.programSequence.push(action);
                updateProgramDisplay();
            }
        });
        
        programContainer.appendChild(dropZone);
        
        // Display current program
        updateProgramDisplay();
        
        function updateProgramDisplay() {
            dropZone.innerHTML = '';
            
            if (state.programSequence.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.textContent = 'Drop commands here...';
                placeholder.style.color = '#999';
                placeholder.style.width = '100%';
                placeholder.style.textAlign = 'center';
                placeholder.style.padding = '20px';
                dropZone.appendChild(placeholder);
                return;
            }
            
            state.programSequence.forEach((cmd, index) => {
                const block = document.createElement('div');
                block.textContent = cmd === 'move' ? 'Move' : 'Turn ⟳';
                block.style.padding = '8px 12px';
                block.style.backgroundColor = cmd === 'move' ? '#4299e1' : '#ed8936';
                block.style.color = 'white';
                block.style.borderRadius = '4px';
                block.style.display = 'flex';
                block.style.alignItems = 'center';
                block.style.gap = '5px';
                block.style.cursor = 'pointer';
                
                // Remove button (X)
                const removeBtn = document.createElement('span');
                removeBtn.textContent = '×';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.padding = '2px 6px';
                removeBtn.style.borderRadius = '50%';
                removeBtn.style.backgroundColor = 'rgba(255,255,255,0.3)';
                removeBtn.style.fontSize = '14px';
                
                removeBtn.addEventListener('click', () => {
                    state.programSequence.splice(index, 1);
                    updateProgramDisplay();
                });
                
                block.appendChild(removeBtn);
                dropZone.appendChild(block);
            });
        }
    }

    // Render Control Buttons
    function renderControls() {
        const controlsContainer = document.getElementById('controlsContainer');
        if (!controlsContainer) return;
        
        controlsContainer.innerHTML = '';
        
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '10px';
        controls.style.flexWrap = 'wrap';
        controls.style.justifyContent = 'center';
        
        // Run Button - Execute all commands
        const runBtn = document.createElement('button');
        runBtn.textContent = 'Run Program';
        runBtn.style.padding = '10px 20px';
        runBtn.style.backgroundColor = '#38a169';
        runBtn.style.color = 'white';
        runBtn.style.border = 'none';
        runBtn.style.borderRadius = '6px';
        runBtn.style.cursor = 'pointer';
        
        runBtn.addEventListener('click', async () => {
            // Disable buttons during execution
            [runBtn, resetBtn, clearBtn].forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
            });
            
            // Create a copy of program sequence to execute
            const programToExecute = [...state.programSequence];
            
            // Execute each command with delay for visualization
            for (const command of programToExecute) {
                executeCommand(command);
                renderGrid();
                
                // Check win condition after each move
                if (checkWinCondition()) {
                    alert('🎉 Congratulations! You completed the stage!');
                    break;
                }
                
                // Wait a bit between commands for visualization
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Re-enable buttons
            [runBtn, resetBtn, clearBtn].forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
        });
        

        
        // Reset Button - Reset to initial state
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset Stage';
        resetBtn.style.padding = '10px 20px';
        resetBtn.style.backgroundColor = '#e53e3e';
        resetBtn.style.color = 'white';
        resetBtn.style.border = 'none';
        resetBtn.style.borderRadius = '6px';
        resetBtn.style.cursor = 'pointer';
        
        resetBtn.addEventListener('click', () => {
            state.stageState = cloneStage(stages[state.currentStageIndex]);
            state.programSequence = [];
            renderGrid();
            updateProgramDisplay();
        });
        
        // Clear Button - Clear program only
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear Program';
        clearBtn.style.padding = '10px 20px';
        clearBtn.style.backgroundColor = '#a0aec0';
        clearBtn.style.color = 'white';
        clearBtn.style.border = 'none';
        clearBtn.style.borderRadius = '6px';
        clearBtn.style.cursor = 'pointer';
        
        clearBtn.addEventListener('click', () => {
            state.programSequence = [];
            updateProgramDisplay();
        });
        
        controls.appendChild(runBtn);
        controls.appendChild(resetBtn);
        controls.appendChild(clearBtn);
        controlsContainer.appendChild(controls);
    }

// Render Stage View
function renderStageView() {
    gameContainer.innerHTML = '';
    state.currentView = 'stage';
    
    // Back button container
    const backContainer = document.createElement('div');
    backContainer.style.width = '100%';
    backContainer.style.display = 'flex';
    backContainer.style.justifyContent = 'space-between';
    backContainer.style.alignItems = 'center';
    backContainer.style.marginBottom = '20px';
    
    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = '← Back to Stage Select';
    backButton.style.padding = '8px 16px';
    backButton.style.border = 'none';
    backButton.style.borderRadius = '6px';
    backButton.style.background = '#4a5568';
    backButton.style.color = 'white';
    backButton.style.cursor = 'pointer';
    
    backButton.addEventListener('click', renderStageSelectView);
    backButton.addEventListener('mouseenter', () => {
        backButton.style.background = '#2d3748';
    });
    backButton.addEventListener('mouseleave', () => {
        backButton.style.background = '#4a5568';
    });
    
    // Stage title
    const stageTitle = document.createElement('h2');
    stageTitle.textContent = `${stages[state.currentStageIndex].name}`;
    stageTitle.style.margin = '0';
    
    backContainer.appendChild(backButton);
    backContainer.appendChild(stageTitle);
    gameContainer.appendChild(backContainer);
    
    // Game status
    const statusDiv = document.createElement('div');
    statusDiv.id = 'gameStatus';
    statusDiv.style.marginBottom = '20px';
    statusDiv.style.textAlign = 'center';
    statusDiv.style.padding = '10px';
    statusDiv.style.backgroundColor = '#f7fafc';
    statusDiv.style.borderRadius = '6px';
    statusDiv.style.border = '1px solid #e2e8f0';
    gameContainer.appendChild(statusDiv);
    
    // Update status function
    function updateStatus() {
        const stage = state.stageState;
        const coinsLeft = stage.coins.length;
        const totalCoins = stages[state.currentStageIndex].coins.length;
        
        statusDiv.innerHTML = `
            <div><strong>Coins Collected:</strong> ${totalCoins - coinsLeft}/${totalCoins}</div>
            <div><strong>Position:</strong> (${stage.character.x}, ${stage.character.y})</div>
            <div><strong>Direction:</strong> ${stage.character.direction}</div>
        `;
    }
    
    // Main game interface container - CHANGED THIS PART
    const gameInterface = document.createElement('div');
    gameInterface.style.display = 'flex';
    gameInterface.style.flexDirection = 'column';
    gameInterface.style.gap = '40px';
    gameInterface.style.width = '100%';
    gameInterface.style.maxWidth = '900px';
    
    // Grid section
    const leftPanel = document.createElement('div');
    leftPanel.style.display = 'flex';              // ← ADD
    leftPanel.style.flexDirection = 'column';      // ← ADD
    leftPanel.style.alignItems = 'center';         // ← ADD

    const gridTitle = document.createElement('h3');
    gridTitle.textContent = 'Game Grid:';
    gridTitle.style.marginBottom = '10px';
    gridTitle.style.textAlign = 'center';          // ← ADD
    leftPanel.appendChild(gridTitle);

    const gridContainer = document.createElement('div');
    gridContainer.id = 'gridContainer';
    gridContainer.style.display = 'flex';          // ← ADD
    gridContainer.style.justifyContent = 'center'; // ← ADD
    leftPanel.appendChild(gridContainer);
    
    // Programming interface section
    const rightPanel = document.createElement('div');
    rightPanel.style.display = 'flex';
    rightPanel.style.flexDirection = 'column';
    rightPanel.style.gap = '20px';
    
    // Code palette
    const paletteContainer = document.createElement('div');
    paletteContainer.id = 'paletteContainer';
    paletteContainer.style.border = '1px solid #e2e8f0';
    paletteContainer.style.borderRadius = '8px';
    paletteContainer.style.padding = '15px';
    paletteContainer.style.backgroundColor = '#f8fafc';
    rightPanel.appendChild(paletteContainer);
    
    // Program area
    const programContainer = document.createElement('div');
    programContainer.id = 'programContainer';
    programContainer.style.border = '1px solid #e2e8f0';
    programContainer.style.borderRadius = '8px';
    programContainer.style.padding = '15px';
    programContainer.style.backgroundColor = '#f8fafc';
    rightPanel.appendChild(programContainer);
    
    // Controls
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'controlsContainer';
    controlsContainer.style.border = '1px solid #e2e8f0';
    controlsContainer.style.borderRadius = '8px';
    controlsContainer.style.padding = '15px';
    controlsContainer.style.backgroundColor = '#f8fafc';
    rightPanel.appendChild(controlsContainer);
    
    // Game instructions
    const instructions = document.createElement('div');
    instructions.innerHTML = `
        <h4>How to Play:</h4>
        <ol style="margin: 10px 0; padding-left: 20px; font-size: 14px;">
            <li>Drag "Move" and "Turn" commands to the program area</li>
            <li>Arrange them in the order you want to execute</li>
            <li>Click "Run" to execute all commands automatically</li>
            <li>Collect all coins (🪙) and reach the castle (🏰) to win!</li>
            <li>Avoid obstacles (🌳) and don't go out of bounds</li>
        </ol>
    `;
    instructions.style.fontSize = '14px';
    instructions.style.color = '#4a5568';
    rightPanel.appendChild(instructions);
    
    gameInterface.appendChild(leftPanel);   // Grid goes first (top)
    gameInterface.appendChild(rightPanel);  // Programming goes second (below)
    gameContainer.appendChild(gameInterface);
    
    // Initial render of all components
    renderGrid();
    renderCodePalette();
    renderProgramArea();
    renderControls();
    updateStatus();
    
    // Update status whenever grid is rendered
    const originalRenderGrid = renderGrid;
    renderGrid = function() {
        originalRenderGrid();
        updateStatus();
    };
}

    // ------------------- INITIAL RENDER -------------------
    renderStageSelectView();
};

// ------------------- AUTO INIT -------------------
document.addEventListener('DOMContentLoaded', () => {
    if (window.initProgrammingGame) window.initProgrammingGame();
});