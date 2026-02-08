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
        currentView: 'stageSelect', // 'stageSelect' or 'stage'
        currentStageIndex: null
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

    // ------------------- VIEW RENDER FUNCTIONS -------------------

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

    // Render Stage View
    function renderStageView() {
        gameContainer.innerHTML = '';
        state.currentView = 'stage';
        
        const stage = stages[state.currentStageIndex];
        
        // Back button
        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Stage Select';
        backButton.style.padding = '8px 16px';
        backButton.style.border = 'none';
        backButton.style.borderRadius = '6px';
        backButton.style.background = '#4a5568';
        backButton.style.color = 'white';
        backButton.style.cursor = 'pointer';
        backButton.style.marginBottom = '20px';
        backButton.style.alignSelf = 'flex-start';
        
        backButton.addEventListener('click', renderStageSelectView);
        backButton.addEventListener('mouseenter', () => {
            backButton.style.background = '#2d3748';
        });
        backButton.addEventListener('mouseleave', () => {
            backButton.style.background = '#4a5568';
        });
        
        gameContainer.appendChild(backButton);
        
        // Stage title
        const stageTitle = document.createElement('h2');
        stageTitle.textContent = stage.name;
        stageTitle.style.marginBottom = '20px';
        gameContainer.appendChild(stageTitle);
        
        // Grid placeholder (for now)
        const gridPlaceholder = document.createElement('div');
        gridPlaceholder.textContent = `Stage ${state.currentStageIndex + 1} - Grid will be implemented in next step`;
        gridPlaceholder.style.padding = '40px';
        gridPlaceholder.style.border = '2px dashed #ccc';
        gridPlaceholder.style.borderRadius = '8px';
        gridPlaceholder.style.background = '#f7fafc';
        gridPlaceholder.style.textAlign = 'center';
        gridPlaceholder.style.width = '300px';
        gridPlaceholder.style.marginBottom = '20px';
        gameContainer.appendChild(gridPlaceholder);
        
        // Stage info
        const stageInfo = document.createElement('div');
        stageInfo.style.textAlign = 'center';
        stageInfo.style.marginTop = '10px';
        stageInfo.style.color = '#4a5568';
        
        const infoText = document.createElement('p');
        infoText.textContent = `Grid: ${stage.gridSize}×${stage.gridSize} | Coins: ${stage.coins.length} | Obstacles: ${stage.obstacles.length}`;
        stageInfo.appendChild(infoText);
        
        const startInfo = document.createElement('p');
        startInfo.textContent = `Start: (${stage.character.x}, ${stage.character.y}) facing ${stage.character.direction}`;
        startInfo.style.fontSize = '14px';
        stageInfo.appendChild(startInfo);
        
        const endInfo = document.createElement('p');
        endInfo.textContent = `Goal: Reach (${stage.endPoint.x}, ${stage.endPoint.y})`;
        endInfo.style.fontSize = '14px';
        stageInfo.appendChild(endInfo);
        
        gameContainer.appendChild(stageInfo);
    }

    // ------------------- INITIAL RENDER -------------------
    renderStageSelectView();
};

// ------------------- AUTO INIT -------------------
document.addEventListener('DOMContentLoaded', () => {
    if (window.initProgrammingGame) window.initProgrammingGame();
});