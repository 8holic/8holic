(function() {
    // ---------- GLOBAL STATE ----------
    let missions = [];
    let currentMission = null;
    let player = { row: 0, col: 0, dir: 0 };

    let totalCoins = 0;
    let coinsCollected = 0;
    let coinPositions = new Set();
    let goalPos = { row: -1, col: -1 };
    let goalUnlocked = false;
    let dead = false;               // true if player has died

    let isRunning = false, cancelExecution = false;
    let moveCount = 0;

    const dirDeltas = [{dr:0,dc:1},{dr:1,dc:0},{dr:0,dc:-1},{dr:-1,dc:0}];

    // Conditions (adding Facing fire)
    const CONDITIONS = [
        { code: 'can_go_forward',   label: 'Can go forward' },
        { code: 'cannot_go_forward', label: 'Cannot go forward' },
        { code: 'goal_locked',      label: 'Goal locked' },
        { code: 'goal_unlocked',    label: 'Goal unlocked' },
        { code: 'not_at_goal',      label: "Haven't reach objective" },
        { code: 'facing_fire',      label: 'Facing fire' }
    ];

    // Block editor state
    let topBlocks = [];
    let selectedBlock = null;
    let selectedSlot = null;

    // DOM elements
    const missionSelectScreen = document.getElementById('missionSelectScreen');
    const gameScreen = document.getElementById('gameScreen');
    const missionList = document.getElementById('missionList');
    const missionTitle = document.getElementById('missionTitle');
    const gridTable = document.getElementById('ctGrid');
    const runBtn = document.getElementById('ctRunBtn');
    const resetBtn = document.getElementById('ctResetBtn');
    const backBtn = document.getElementById('backBtn');
    const errorMsg = document.getElementById('ctError');
    const statusMsg = document.getElementById('ctStatus');
    const resultsMsg = document.getElementById('ctResults');
    const blockScript = document.getElementById('blockScript');
    const elseBtn = document.getElementById('elseBtn');
    const elseifBtn = document.getElementById('elseifBtn');

    let blockIdCounter = 0;
    function newBlockId() { return 'b' + (blockIdCounter++); }

    // ---------- MISSION LOADING ----------
    async function loadMissions() {
        try {
            const resp = await fetch('mission.json');
            if (!resp.ok) throw new Error('Failed to fetch');
            missions = await resp.json();
            renderMissionList();
        } catch (err) {
            missionList.innerHTML = '<li style="color:#FFD1E3;">❌ Could not load missions. Check mission.json file.</li>';
            console.error(err);
        }
    }

    function renderMissionList() {
        missionList.innerHTML = '';
        if (!missions.length) {
            missionList.innerHTML = '<li class="loading-msg">No missions available.</li>';
            return;
        }
        missions.forEach(m => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${m.name}</strong><p>${m.description}</p>`;
            li.addEventListener('click', () => startMission(m));
            missionList.appendChild(li);
        });
    }

    function parseMissionGrid(maze) {
        const rows = maze.length;
        const cols = maze[0].length;
        let start = null, goal = null;
        const coins = [];
        const fires = [];   // track fire positions for rendering
        for (let r = 0; r < rows; r++) {
            if (maze[r].length !== cols) throw new Error(`Row ${r} has inconsistent length`);
            for (let c = 0; c < cols; c++) {
                const cell = maze[r][c];
                if (cell === 'S') {
                    if (start) throw new Error('Multiple start positions found');
                    start = { row: r, col: c, dir: 0 };
                } else if (cell === 'G') {
                    if (goal) throw new Error('Multiple goal positions found');
                    goal = { row: r, col: c };
                } else if (cell === 'C') {
                    coins.push({ row: r, col: c });
                } else if (cell === 'F') {
                    fires.push({ row: r, col: c });
                }
            }
        }
        if (!start) throw new Error('No start (S) found in maze');
        if (!goal) throw new Error('No goal (G) found in maze');
        return { rows, cols, start, goal, coins, fires };
    }

    function startMission(mission) {
        try {
            const { rows, cols, start, goal, coins, fires } = parseMissionGrid(mission.maze);
            currentMission = {
                ...mission,
                rawMaze: mission.maze,
                rows, cols, start, goal,
                coinData: coins,
                fireData: fires
            };
            totalCoins = coins.length;
            coinsCollected = 0;
            coinPositions = new Set(coins.map(c => `${c.row},${c.col}`));
            goalPos = { row: goal.row, col: goal.col };
            goalUnlocked = (totalCoins === 0);
            dead = false;

            player.row = start.row;
            player.col = start.col;
            player.dir = start.dir;
            checkCoinPickup();

            // If start is on fire (shouldn't happen), treat as dead
            if (currentMission.rawMaze[player.row][player.col] === 'F') {
                dead = true;
                setStatus('🔥 You started on fire!');
            }

            topBlocks = [];
            selectedBlock = null;
            selectedSlot = null;
            moveCount = 0;
            blockIdCounter = 0;
            renderAllBlocks();
            renderGrid();
            clearError();
            setStatus(dead ? '🔥 You started on fire!' : (goalUnlocked ? 'Goal is open. Reach it!' : `Collect all ${totalCoins} coins to unlock the goal.`));
            resultsMsg.textContent = '';
            missionTitle.textContent = mission.name;
            missionSelectScreen.style.display = 'none';
            gameScreen.style.display = 'block';
        } catch (err) {
            alert('Mission error: ' + err.message);
        }
    }

    // ---------- GAME LOGIC ----------
    function canGoForward() {
        const d = dirDeltas[player.dir];
        const nr = player.row + d.dr, nc = player.col + d.dc;
        if (nr < 0 || nr >= currentMission.rows || nc < 0 || nc >= currentMission.cols) return false;
        const cell = currentMission.rawMaze[nr][nc];
        return cell !== 1;   // Fire is not a wall, so you can move into it
    }

    function evaluateCondition(cond) {
        switch(cond) {
            case 'can_go_forward':   return canGoForward();
            case 'cannot_go_forward': return !canGoForward();
            case 'goal_locked':      return !goalUnlocked;
            case 'goal_unlocked':    return goalUnlocked;
            case 'not_at_goal':      return !(player.row === goalPos.row && player.col === goalPos.col);
            case 'facing_fire':      {
                const d = dirDeltas[player.dir];
                const nr = player.row + d.dr, nc = player.col + d.dc;
                if (nr < 0 || nr >= currentMission.rows || nc < 0 || nc >= currentMission.cols) return false;
                return currentMission.rawMaze[nr][nc] === 'F';
            }
            default: return false;
        }
    }

    function moveForward() {
        if (!canGoForward()) return false;
        const d = dirDeltas[player.dir];
        player.row += d.dr;
        player.col += d.dc;
        checkCoinPickup();
        moveCount++;

        // Check for death by fire
        if (currentMission.rawMaze[player.row][player.col] === 'F') {
            dead = true;
            setStatus('🔥 You stepped into the fire and burned!');
            showResults();
            return false;   // movement still succeeded, but you died
        }
        return true;
    }

    function turnRight() { player.dir = (player.dir + 1) % 4; }

    function reachedGoal() {
        return player.row === goalPos.row && player.col === goalPos.col;
    }

    function checkCoinPickup() {
        if (!currentMission) return;
        const key = `${player.row},${player.col}`;
        if (coinPositions.has(key)) {
            coinPositions.delete(key);
            coinsCollected++;
            if (coinsCollected === totalCoins) {
                goalUnlocked = true;
                setStatus('All coins collected! Goal unlocked. Reach the G!');
            } else {
                setStatus(`Coins: ${coinsCollected}/${totalCoins}`);
            }
            renderGrid();
        }
    }

    function resetCoinState() {
        if (!currentMission) return;
        coinsCollected = 0;
        coinPositions = new Set(currentMission.coinData.map(c => `${c.row},${c.col}`));
        goalUnlocked = (totalCoins === 0);
        renderGrid();
    }

    function resetPlayerToStart() {
        if (!currentMission) return;
        player.row = currentMission.start.row;
        player.col = currentMission.start.col;
        player.dir = currentMission.start.dir;
        dead = false;
        checkCoinPickup();
    }

    function renderGrid() {
        if (!currentMission) return;
        const { rawMaze, rows, cols } = currentMission;
        gridTable.innerHTML = '';
        for (let r = 0; r < rows; r++) {
            const tr = document.createElement('tr');
            for (let c = 0; c < cols; c++) {
                const td = document.createElement('td');
                const cell = rawMaze[r][c];
                const isGoal = (r === goalPos.row && c === goalPos.col);
                const isCoin = (coinPositions.has(`${r},${c}`));
                const isPlayerHere = (r === player.row && c === player.col);
                const isFire = (cell === 'F');

                if (cell === 1) {
                    td.classList.add('wall');
                    td.textContent = '🌵';
                } else if (isPlayerHere) {
                    // Show robot, even if on fire (to show death)
                    const robot = document.createElement('span');
                    robot.textContent = '🐫';
                    td.appendChild(robot);
                    if (isFire) {
                        // Indicate the robot is on fire
                        td.style.background = '#ff4500';
                    }
                } else if (isFire) {
                    td.textContent = '🔥';
                } else if (isGoal) {
                    if (goalUnlocked) {
                        td.classList.add('goal');
                        td.textContent = '🏁';
                    } else {
                        td.classList.add('goal-locked');
                        td.textContent = '🔒';
                    }
                } else if (isCoin) {
                    td.textContent = '💰';
                }
                tr.appendChild(td);
            }
            gridTable.appendChild(tr);
        }

        // Update facing indicator
        const dirEl = document.getElementById('ctDirection');
        if (dirEl) {
            const dirNames = ['East', 'South', 'West', 'North'];
            dirEl.textContent = 'Facing: ' + dirNames[player.dir];
        }
    }

    // ---------- BLOCK SERIALIZATION ----------
    function serializeBlocks(blocks, indent = 0) {
        let text = '';
        const spaces = ' '.repeat(indent);
        for (const block of blocks) {
            if (block.type === 'fwd') {
                text += spaces + 'fwd\n';
            } else if (block.type === 'turn') {
                text += spaces + 'turn\n';
            } else if (block.type === 'if') {
                text += spaces + `if ${block.condition}:\n`;
                text += serializeBlocks(block.thenBlocks, indent + 4);
                for (const ei of block.elseIfBlocks) {
                    text += spaces + `else if ${ei.condition}:\n`;
                    text += serializeBlocks(ei.body, indent + 4);
                }
                if (block.elseBlocks && block.elseBlocks.length > 0) {
                    text += spaces + 'else:\n';
                    text += serializeBlocks(block.elseBlocks, indent + 4);
                }
            } else if (block.type === 'while') {
                text += spaces + `while ${block.condition}:\n`;
                text += serializeBlocks(block.bodyBlocks, indent + 4);
            }
        }
        return text;
    }

    function getProgramText() {
        return serializeBlocks(topBlocks);
    }

    // ---------- BLOCK EDITOR RENDERING ----------
    function renderAllBlocks() {
        blockScript.innerHTML = '';
        if (topBlocks.length === 0) {
            blockScript.innerHTML = '<div style="color:#666; text-align:center; padding:1rem;">Click buttons above to build your program</div>';
        } else {
            for (const block of topBlocks) {
                blockScript.appendChild(renderBlock(block, 0));
            }
        }
        updateElseAndElseIfButtons();
    }

    function conditionOptions(selectedCode) {
        return CONDITIONS.map(c => 
            `<option value="${c.code}" ${c.code === selectedCode ? 'selected' : ''}>${c.label}</option>`
        ).join('');
    }

    function renderBlock(block, depth) {
        const wrapper = document.createElement('div');
        wrapper.className = 'block';
        wrapper.style.marginLeft = depth * 24 + 'px';

        if (block.type === 'fwd' || block.type === 'turn') {
            const row = document.createElement('div');
            row.className = 'block-row';
            if (selectedBlock === block) row.classList.add('selected');
            const text = document.createElement('span');
            text.className = 'block-text';
            text.textContent = block.type === 'fwd' ? '▶ Forward' : '↻ Turn';
            const delBtn = document.createElement('button');
            delBtn.className = 'block-delete';
            delBtn.innerHTML = '&times;';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteBlock(block);
            });
            row.appendChild(text);
            row.appendChild(delBtn);
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                selectBlock(block, null);
            });
            wrapper.appendChild(row);
        } else if (block.type === 'if') {
            const container = document.createElement('div');
            container.className = 'if-container';
            container.style.position = 'relative';

            const header = document.createElement('div');
            header.className = 'if-header';
            header.innerHTML = `If <select class="condition-select">${conditionOptions(block.condition)}</select>`;
            const select = header.querySelector('select');
            select.addEventListener('pointerdown', (e) => e.stopPropagation());
            select.addEventListener('mousedown', (e) => e.stopPropagation());
            select.addEventListener('touchstart', (e) => e.stopPropagation());
            select.addEventListener('change', (e) => {
                e.stopPropagation();
                block.condition = e.target.value;
                renderAllBlocks();
            });
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                selectBlock(block, 'then');
            });
            container.appendChild(header);

            const thenDiv = document.createElement('div');
            thenDiv.className = 'block-body';
            if (selectedBlock === block && selectedSlot === 'then') {
                thenDiv.style.border = '1px dashed #FFD1E3';
            }
            for (const b of block.thenBlocks) {
                thenDiv.appendChild(renderBlock(b, depth + 1));
            }
            container.appendChild(thenDiv);

            // else-if blocks
            for (let i = 0; i < block.elseIfBlocks.length; i++) {
                const ei = block.elseIfBlocks[i];
                const eiHeader = document.createElement('div');
                eiHeader.className = 'elseif-header';
                eiHeader.innerHTML = `Else If <select class="condition-select">${conditionOptions(ei.condition)}</select>`;
                const eiSelect = eiHeader.querySelector('select');
                eiSelect.addEventListener('pointerdown', (e) => e.stopPropagation());
                eiSelect.addEventListener('mousedown', (e) => e.stopPropagation());
                eiSelect.addEventListener('touchstart', (e) => e.stopPropagation());
                eiSelect.addEventListener('change', (e) => {
                    e.stopPropagation();
                    ei.condition = e.target.value;
                    renderAllBlocks();
                });
                eiHeader.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectElseIfBlock(block, i);
                });
                container.appendChild(eiHeader);
                const eiBody = document.createElement('div');
                eiBody.className = 'block-body';
                if (selectedBlock === ei && selectedSlot === 'elseif') {
                    eiBody.style.border = '1px dashed #FFD1E3';
                }
                for (const b of ei.body) {
                    eiBody.appendChild(renderBlock(b, depth + 1));
                }
                container.appendChild(eiBody);
            }

            // else block (no condition)
            if (block.elseBlocks && block.elseBlocks.length > 0) {
                const elseHeader = document.createElement('div');
                elseHeader.className = 'else-header';
                elseHeader.textContent = 'Else';
                elseHeader.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectBlock(block, 'else');
                });
                container.appendChild(elseHeader);
                const elseDiv = document.createElement('div');
                elseDiv.className = 'block-body';
                if (selectedBlock === block && selectedSlot === 'else') {
                    elseDiv.style.border = '1px dashed #FFD1E3';
                }
                for (const b of block.elseBlocks) {
                    elseDiv.appendChild(renderBlock(b, depth + 1));
                }
                container.appendChild(elseDiv);
            } else if (selectedBlock === block && selectedSlot === 'else') {
                const placeholder = document.createElement('div');
                placeholder.textContent = 'Add blocks to else';
                placeholder.style.border = '1px dashed #FFD1E3';
                placeholder.style.padding = '4px';
                placeholder.style.margin = '2px 24px';
                placeholder.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectBlock(block, 'else');
                });
                container.appendChild(placeholder);
            }

            const delBtn = document.createElement('button');
            delBtn.className = 'block-delete';
            delBtn.textContent = '×';
            delBtn.style.position = 'absolute';
            delBtn.style.top = '2px';
            delBtn.style.right = '2px';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteBlock(block);
            });
            container.appendChild(delBtn);
            wrapper.appendChild(container);
        } else if (block.type === 'while') {
            const container = document.createElement('div');
            container.className = 'while-container';
            container.style.position = 'relative';

            const header = document.createElement('div');
            header.className = 'while-header';
            header.innerHTML = `While <select class="condition-select">${conditionOptions(block.condition)}</select>`;
            const whileSelect = header.querySelector('select');
            whileSelect.addEventListener('pointerdown', (e) => e.stopPropagation());
            whileSelect.addEventListener('mousedown', (e) => e.stopPropagation());
            whileSelect.addEventListener('touchstart', (e) => e.stopPropagation());
            whileSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                block.condition = e.target.value;
                renderAllBlocks();
            });
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                selectBlock(block, 'body');
            });
            container.appendChild(header);

            const bodyDiv = document.createElement('div');
            bodyDiv.className = 'block-body';
            if (selectedBlock === block && selectedSlot === 'body') {
                bodyDiv.style.border = '1px dashed #FFD1E3';
            }
            for (const b of block.bodyBlocks) {
                bodyDiv.appendChild(renderBlock(b, depth + 1));
            }
            container.appendChild(bodyDiv);

            const delBtn = document.createElement('button');
            delBtn.className = 'block-delete';
            delBtn.textContent = '×';
            delBtn.style.position = 'absolute';
            delBtn.style.top = '2px';
            delBtn.style.right = '2px';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteBlock(block);
            });
            container.appendChild(delBtn);
            wrapper.appendChild(container);
        }
        return wrapper;
    }

    function updateElseAndElseIfButtons() {
        if (selectedBlock && selectedBlock.type === 'if' && (!selectedBlock.elseBlocks || selectedBlock.elseBlocks.length === 0)) {
            elseBtn.disabled = false;
        } else {
            elseBtn.disabled = true;
        }
        if (selectedBlock && selectedBlock.type === 'if' && (!selectedBlock.elseBlocks || selectedBlock.elseBlocks.length === 0)) {
            elseifBtn.disabled = false;
        } else {
            elseifBtn.disabled = true;
        }
    }

    function selectBlock(block, slot) {
        selectedBlock = block;
        selectedSlot = slot;
        renderAllBlocks();
    }

    function selectElseIfBlock(parentIf, index) {
        selectedBlock = parentIf.elseIfBlocks[index];
        selectedSlot = 'elseif';
        renderAllBlocks();
    }

    function findParentAndSlot(block) {
        function search(arr, parent, slotName) {
            for (let item of arr) {
                if (item === block) {
                    return { parent, slot: slotName };
                }
                if (item.type === 'if') {
                    let found = search(item.thenBlocks, item, 'then');
                    if (found) return found;
                    for (let ei of item.elseIfBlocks) {
                        found = search(ei.body, ei, 'elseif');
                        if (found) return found;
                    }
                    if (item.elseBlocks) {
                        found = search(item.elseBlocks, item, 'else');
                        if (found) return found;
                    }
                } else if (item.type === 'while') {
                    let found = search(item.bodyBlocks, item, 'body');
                    if (found) return found;
                }
            }
            return null;
        }
        return search(topBlocks, null, null);
    }

    function deleteBlock(blockToDelete) {
        const parentInfo = findParentAndSlot(blockToDelete);

        function removeFromArray(arr) {
            const idx = arr.indexOf(blockToDelete);
            if (idx !== -1) {
                arr.splice(idx, 1);
                if (selectedBlock === blockToDelete) {
                    selectedBlock = null;
                    selectedSlot = null;
                }
                renderAllBlocks();
                return true;
            }
            for (const item of arr) {
                if (item.type === 'if') {
                    if (removeFromArray(item.thenBlocks)) return true;
                    for (const ei of item.elseIfBlocks) {
                        if (removeFromArray(ei.body)) return true;
                    }
                    if (item.elseBlocks && removeFromArray(item.elseBlocks)) return true;
                } else if (item.type === 'while') {
                    if (removeFromArray(item.bodyBlocks)) return true;
                }
            }
            return false;
        }
        removeFromArray(topBlocks);

        if (parentInfo && parentInfo.parent) {
            const parent = parentInfo.parent;
            let slot = parentInfo.slot;

            if (parent.type === 'elseif') {
                const ifParent = findParentIfOfElseIf(parent);
                if (ifParent && parent.body.length === 0) {
                    selectBlock(parent, 'elseif');
                    return;
                }
            } else if (parent.type === 'if') {
                if (slot === 'then' && parent.thenBlocks.length === 0) {
                    selectBlock(parent, 'then');
                } else if (slot === 'else' && parent.elseBlocks && parent.elseBlocks.length === 0) {
                    selectBlock(parent, 'else');
                }
            } else if (parent.type === 'while') {
                if (slot === 'body' && parent.bodyBlocks.length === 0) {
                    selectBlock(parent, 'body');
                }
            }
        }
    }

    function findParentIfOfElseIf(eiBlock) {
        function search(arr) {
            for (const item of arr) {
                if (item.type === 'if' && item.elseIfBlocks.includes(eiBlock)) return item;
                if (item.type === 'if') {
                    const found = search(item.thenBlocks) || search(item.elseBlocks || []) || 
                        search(item.elseIfBlocks.flatMap(e => e.body));
                    if (found) return found;
                } else if (item.type === 'while') {
                    const found = search(item.bodyBlocks);
                    if (found) return found;
                }
            }
            return null;
        }
        return search(topBlocks);
    }

    function addBlockToSlot(block) {
        if (!selectedBlock) {
            topBlocks.push(block);
        } else if (selectedBlock.type === 'if') {
            if (selectedSlot === 'then') {
                selectedBlock.thenBlocks.push(block);
            } else if (selectedSlot === 'else') {
                if (!selectedBlock.elseBlocks) selectedBlock.elseBlocks = [];
                selectedBlock.elseBlocks.push(block);
            } else if (selectedSlot === 'elseif') {
                selectedBlock.body.push(block);
            } else {
                insertAfterSelected(block);
                return;
            }
        } else if (selectedBlock.type === 'while') {
            if (selectedSlot === 'body') {
                selectedBlock.bodyBlocks.push(block);
            } else {
                insertAfterSelected(block);
                return;
            }
        } else {
            insertAfterSelected(block);
            return;
        }
        renderAllBlocks();
    }

    function insertAfterSelected(block) {
        function findParentAndInsert(arr) {
            for (let i = 0; i < arr.length; i++) {
                if (arr[i] === selectedBlock) {
                    arr.splice(i + 1, 0, block);
                    return true;
                }
                if (arr[i].type === 'if') {
                    if (findParentAndInsert(arr[i].thenBlocks)) return true;
                    for (const ei of arr[i].elseIfBlocks) {
                        if (findParentAndInsert(ei.body)) return true;
                    }
                    if (arr[i].elseBlocks && findParentAndInsert(arr[i].elseBlocks)) return true;
                } else if (arr[i].type === 'while') {
                    if (findParentAndInsert(arr[i].bodyBlocks)) return true;
                }
            }
            return false;
        }
        if (selectedBlock) {
            if (findParentAndInsert(topBlocks)) {
                selectedBlock = block;
                selectedSlot = null;
            } else {
                topBlocks.push(block);
            }
        } else {
            topBlocks.push(block);
        }
    }

    // ---------- BUTTON HANDLERS ----------
    // Click on empty space in the script area → deselect
    blockScript.addEventListener('click', (e) => {
        if (e.target === blockScript) {
            selectedBlock = null;
            selectedSlot = null;
            renderAllBlocks();
        }
    });
    document.getElementById('blockToolbox').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const type = btn.dataset.type;
        if (type === 'fwd') {
            addBlockToSlot({ type: 'fwd', _id: newBlockId() });
        } else if (type === 'turn') {
            addBlockToSlot({ type: 'turn', _id: newBlockId() });
        } else if (type === 'if') {
            const ifBlock = {
                type: 'if',
                condition: 'can_go_forward',
                thenBlocks: [],
                elseIfBlocks: [],
                elseBlocks: [],
                _id: newBlockId()
            };
            addBlockToSlot(ifBlock);
            selectBlock(ifBlock, 'then');
        } else if (type === 'elseif') {
            if (!selectedBlock || selectedBlock.type !== 'if') {
                alert('Select an If block (without Else) first.');
                return;
            }
            if (selectedBlock.elseBlocks && selectedBlock.elseBlocks.length > 0) {
                alert('Else already exists. Cannot add Else If after Else.');
                return;
            }
            const eiBlock = {
                condition: 'can_go_forward',
                body: [],
                _id: newBlockId()
            };
            selectedBlock.elseIfBlocks.push(eiBlock);
            selectElseIfBlock(selectedBlock, selectedBlock.elseIfBlocks.length - 1);
            renderAllBlocks();
        } else if (type === 'else') {
            if (!selectedBlock || selectedBlock.type !== 'if') {
                alert('Select an If block (without Else) first.');
                return;
            }
            if (selectedBlock.elseBlocks && selectedBlock.elseBlocks.length > 0) {
                alert('Else already exists.');
                return;
            }
            selectedBlock.elseBlocks = [];
            selectBlock(selectedBlock, 'else');
            renderAllBlocks();
        } else if (type === 'while') {
            const whileBlock = {
                type: 'while',
                condition: 'can_go_forward',
                bodyBlocks: [],
                _id: newBlockId()
            };
            addBlockToSlot(whileBlock);
            selectBlock(whileBlock, 'body');
        }
    });

    document.getElementById('clearBlocksBtn').addEventListener('click', () => {
        topBlocks = [];
        selectedBlock = null;
        selectedSlot = null;
        renderAllBlocks();
    });

    // ---------- PARSER ----------
    function parseProgram(code) {
        const lines = code.split('\n').map((txt, idx) => ({ text: txt, lineNo: idx + 1 }));
        const filtered = lines.filter(l => l.text.trim() !== '' && !l.text.trim().startsWith('#'));
        return parseBlock(filtered, 0, 0).block;
    }

    function parseBlock(lines, startIdx, baseIndent) {
        const cmds = [];
        let i = startIdx;
        while (i < lines.length) {
            const { text, lineNo } = lines[i];
            const indent = text.search(/\S/);
            if (indent < baseIndent) break;
            if (indent > baseIndent) throw new Error(`Line ${lineNo}: Unexpected indentation.`);
            const trimmed = text.trim();
            if (trimmed === 'fwd' || trimmed === 'forward') {
                cmds.push({ type: 'fwd' }); i++;
            } else if (trimmed === 'turn') {
                cmds.push({ type: 'turn' }); i++;
            } else if (trimmed.startsWith('if ')) {
                const condition = trimmed.slice(3, -1).trim();
                const ifCmd = { type: 'if', condition, thenBlock: [], elseIfBlocks: [], elseBlock: [] };
                const thenRes = parseBlock(lines, i + 1, baseIndent + 4);
                ifCmd.thenBlock = thenRes.block;
                i = thenRes.nextIdx;
                while (i < lines.length && lines[i].text.trim().startsWith('else')) {
                    const elseLine = lines[i].text.trim();
                    if (elseLine === 'else:') {
                        if (lines[i].text.search(/\S/) !== baseIndent)
                            throw new Error(`Line ${lines[i].lineNo}: 'else:' must match 'if' indent.`);
                        const elseRes = parseBlock(lines, i + 1, baseIndent + 4);
                        ifCmd.elseBlock = elseRes.block;
                        i = elseRes.nextIdx;
                        break;
                    } else if (elseLine.startsWith('else if ')) {
                        if (lines[i].text.search(/\S/) !== baseIndent)
                            throw new Error(`Line ${lines[i].lineNo}: 'else if' must match 'if' indent.`);
                        const cond = elseLine.slice(8, -1).trim();
                        const eiBlock = { condition: cond, body: [] };
                        const eiRes = parseBlock(lines, i + 1, baseIndent + 4);
                        eiBlock.body = eiRes.block;
                        ifCmd.elseIfBlocks.push(eiBlock);
                        i = eiRes.nextIdx;
                    } else {
                        throw new Error(`Line ${lines[i].lineNo}: Invalid else/else if syntax.`);
                    }
                }
                cmds.push(ifCmd);
            } else if (trimmed.startsWith('while ')) {
                const condition = trimmed.slice(6, -1).trim();
                const whileCmd = { type: 'while', condition, body: [] };
                const bodyRes = parseBlock(lines, i + 1, baseIndent + 4);
                whileCmd.body = bodyRes.block;
                i = bodyRes.nextIdx;
                cmds.push(whileCmd);
            } else {
                throw new Error(`Line ${lineNo}: Unknown command "${trimmed}"`);
            }
        }
        return { block: cmds, nextIdx: i };
    }

    // ---------- EXECUTION ----------
    async function execute(commands) {
        for (const cmd of commands) {
            if (cancelExecution || dead) return;
            await new Promise(r => setTimeout(r, 500));
            switch (cmd.type) {
                case 'fwd':
                    // moveForward now returns false if movement impossible, but we still check canGoForward first
                    if (!canGoForward()) break;
                    moveForward();   // may set dead = true
                    renderGrid();
                    if (dead) {
                        showResults();
                        return;
                    }
                    if (goalUnlocked && reachedGoal()) {
                        setStatus('🎉 Mission complete!');
                        showResults();
                        return;
                    }
                    break;
                case 'turn':
                    turnRight(); renderGrid(); break;
                case 'if':
                    if (dead) return;
                    if (evaluateCondition(cmd.condition)) {
                        await execute(cmd.thenBlock);
                    } else {
                        let executed = false;
                        for (const ei of (cmd.elseIfBlocks || [])) {
                            if (evaluateCondition(ei.condition)) {
                                await execute(ei.body);
                                executed = true;
                                break;
                            }
                        }
                        if (!executed && cmd.elseBlock && cmd.elseBlock.length > 0) {
                            await execute(cmd.elseBlock);
                        }
                    }
                    break;
                case 'while':
                    while (evaluateCondition(cmd.condition) && !cancelExecution && !dead) {
                        await execute(cmd.body);
                        await new Promise(r => setTimeout(r, 100));
                        if (goalUnlocked && reachedGoal()) { showResults(); return; }
                        if (dead) { showResults(); return; }
                    }
                    break;
            }
            if (dead || (goalUnlocked && reachedGoal())) {
                showResults();
                return;
            }
        }
    }

    function showResults() {
        if (dead) {
            resultsMsg.textContent = `🔥 Burned! Moves: ${moveCount}`;
        } else {
            resultsMsg.textContent = `🏁 Moves: ${moveCount} · Goal: ${reachedGoal() ? 'Reached ✅' : 'Not reached ❌'}`;
        }
    }

    function showError(msg) { errorMsg.textContent = msg; }
    function clearError() { errorMsg.textContent = ''; }
    function setStatus(msg) { statusMsg.textContent = msg; }

    // ---------- SCREEN SWITCHING ----------
    function showMissionSelect() {
        gameScreen.style.display = 'none';
        missionSelectScreen.style.display = 'block';
        cancelExecution = true;
        isRunning = false;
        runBtn.disabled = false;
        currentMission = null;
        selectedBlock = null;
        selectedSlot = null;
    }

    // ---------- EVENT LISTENERS ----------
    backBtn.addEventListener('click', showMissionSelect);

    runBtn.addEventListener('click', async () => {
        if (!currentMission || isRunning) return;
        clearError();
        resultsMsg.textContent = '';

        if (dead) {
            showError('You are already dead. Reset to try again.');
            return;
        }

        const code = getProgramText();
        if (code.trim() === '') {
            showError('Build a program first!');
            return;
        }

        let commands;
        try { commands = parseProgram(code); }
        catch (e) {
            showError('Syntax error: ' + e.message);
            return;
        }

        setStatus('Executing...');
        cancelExecution = false;
        isRunning = true;
        runBtn.disabled = true;

        resetPlayerToStart();
        resetCoinState();
        moveCount = 0;
        renderGrid();

        await execute(commands);

        if (!cancelExecution && !reachedGoal() && !dead) {
            setStatus('Execution finished. Goal not reached.');
            showResults();
        }
        isRunning = false;
        runBtn.disabled = false;
    });

    resetBtn.addEventListener('click', () => {
        if (!currentMission) return;
        cancelExecution = true;
        isRunning = false;
        runBtn.disabled = false;
        resetPlayerToStart();
        resetCoinState();
        moveCount = 0;
        dead = false;
        setStatus(goalUnlocked ? 'Goal is open. Reach it!' : `Collect all ${totalCoins} coins to unlock the goal.`);
        clearError();
        resultsMsg.textContent = '';
        renderGrid();
    });

    // ---------- STARTUP ----------
    loadMissions();
})();