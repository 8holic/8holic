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

// DOM elements - assuming these exist in your HTML
const gameBoard = document.getElementById('game-board');
const colorPalette = document.getElementById('color-palette');
const feedbackArea = document.getElementById('feedback-area');
const messageArea = document.getElementById('message-area');
const resetButton = document.getElementById('reset-button');

// Initialize game
function initGame() {
    // Generate secret code
    secretCode = Array.from({ length: CODE_LENGTH }, () => 
        COLORS[Math.floor(Math.random() * COLORS.length)]
    );
    
    currentAttempt = 0;
    currentGuess = Array(CODE_LENGTH).fill('');
    gameEnded = false;
    
    // Clear and setup game board
    gameBoard.innerHTML = '';
    feedbackArea.innerHTML = '';
    messageArea.textContent = '';
    
    // Create attempt rows
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const row = document.createElement('div');
        row.className = 'attempt-row';
        row.dataset.attempt = i;
        
        // Create guess slots
        for (let j = 0; j < CODE_LENGTH; j++) {
            const slot = document.createElement('div');
            slot.className = 'guess-slot';
            slot.dataset.position = j;
            slot.dataset.attempt = i;
            slot.textContent = '';
            row.appendChild(slot);
        }
        
        // Create feedback area
        const feedback = document.createElement('div');
        feedback.className = 'feedback-area';
        feedback.dataset.attempt = i;
        feedbackArea.appendChild(feedback);
        
        gameBoard.appendChild(row);
    }
    
    // Setup color palette
    setupColorPalette();
    
    // Add reset button listener
    resetButton.addEventListener('click', resetGame);
    
    console.log('Secret code (for debugging):', secretCode);
    updateMessage(`Attempt ${currentAttempt + 1}/${MAX_ATTEMPTS}. Select colors!`);
}

// Setup color palette
function setupColorPalette() {
    colorPalette.innerHTML = '';
    
    COLORS.forEach(color => {
        const colorBtn = document.createElement('button');
        colorBtn.className = 'color-option';
        colorBtn.textContent = color;
        colorBtn.dataset.color = color;
        colorBtn.addEventListener('click', () => selectColor(color));
        colorPalette.appendChild(colorBtn);
    });
}

// Handle color selection
function selectColor(color) {
    if (gameEnded) return;
    
    // Find first empty slot in current row
    const currentRow = document.querySelector(`.attempt-row[data-attempt="${currentAttempt}"]`);
    const emptySlot = currentRow.querySelector('.guess-slot:empty');
    
    if (emptySlot) {
        emptySlot.textContent = color;
        currentGuess[parseInt(emptySlot.dataset.position)] = color;
        
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
        updateMessage(`🎉 You won in ${currentAttempt + 1} attempts!`);
        revealSecretCode();
        return;
    }
    
    // Move to next attempt
    currentAttempt++;
    currentGuess = Array(CODE_LENGTH).fill('');
    
    // Check lose condition
    if (currentAttempt >= MAX_ATTEMPTS) {
        gameEnded = true;
        updateMessage('💀 Game over! You ran out of attempts.');
        revealSecretCode();
        return;
    }
    
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
    messageArea.textContent = text;
}

// Reveal secret code
function revealSecretCode() {
    const revealDiv = document.createElement('div');
    revealDiv.className = 'secret-reveal';
    revealDiv.innerHTML = `Secret code was: ${secretCode.join(' ')}`;
    messageArea.after(revealDiv);
}

// Reset game
function resetGame() {
    initGame();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initGame);

// Optional: Add keyboard shortcuts for accessibility
document.addEventListener('keydown', (e) => {
    if (gameEnded) return;
    
    // Number keys 1-6 select colors
    if (e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key) - 1;
        if (index < COLORS.length) {
            selectColor(COLORS[index]);
        }
    }
    
    // Enter submits guess
    if (e.key === 'Enter' && !currentGuess.includes('')) {
        submitGuess();
    }
    
    // R resets game
    if (e.key === 'r' || e.key === 'R') {
        resetGame();
    }
});