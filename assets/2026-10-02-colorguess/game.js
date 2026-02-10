// Game constants
const COLORS = ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠']; // 6 possible colors
const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 10;
const FEEDBACK = {
    CORRECT: '⚫', // Correct color and position
    PARTIAL: '⚪'  // Correct color, wrong position
};

// Game state
let secretCode = [];
let currentAttempt = 0;
let currentGuess = Array(CODE_LENGTH).fill('');
let gameEnded = false;
let startTime = null;
let timerInterval = null;

// Initialize game - this runs when page loads
function initGame() {
    // Generate secret code
    secretCode = Array.from({ length: CODE_LENGTH }, () => 
        COLORS[Math.floor(Math.random() * COLORS.length)]
    );
    
    currentAttempt = 0;
    currentGuess = Array(CODE_LENGTH).fill('');
    gameEnded = false;
    startTime = Date.now();
    
    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Create game container if it doesn't exist
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    
    // Clear container
    gameContainer.innerHTML = '';
    
    // Create message area
    const messageArea = document.createElement('div');
    messageArea.id = 'message-area';
    messageArea.textContent = `Attempt ${currentAttempt + 1}/${MAX_ATTEMPTS}. Select colors!`;
    gameContainer.appendChild(messageArea);
    
    // Create game stats
    const statsDiv = document.createElement('div');
    statsDiv.className = 'game-stats';
    statsDiv.innerHTML = `
        <div class="stat">
            <div class="stat-value" id="attempt-counter">0</div>
            <div class="stat-label">Attempts</div>
        </div>
        <div class="stat">
            <div class="stat-value" id="time-counter">0s</div>
            <div class="stat-label">Time</div>
        </div>
        <div class="stat">
            <div class="stat-value">${MAX_ATTEMPTS}</div>
            <div class="stat-label">Max Attempts</div>
        </div>
    `;
    gameContainer.appendChild(statsDiv);
    
    // Create game board
    const gameBoard = document.createElement('div');
    gameBoard.id = 'game-board';
    gameContainer.appendChild(gameBoard);
    
    // Create feedback area
    const feedbackArea = document.createElement('div');
    feedbackArea.id = 'feedback-area';
    gameContainer.appendChild(feedbackArea);
    
    // Create color palette
    const colorPalette = document.createElement('div');
    colorPalette.id = 'color-palette';
    gameContainer.appendChild(colorPalette);
    
    // Create reset button
    const resetButton = document.createElement('button');
    resetButton.id = 'reset-button';
    resetButton.innerHTML = '<i class="fas fa-redo"></i> New Game';
    resetButton.addEventListener('click', initGame);
    gameContainer.appendChild(resetButton);
    
    // Setup game elements
    setupGameBoard(gameBoard, feedbackArea);
    setupColorPalette(colorPalette);
    startTimer();
    
    console.log('Secret code (for debugging):', secretCode);
}

// Setup game board with attempt rows
function setupGameBoard(gameBoard, feedbackArea) {
    gameBoard.innerHTML = '';
    feedbackArea.innerHTML = '';
    
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const row = document.createElement('div');
        row.className = 'attempt-row';
        if (i === 0) row.classList.add('current-attempt');
        row.dataset.attempt = i;
        
        // Create guess slots
        for (let j = 0; j < CODE_LENGTH; j++) {
            const slot = document.createElement('div');
            slot.className = 'guess-slot empty';
            slot.dataset.position = j;
            slot.dataset.attempt = i;
            slot.textContent = '';
            slot.addEventListener('click', () => handleSlotClick(j));
            row.appendChild(slot);
        }
        
        // Create feedback area for this row
        const feedback = document.createElement('div');
        feedback.className = 'feedback-area';
        feedback.dataset.attempt = i;
        feedbackArea.appendChild(feedback);
        
        gameBoard.appendChild(row);
    }
}

// Setup color palette
function setupColorPalette(colorPalette) {
    colorPalette.innerHTML = '';
    
    COLORS.forEach((color, index) => {
        const colorBtn = document.createElement('button');
        colorBtn.className = 'color-option';
        colorBtn.textContent = color;
        colorBtn.dataset.color = color;
        colorBtn.title = `Color ${index + 1} (Press ${index + 1})`;
        colorBtn.addEventListener('click', (e) => selectColor(color, e));
        colorPalette.appendChild(colorBtn);
    });
}

// Handle slot click
function handleSlotClick(position) {
    if (gameEnded) return;
    
    const selectedColor = document.querySelector('.color-option.selected');
    if (selectedColor) {
        const color = selectedColor.dataset.color;
        placeColor(position, color);
    }
}

// Select a color
function selectColor(color, event) {
    if (gameEnded) return;
    
    // Remove selection from all color buttons
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selection to clicked button
    event.target.classList.add('selected');
}

// Place color in slot
function placeColor(position, color) {
    const currentRow = document.querySelector(`.attempt-row[data-attempt="${currentAttempt}"]`);
    const slot = currentRow.querySelector(`.guess-slot[data-position="${position}"]`);
    
    if (slot && slot.classList.contains('empty')) {
        slot.textContent = color;
        slot.classList.remove('empty');
        currentGuess[position] = color;
        
        // Auto-submit if row is complete
        if (!currentGuess.includes('')) {
            setTimeout(submitGuess, 300);
        }
    }
}

// Submit current guess
function submitGuess() {
    if (gameEnded || currentGuess.includes('')) return;
    
    const feedback = calculateFeedback(currentGuess);
    displayFeedback(feedback);
    
    // Check win condition
    if (feedback.filter(f => f === FEEDBACK.CORRECT).length === CODE_LENGTH) {
        gameEnded = true;
        clearInterval(timerInterval);
        updateMessage(`🎉 You won in ${currentAttempt + 1} attempts!`);
        revealSecretCode();
        return;
    }
    
    // Move to next attempt
    currentAttempt++;
    currentGuess = Array(CODE_LENGTH).fill('');
    
    // Update current attempt highlighting
    document.querySelectorAll('.attempt-row').forEach(row => {
        row.classList.remove('current-attempt');
    });
    const nextRow = document.querySelector(`.attempt-row[data-attempt="${currentAttempt}"]`);
    if (nextRow) nextRow.classList.add('current-attempt');
    
    // Check lose condition
    if (currentAttempt >= MAX_ATTEMPTS) {
        gameEnded = true;
        clearInterval(timerInterval);
        updateMessage('💀 Game over! You ran out of attempts.');
        revealSecretCode();
        return;
    }
    
    updateStats();
    updateMessage(`Attempt ${currentAttempt + 1}/${MAX_ATTEMPTS}. Select colors!`);
}

// Calculate feedback for guess
function calculateFeedback(guess) {
    const feedback = [];
    const secretCopy = [...secretCode];
    const guessCopy = [...guess];
    
    // First pass: find exact matches
    for (let i = 0; i < CODE_LENGTH; i++) {
        if (guessCopy[i] === secretCopy[i]) {
            feedback.push(FEEDBACK.CORRECT);
            secretCopy[i] = null;
            guessCopy[i] = null;
        }
    }
    
    // Second pass: find color matches (wrong position)
    for (let i = 0; i < CODE_LENGTH; i++) {
        if (guessCopy[i]) {
            const foundIndex = secretCopy.indexOf(guessCopy[i]);
            if (foundIndex !== -1) {
                feedback.push(FEEDBACK.PARTIAL);
                secretCopy[foundIndex] = null;
            }
        }
    }
    
    // Sort feedback: correct first, then partial
    return feedback.sort((a, b) => {
        if (a === FEEDBACK.CORRECT && b === FEEDBACK.PARTIAL) return -1;
        if (a === FEEDBACK.PARTIAL && b === FEEDBACK.CORRECT) return 1;
        return 0;
    });
}

// Display feedback
function displayFeedback(feedback) {
    const feedbackSlot = document.querySelector(`.feedback-area[data-attempt="${currentAttempt}"]`);
    feedbackSlot.innerHTML = '';
    
    feedback.forEach(fb => {
        const fbElement = document.createElement('span');
        fbElement.className = 'feedback-peg';
        fbElement.textContent = fb;
        feedbackSlot.appendChild(fbElement);
    });
}

// Update message display
function updateMessage(text) {
    const messageArea = document.getElementById('message-area');
    if (messageArea) {
        messageArea.textContent = text;
    }
}

// Update stats
function updateStats() {
    const attemptCounter = document.getElementById('attempt-counter');
    if (attemptCounter) {
        attemptCounter.textContent = currentAttempt;
    }
}

// Start timer
function startTimer() {
    timerInterval = setInterval(() => {
        const timeCounter = document.getElementById('time-counter');
        if (timeCounter && startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            timeCounter.textContent = `${elapsed}s`;
        }
    }, 1000);
}

// Reveal secret code
function revealSecretCode() {
    const revealDiv = document.createElement('div');
    revealDiv.className = 'secret-reveal';
    revealDiv.innerHTML = `Secret code was: ${secretCode.join(' ')}`;
    
    const messageArea = document.getElementById('message-area');
    if (messageArea && messageArea.parentNode) {
        messageArea.parentNode.insertBefore(revealDiv, messageArea.nextSibling);
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (gameEnded) return;
    
    // Number keys 1-6 select colors
    if (e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key) - 1;
        if (index < COLORS.length) {
            // Remove previous selection
            document.querySelectorAll('.color-option').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Select new color
            const colorBtn = document.querySelectorAll('.color-option')[index];
            if (colorBtn) {
                colorBtn.classList.add('selected');
                // Find first empty slot
                const currentRow = document.querySelector(`.attempt-row[data-attempt="${currentAttempt}"]`);
                const emptySlot = currentRow.querySelector('.guess-slot.empty');
                if (emptySlot) {
                    const position = parseInt(emptySlot.dataset.position);
                    placeColor(position, COLORS[index]);
                }
            }
        }
    }
    
    // Enter submits guess
    if (e.key === 'Enter' && !currentGuess.includes('')) {
        submitGuess();
    }
    
    // R resets game
    if (e.key === 'r' || e.key === 'R') {
        initGame();
    }
    
    // Escape clears selection
    if (e.key === 'Escape') {
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.classList.remove('selected');
        });
    }
});

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);