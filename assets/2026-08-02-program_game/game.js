// ------------------- INIT FUNCTION -------------------
window.initProgrammingGame = function() {
    // ------------------- COMMAND REGISTRY -------------------
    const COMMANDS = {
        move: {
            name: 'Move',
            color: '#4299e1', // blue for basic
            execute: (stage) => {
                const char = stage.character;
                const next = getNextPosition(char);

                if (!canMoveTo(next.x, next.y, stage)) return false;

                char.x = next.x;
                char.y = next.y;

                // Collect coin if present
                collectCoinIfPresent(char.x, char.y, stage);
                // Check for monster after moving
                if (isMonster(char.x, char.y, stage)) {
                    stage.incapacitated = true;   // set flag, no popup
                    return false;                 
                }
                return true;
            }
        },
        turn: {
            name: 'Turn ⟳',
            color: '#ed8936', // orange for basic
            execute: (stage) => {
                const char = stage.character;
                switch (char.direction) {
                    case 'up':    char.direction = 'right'; break;
                    case 'right': char.direction = 'down'; break;
                    case 'down':  char.direction = 'left'; break;
                    case 'left':  char.direction = 'up'; break;
                }
                return true;
            }
        },
        open: {
            name: 'Open',
            color: '#48bb78', // green
            execute: (stage) => {
                const char = stage.character;
                const next = getNextPosition(char);
                if (!isWithinBounds(next.x, next.y, stage)) return false;

                const doorIndex = stage.doors.findIndex(d => d.x === next.x && d.y === next.y);
                if (doorIndex !== -1) {
                    stage.doors.splice(doorIndex, 1);
                    return true;
                }
                return false; // nothing to open
            }
        },
        attack: {
            name: 'Attack',
            color: '#f56565', // red
            execute: (stage) => {
                const char = stage.character;
                const next = getNextPosition(char);
                if (!isWithinBounds(next.x, next.y, stage)) return false;

                const monsterIndex = stage.monsters.findIndex(m => m.x === next.x && m.y === next.y);
                if (monsterIndex !== -1) {
                    stage.monsters.splice(monsterIndex, 1);
                    return true;
                }
                return false; // nothing to attack
            }
        }
    };

    // ------------------- Add Stage -------------------
    const stages = [
        {
            name: "The Basics",
            gridSize: 4,
            character: { x: 0, y: 2, direction: 'right' },
            obstacles: [ { x: 2, y: 2 } ],
            doors: [ { x: 1, y: 1 } ],        // new
            monsters: [ { x: 2, y: 3 } ],      // new
            coins: [ { x: 1, y: 0 }, { x: 3, y: 0 } ],
            endPoint: { x: 3, y: 3 }
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
        const cloned = JSON.parse(JSON.stringify(stage));
        cloned.incapacitated = false;   // add flag
        return cloned;
    }

    // ------------------- GAME LOGIC FUNCTIONS -------------------

    // Determine next tile based on direction
    function getNextPosition(character) {
        let { x, y, direction } = character;

        switch (direction) {
            case 'up':    y--; break;
            case 'down':  y++; break;
            case 'left':  x--; break;
            case 'right': x++; break;
        }

        return { x, y };
    }


    // Check if a tile is inside grid bounds
    function isWithinBounds(x, y, stage) {
        return (
            x >= 0 &&
            y >= 0 &&
            x < stage.gridSize &&
            y < stage.gridSize
        );
    }


    // Check if a tile contains an obstacle
    function isObstacle(x, y, stage) {
        return stage.obstacles.some(obs => obs.x === x && obs.y === y);
    }
    function isDoor(x, y, stage) {
        return stage.doors && stage.doors.some(d => d.x === x && d.y === y);
    }

    function isMonster(x, y, stage) {
        return stage.monsters && stage.monsters.some(m => m.x === x && m.y === y);
    }

    function monsterInFront(stage) {
        const next = getNextPosition(stage.character);
        return isMonster(next.x, next.y, stage);
    }

    function doorInFront(stage) {
        const next = getNextPosition(stage.character);
        return isDoor(next.x, next.y, stage);
    }

    function coinInFront(stage) {
        const next = getNextPosition(stage.character);
        return stage.coins.some(c => c.x === next.x && c.y === next.y);
    }

    function canMoveForward(stage) {
        const next = getNextPosition(stage.character);
        return canMoveTo(next.x, next.y, stage);
    }
    const CONDITION_CHECKS = {
        monsterInFront,
        doorInFront,
        coinInFront,
        canMoveForward
    };

    // Central validation function (used before ANY movement)
    function canMoveTo(x, y, stage) {
        if (!isWithinBounds(x, y, stage)) return false;
        if (isObstacle(x, y, stage)) return false;
        if (isDoor(x, y, stage)) return false; // doors block until opened
        // monsters do NOT block movement
        return true;
    }

    // Handle coin collection
    function collectCoinIfPresent(x, y, stage) {
        const coinIndex = stage.coins.findIndex(
            coin => coin.x === x && coin.y === y
        );

        if (coinIndex !== -1) {
            stage.coins.splice(coinIndex, 1);
        }
    }

    function executeCommand(command) {
        if (!state.stageState) return false;

        const stage = state.stageState;

        // If the command is a string, look it up in registry
        if (typeof command === 'string') {
            if (COMMANDS[command]) {
                return COMMANDS[command].execute(stage);
            } else {
                console.warn(`Unknown command: ${command}`);
                return false;
            }
        }

        // Ignore any non-string commands (no repeat blocks anymore)
        return false;
    }



    // Check win condition
    function checkWinCondition() {
        if (!state.stageState) return false;

        const stage = state.stageState;
        const char = stage.character;

        const allCoinsCollected = stage.coins.length === 0;
        const atEndpoint =
            char.x === stage.endPoint.x &&
            char.y === stage.endPoint.y;

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
            if (stage.doors && stage.doors.some(d => d.x === x && d.y === y)) return '🚪';

            if (stage.monsters && stage.monsters.some(m => m.x === x && m.y === y)) return '👾';
            
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
        
    function renderProgramArea() {
        const programContainer = document.getElementById('programContainer');
        if (!programContainer) return;

        programContainer.innerHTML = '';

        const title = document.createElement('h3');
        title.textContent = 'Your Program:';
        title.style.marginBottom = '10px';
        programContainer.appendChild(title);

        // ---- BUTTON BAR for adding commands ----
        const buttonBar = document.createElement('div');
        buttonBar.style.display = 'flex';
        buttonBar.style.gap = '8px';
        buttonBar.style.marginBottom = '15px';

        // Move button
        const moveBtn = document.createElement('button');
        moveBtn.className = 'command-btn';
        moveBtn.textContent = 'Move';
        moveBtn.style.padding = '6px 12px';
        moveBtn.style.backgroundColor = '#4299e1';
        moveBtn.style.color = 'white';
        moveBtn.style.border = 'none';
        moveBtn.style.borderRadius = '4px';
        moveBtn.style.cursor = 'pointer';
        moveBtn.addEventListener('click', () => {
            state.programSequence.push('move');
            renderProgramArea();    // refresh the display
        });
        buttonBar.appendChild(moveBtn);

        // Turn button
        const turnBtn = document.createElement('button');
        turnBtn.className = 'command-btn';
        turnBtn.textContent = 'Turn ⟳';
        turnBtn.style.padding = '6px 12px';
        turnBtn.style.backgroundColor = '#ed8936';
        turnBtn.style.color = 'white';
        turnBtn.style.border = 'none';
        turnBtn.style.borderRadius = '4px';
        turnBtn.style.cursor = 'pointer';
        turnBtn.addEventListener('click', () => {
            state.programSequence.push('turn');
            renderProgramArea();
        });
        buttonBar.appendChild(turnBtn);
        //Open
        const openBtn = document.createElement('button');
        openBtn.className = 'command-btn';
        openBtn.textContent = 'Open';
        openBtn.style.padding = '6px 12px';
        openBtn.style.backgroundColor = '#48bb78';
        openBtn.style.color = 'white';
        openBtn.style.border = 'none';
        openBtn.style.borderRadius = '4px';
        openBtn.style.cursor = 'pointer';
        openBtn.addEventListener('click', () => {
            state.programSequence.push('open');
            renderProgramArea();
        });
        buttonBar.appendChild(openBtn);
        //Attack
        const attackBtn = document.createElement('button');
        attackBtn.className = 'command-btn';
        attackBtn.textContent = 'Attack';
        attackBtn.style.padding = '6px 12px';
        attackBtn.style.backgroundColor = '#f56565';
        attackBtn.style.color = 'white';
        attackBtn.style.border = 'none';
        attackBtn.style.borderRadius = '4px';
        attackBtn.style.cursor = 'pointer';
        attackBtn.addEventListener('click', () => {
            state.programSequence.push('attack');
            renderProgramArea();
        });
        
        buttonBar.appendChild(attackBtn);

        // IF button
        const ifBtn = document.createElement('button');
        ifBtn.className = 'command-btn';
        ifBtn.textContent = 'IF';
        ifBtn.style.padding = '6px 12px';
        ifBtn.style.backgroundColor = '#9f7aea';
        ifBtn.style.color = 'white';
        ifBtn.style.border = 'none';
        ifBtn.style.borderRadius = '4px';
        ifBtn.style.cursor = 'pointer';
        ifBtn.addEventListener('click', () => {
            state.programSequence.push({
                type: 'if',
                condition: 'monsterInFront',
                action: 'move'
            });
            renderProgramArea();
        });
        buttonBar.appendChild(ifBtn);

        // ELSE IF button
        const elseifBtn = document.createElement('button');
        elseifBtn.className = 'command-btn';
        elseifBtn.textContent = 'ELSE IF';
        elseifBtn.style.padding = '6px 12px';
        elseifBtn.style.backgroundColor = '#b794f4';
        elseifBtn.style.color = 'white';
        elseifBtn.style.border = 'none';
        elseifBtn.style.borderRadius = '4px';
        elseifBtn.style.cursor = 'pointer';
        elseifBtn.addEventListener('click', () => {
            state.programSequence.push({
                type: 'elseif',
                condition: 'monsterInFront',
                action: 'move'
            });
            renderProgramArea();
        });
        buttonBar.appendChild(elseifBtn);

        // ELSE button
        const elseBtn = document.createElement('button');
        elseBtn.className = 'command-btn';
        elseBtn.textContent = 'ELSE';
        elseBtn.style.padding = '6px 12px';
        elseBtn.style.backgroundColor = '#d6bcfa';
        elseBtn.style.color = 'white';
        elseBtn.style.border = 'none';
        elseBtn.style.borderRadius = '4px';
        elseBtn.style.cursor = 'pointer';
        elseBtn.addEventListener('click', () => {
            state.programSequence.push({
                type: 'else',
                action: 'move'
            });
            renderProgramArea();
        });
        buttonBar.appendChild(elseBtn);
        //Emd
        programContainer.appendChild(buttonBar);

        // ---- PROGRAM LIST ----
        const programList = document.createElement('div');
        programContainer.appendChild(programList);

        function renderCommands(commands, container, depth = 0) {
            container.innerHTML = '';

            if (commands.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.textContent = 'No commands yet...';
                placeholder.style.color = '#999';
                placeholder.style.padding = '10px';
                container.appendChild(placeholder);
                return;
            }

            commands.forEach((cmd, index) => {
                const row = document.createElement('div');
                row.style.marginLeft = depth * 20 + 'px';
                row.style.marginBottom = '6px';
                row.style.padding = '6px';
                row.style.borderRadius = '4px';
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '8px';
                row.style.flexWrap = 'wrap';

                // Handle primitive commands (strings)
                if (typeof cmd === 'string') {
                    row.textContent = COMMANDS[cmd]?.name || cmd;
                    row.style.backgroundColor = COMMANDS[cmd]?.color || '#718096';
                    row.style.color = 'white';
                    row.style.flex = '1';
                }
                // Handle conditional objects
                else if (typeof cmd === 'object' && cmd !== null) {
                    row.style.backgroundColor = '#e9d8fd'; // light purple

                    // Type label
                    const typeSpan = document.createElement('span');
                    typeSpan.textContent = cmd.type.toUpperCase();
                    typeSpan.style.fontWeight = 'bold';
                    typeSpan.style.minWidth = '60px';
                    row.appendChild(typeSpan);

                    // Condition dropdown (for if and elseif)
                    if (cmd.type === 'if' || cmd.type === 'elseif') {
                        const condSelect = document.createElement('select');
                        condSelect.style.margin = '0 8px';
                        condSelect.style.padding = '4px';
                        const conditions = ['monsterInFront', 'doorInFront', 'coinInFront', 'canMoveForward'];
                        conditions.forEach(cond => {
                            const opt = document.createElement('option');
                            opt.value = cond;
                            opt.textContent = cond.replace(/([A-Z])/g, ' $1').toLowerCase(); // prettify
                            if (cmd.condition === cond) opt.selected = true;
                            condSelect.appendChild(opt);
                        });
                        condSelect.addEventListener('change', (e) => {
                            cmd.condition = e.target.value;
                        });
                        row.appendChild(condSelect);
                    }

                    // Action dropdown (for all conditionals)
                    const actionSelect = document.createElement('select');
                    actionSelect.style.padding = '4px';
                    const actions = ['move', 'turn', 'open', 'attack'];
                    actions.forEach(action => {
                        const opt = document.createElement('option');
                        opt.value = action;
                        opt.textContent = COMMANDS[action]?.name || action;
                        if (cmd.action === action) opt.selected = true;
                        actionSelect.appendChild(opt);
                    });
                    actionSelect.addEventListener('change', (e) => {
                        cmd.action = e.target.value;
                    });
                    row.appendChild(actionSelect);
                }

                // Remove button (works for both strings and objects)
                const removeBtn = document.createElement('span');
                removeBtn.textContent = '×';
                removeBtn.style.marginLeft = 'auto';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.padding = '2px 6px';
                removeBtn.style.backgroundColor = 'rgba(0,0,0,0.2)';
                removeBtn.style.borderRadius = '50%';
                removeBtn.addEventListener('click', () => {
                    commands.splice(index, 1);
                    renderProgramArea(); // re-render the whole program area
                });

                row.appendChild(removeBtn);
                container.appendChild(row);
            });
        }

        renderCommands(state.programSequence, programList);
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
        runBtn.id = 'runBtn';
        runBtn.textContent = 'Run Program';
        runBtn.style.padding = '10px 20px';
        runBtn.style.backgroundColor = '#38a169';
        runBtn.style.color = 'white';
        runBtn.style.border = 'none';
        runBtn.style.borderRadius = '6px';
        runBtn.style.cursor = 'pointer';
        
    runBtn.addEventListener('click', async () => {
        // Disable all interactive buttons during execution
        [runBtn, resetBtn, clearBtn].forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });
        document.querySelectorAll('.command-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });
        //Internal code running
        let i = 0;
        let inChain = false;
        let skipChain = false;

        while (i < state.programSequence.length) {
            const item = state.programSequence[i];

            if (typeof item === 'string' && COMMANDS[item]) {
                // primitive command
                executeCommand(item);
                renderGrid();
                await new Promise(resolve => setTimeout(resolve, 500));
                inChain = false; // end of any conditional chain
                skipChain = false;
                if (state.stageState.incapacitated || checkWinCondition()) break;
                i++;
            } else if (typeof item === 'object' && item !== null) {
                // conditional
                if (item.type === 'if') {
                    inChain = true;
                    if (CONDITION_CHECKS[item.condition](state.stageState)) {
                        executeCommand(item.action);
                        renderGrid();
                        await new Promise(resolve => setTimeout(resolve, 500));
                        skipChain = true;
                        if (state.stageState.incapacitated || checkWinCondition()) break;
                    } else {
                        skipChain = false;
                    }
                    i++;
                } else if (item.type === 'elseif') {
                    if (!inChain) { i++; continue; } // orphaned elseif, skip
                    if (!skipChain && CONDITION_CHECKS[item.condition](state.stageState)) {
                        executeCommand(item.action);
                        renderGrid();
                        await new Promise(resolve => setTimeout(resolve, 500));
                        skipChain = true;
                        if (state.stageState.incapacitated || checkWinCondition()) break;
                    }
                    i++;
                } else if (item.type === 'else') {
                    if (!inChain) { i++; continue; }
                    if (!skipChain) {
                        executeCommand(item.action);
                        renderGrid();
                        await new Promise(resolve => setTimeout(resolve, 500));
                        skipChain = true;
                        if (state.stageState.incapacitated || checkWinCondition()) break;
                    }
                    i++;
                } else {
                    // unknown object, skip
                    i++;
                }
            } else {
                // any other non-string, non-object? (shouldn't happen)
                i++;
            }
        }

        // After loop: if incapacitated, only reset button should be re‑enabled
        if (state.stageState.incapacitated) {
            resetBtn.disabled = false;
            resetBtn.style.opacity = '1';
            // run, clear, command buttons stay disabled
        } else {
            // Normal completion: re-enable everything
            [runBtn, resetBtn, clearBtn].forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
            document.querySelectorAll('.command-btn').forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
        }
    });
        

        
        // Reset Button - Reset to initial state
        const resetBtn = document.createElement('button');
        resetBtn.id = 'resetBtn';
        resetBtn.textContent = 'Reset Stage';
        resetBtn.style.padding = '10px 20px';
        resetBtn.style.backgroundColor = '#e53e3e';
        resetBtn.style.color = 'white';
        resetBtn.style.border = 'none';
        resetBtn.style.borderRadius = '6px';
        resetBtn.style.cursor = 'pointer';
        
        resetBtn.addEventListener('click', () => {
            state.stageState = cloneStage(stages[state.currentStageIndex]);

            renderStageView();
        });
        
        // Clear Button - Clear program only
        const clearBtn = document.createElement('button');
        clearBtn.id = 'clearBtn';
        clearBtn.textContent = 'Clear Program';
        clearBtn.style.padding = '10px 20px';
        clearBtn.style.backgroundColor = '#a0aec0';
        clearBtn.style.color = 'white';
        clearBtn.style.border = 'none';
        clearBtn.style.borderRadius = '6px';
        clearBtn.style.cursor = 'pointer';
        
        clearBtn.addEventListener('click', () => {
            state.programSequence = [];
            renderProgramArea();
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
        
        let incapacitatedHtml = '';
        if (stage.incapacitated) {
            incapacitatedHtml = '<div style="color: red; font-weight: bold;">💀 Incapacitated</div>';
        }
        
        statusDiv.innerHTML = `
            ${incapacitatedHtml}
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
    

    gameInterface.appendChild(leftPanel);   // Grid goes first (top)
    gameInterface.appendChild(rightPanel);  // Programming goes second (below)
    gameContainer.appendChild(gameInterface);
    
    // Initial render of all components
    renderGrid();
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