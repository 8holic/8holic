// JavaScript controls the behavior
document.addEventListener('DOMContentLoaded', function() {
    // Get references to HTML elements
    const emojiDisplay = document.getElementById('emoji-display');
    const emojiButton = document.getElementById('emoji-btn');
    
    // Array of emojis to choose from
    const emojis = [
        '😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤔', '😴', '🥳',
        '🤩', '😜', '🤪', '😳', '🥺', '😡', '🤯', '😱', '🤗', '🙄'
    ];
    
    // Function to get a random emoji
    function getRandomEmoji() {
        const randomIndex = Math.floor(Math.random() * emojis.length);
        return emojis[randomIndex];
    }
    
    // Function to update the displayed emoji
    function updateEmoji() {
        const newEmoji = getRandomEmoji();
        emojiDisplay.textContent = newEmoji;
    }
    
    // Add click event listener to the button
    emojiButton.addEventListener('click', updateEmoji);
    
    // Optional: Change emoji every 3 seconds automatically
    setInterval(updateEmoji, 3000);
});