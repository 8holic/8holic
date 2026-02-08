// game.js
// Proof-of-concept: Blockly renders successfully

window.initProgrammingGame = function (container) {
    'use strict';

    // Clear anything inside the container
    container.innerHTML = '';

    // Create Blockly container
    const blocklyDiv = document.createElement('div');
    blocklyDiv.id = 'blocklyDiv';
    blocklyDiv.style.width = '100%';
    blocklyDiv.style.maxWidth = '900px';
    blocklyDiv.style.height = '500px';
    blocklyDiv.style.margin = '0 auto';
    blocklyDiv.style.background = '#fff';
    blocklyDiv.style.borderRadius = '8px';
    blocklyDiv.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';

    container.appendChild(blocklyDiv);

    // Minimal toolbox (keep this tiny)
    const toolbox = {
        kind: 'flyoutToolbox',
        contents: [
            {
                kind: 'block',
                type: 'controls_repeat_ext'
            },
            {
                kind: 'block',
                type: 'math_number'
            },
            {
                kind: 'block',
                type: 'text_print'
            }
        ]
    };

    // Inject Blockly
    const workspace = Blockly.inject(blocklyDiv, {
        toolbox: toolbox,
        trashcan: true,
        scrollbars: true,
        zoom: {
            controls: true,
            wheel: true,
            startScale: 1.0,
            maxScale: 2,
            minScale: 0.5
        }
    });

    // Sanity log
    console.log('Blockly workspace initialized:', workspace);
};
