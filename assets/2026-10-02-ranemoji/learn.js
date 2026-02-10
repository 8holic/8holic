// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const emojiDisplay = document.getElementById('emojiDisplay');
    const emojiBtn = document.getElementById('emojiBtn');
    const colorBtn = document.getElementById('colorBtn');
    const fontBtn = document.getElementById('fontBtn');
    const colorIndicator = document.getElementById('colorIndicator');
    const sizeValue = document.getElementById('sizeValue');
    const body = document.body;
    
    // Emoji array
    const emojis = [
        '😀', '😂', '🥰', '😎', '🤩', '😜', '🤔', '🙃', '😴', '🥳',
        '😇', '🤠', '😷', '🤓', '🥺', '😈', '👻', '🤖', '👾', '🐵',
        '🦁', '🐶', '🐱', '🦊', '🐼', '🐨', '🐯', '🦄', '🐙', '🦋',
        '🌈', '⭐', '🔥', '💧', '🌍', '🎈', '🎉', '🎁', '⚽', '🎮',
        '🍕', '🍦', '🍩', '🎂', '☕', '🧁', '🚗', '✈️', '🚀', '🎸'
    ];
    
    // Rainbow colors
    const rainbowColors = [
        { name: "Red", class: "bg-red" },
        { name: "Orange", class: "bg-orange" },
        { name: "Yellow", class: "bg-yellow" },
        { name: "Green", class: "bg-green" },
        { name: "Blue", class: "bg-blue" },
        { name: "Indigo", class: "bg-indigo" },
        { name: "Violet", class: "bg-violet" }
    ];
    
    // Variables to track state
    let currentColorIndex = 0;
    let currentFontSize = 60; // Starting font size for emoji
    let fontSizeStep = 4;
    let minFontSize = 12;
    let maxFontSize = 36;
    
    // Initialize size display
    sizeValue.textContent = currentFontSize;
    
    // Function to get a random emoji
    function getRandomEmoji() {
        const randomIndex = Math.floor(Math.random() * emojis.length);
        return emojis[randomIndex];
    }
    
    // Function to change background color
    function changeBackgroundColor() {
        // Remove all rainbow color classes
        rainbowColors.forEach(color => {
            body.classList.remove(color.class);
        });
        
        // Add current color class
        body.classList.add(rainbowColors[currentColorIndex].class);
        
        // Update color indicator
        colorIndicator.textContent = rainbowColors[currentColorIndex].name;
        
        // Increment color index for next click
        currentColorIndex = (currentColorIndex + 1) % rainbowColors.length;
    }
    
    // Function to increase font size
    function increaseFontSize() {
        if (currentFontSize < maxFontSize) {
            // Increase font size by step
            currentFontSize += fontSizeStep;
            
            // If we exceed max, set to max
            if (currentFontSize > maxFontSize) {
                currentFontSize = maxFontSize;
            }
        } else {
            // Reset to min size
            currentFontSize = minFontSize;
        }
        
        // Apply the new font size
        emojiDisplay.style.fontSize = `${currentFontSize}px`;
        
        // Update the size display
        sizeValue.textContent = currentFontSize;
    }
    
    // Button event listeners
    emojiBtn.addEventListener('click', function() {
        emojiDisplay.textContent = getRandomEmoji();
        
        // Add animation effect
        emojiDisplay.style.transform = 'scale(1.3)';
        setTimeout(() => {
            emojiDisplay.style.transform = 'scale(1)';
        }, 300);
    });
    
    colorBtn.addEventListener('click', function() {
        changeBackgroundColor();
        
        // Add button animation
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
    });
    
    fontBtn.addEventListener('click', function() {
        increaseFontSize();
        
        // Add button animation
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
    });
    
    // Add keyboard shortcuts for fun
    document.addEventListener('keydown', function(event) {
        switch(event.key) {
            case '1':
            case 'e':
                emojiBtn.click();
                break;
            case '2':
            case 'c':
                colorBtn.click();
                break;
            case '3':
            case 'f':
                fontBtn.click();
                break;
        }
    });
    
    // Initial setup message in console
    console.log("Demo loaded! Try these keyboard shortcuts:");
    console.log("1 or E: Random Emoji");
    console.log("2 or C: Change Background Color");
    console.log("3 or F: Increase Font Size");
});