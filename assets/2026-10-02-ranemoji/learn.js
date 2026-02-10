const emojiElement = document.getElementById('emoji');
const emojiBtn = document.getElementById('emojiBtn');
const colorBtn = document.getElementById('colorBtn');
const fontBtn = document.getElementById('fontBtn');

// Emoji array
const emojis = ['😀', '😂', '🥰', '😎', '🤔', '😴', '🤢', '👻', '🤖', '🐵'];

// Rainbow colors
const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8b00ff'];
let colorIndex = 0;

// Font size
let fontSize = 12;
const fontSizeStep = 4;
const maxFontSize = 36;

// Button 1: Random emoji
emojiBtn.addEventListener('click', function() {
    const randomIndex = Math.floor(Math.random() * emojis.length);
    emojiElement.textContent = emojis[randomIndex];
});

// Button 2: Change background color
colorBtn.addEventListener('click', function() {
    document.body.style.backgroundColor = colors[colorIndex];
    colorIndex = (colorIndex + 1) % colors.length;
});

// Button 3: Increase font size
fontBtn.addEventListener('click', function() {
    if (fontSize < maxFontSize) {
        fontSize += fontSizeStep;
        if (fontSize > maxFontSize) {
            fontSize = maxFontSize;
        }
    } else {
        fontSize = 12;
    }
    emojiElement.style.fontSize = fontSize + 'px';
});