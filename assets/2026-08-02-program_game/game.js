window.initProgrammingGame = function(container=document.body) {
'use strict';

// ------------------- CONFIG -------------------
const cellSize = 50;

const stages = [
    {
        name: "Stage 1",
        gridSize:7,
        start:{x:0,y:0,dir:'right'},
        goal:{x:6,y:6},
        obstacles:[{x:2,y:2},{x:4,y:3},{x:1,y:5},{x:5,y:2}],
        coins:[{x:3,y:1},{x:2,y:5}]
    },
    {
        name: "Stage 2",
        gridSize:7,
        start:{x:0,y:0,dir:'right'},
        goal:{x:6,y:0},
        obstacles:[{x:3,y:2},{x:3,y:3},{x:3,y:4}],
        coins:[{x:1,y:1},{x:5,y:2},{x:2,y:5}]
    }
];

// ------------------- STATE -------------------
let state = {
    stageIndex:0,
    player:{}, program:[], isRunning:false, hasWon:false,
    collectedCoins:[]
};

// ------------------- DOM -------------------
const gridEl = document.getElementById('grid');
const programEl = document.getElementById('programDisplay');
const stageSelectEl = document.getElementById('stageSelect');

// ------------------- INIT -------------------
function init() {
    renderStageSelect();
    loadStage(0);
    setupControls();
}
init();

// ------------------- STAGE SELECT -------------------
function renderStageSelect() {
    stageSelectEl.innerHTML = '';
    stages.forEach((stage,i)=>{
        const btn = document.createElement('button');
        btn.textContent = stage.name;
        if(i===state.stageIndex) btn.classList.add('selected');
        btn.addEventListener('click',()=>loadStage(i));
        stageSelectEl.appendChild(btn);
    });
}

function loadStage(index) {
    state.stageIndex=index;
    state.player={...stages[index].start};
    state.program=[];
    state.hasWon=false;
    state.isRunning=false;
    state.collectedCoins=[];
    updateProgramDisplay();
    renderStageSelect();
    renderGrid();
}

// ------------------- GRID -------------------
function renderGrid() {
    const stage = stages[state.stageIndex];
    gridEl.style.gridTemplateColumns = `repeat(${stage.gridSize}, ${cellSize}px)`;
    gridEl.innerHTML='';
    for(let y=0;y<stage.gridSize;y++){
        for(let x=0;x<stage.gridSize;x++){
            const cell=document.createElement('div');
            cell.style.width=cell.style.height=cellSize+'px';
            cell.style.border='1px solid #444';
            cell.style.display='flex'; cell.style.alignItems='center'; cell.style.justifyContent='center';
            cell.style.fontSize='24px';

            // Obstacles
            if(stage.obstacles.some(o=>o.x===x && o.y===y)) cell.textContent='⬛';

            // Coins
            const coinIndex = stage.coins.findIndex(c=>c.x===x && c.y===y);
            if(coinIndex>=0 && !state.collectedCoins.includes(coinIndex)) cell.textContent='💰';

            // Goal
            if(stage.goal.x===x && stage.goal.y===y) cell.textContent='🏁';

            // Player
            if(state.player.x===x && state.player.y===y){
                switch(state.player.dir){
                    case 'up': cell.textContent='↑'; break;
                    case 'down': cell.textContent='↓'; break;
                    case 'left': cell.textContent='←'; break;
                    case 'right': cell.textContent='→'; break;
                }
            }

            gridEl.appendChild(cell);
        }
    }
}

// ------------------- CONTROLS -------------------
function setupControls(){
    document.querySelectorAll('[data-action]').forEach(btn=>{
        btn.addEventListener('click',()=>{
            const action = btn.dataset.action;
            if(action==='repeat'){
                state.program.push({type:'repeat',times:2,commands:['move']});
            } else if(action==='ifPathAhead'){
                state.program.push({type:'ifPathAhead',commands:['move']});
            } else state.program.push(action);
            updateProgramDisplay();
        });
    });

    document.getElementById('runProgram').addEventListener('click',()=>runProgram(state.program.slice()));
    document.getElementById('stepProgram').addEventListener('click',stepProgram);
    document.getElementById('resetGame').addEventListener('click',()=>loadStage(state.stageIndex));
    document.getElementById('clearProgram').addEventListener('click',()=>{state.program=[];updateProgramDisplay();});
}

// ------------------- PROGRAM DISPLAY -------------------
function updateProgramDisplay(){
    programEl.innerHTML=state.program.map(c=>{
        if(typeof c==='string') return c;
        if(c.type==='repeat') return `repeat ${c.times}x`;
        if(c.type==='ifPathAhead') return 'if path ahead';
        return '';
    }).join(' → ');
}

// ------------------- EXECUTION -------------------
async function runProgram(prog){
    if(state.isRunning || state.hasWon) return;
    state.isRunning=true;
    await executeProgram(prog);
    state.isRunning=false;
}

async function stepProgram(){
    if(state.isRunning || state.hasWon || state.program.length===0) return;
    state.isRunning=true;
    const cmd = state.program.shift();
    await executeProgram([cmd]);
    state.isRunning=false;
    updateProgramDisplay();
}

async function executeProgram(prog){
    for(let i=0;i<prog.length;i++){
        const cmd = prog[i];
        if(typeof cmd==='string') await executeCommand(cmd);
        else if(cmd.type==='repeat'){
            for(let r=0;r<cmd.times;r++) await executeProgram(cmd.commands);
        } else if(cmd.type==='ifPathAhead'){
            if(canMoveForward()) await executeProgram(cmd.commands);
        }
        renderGrid();
        await sleep(300);
        if(state.hasWon) break;
    }
}

// ------------------- COMMANDS -------------------
async function executeCommand(cmd){
    switch(cmd){
        case 'move': if(canMoveForward()) moveForward(); break;
        case 'left': turnLeft(); break;
        case 'right': turnRight(); break;
    }
    checkCoins();
    checkWin();
}

// ------------------- MOVEMENT -------------------
function moveForward(){
    switch(state.player.dir){
        case 'up': state.player.y--; break;
        case 'down': state.player.y++; break;
        case 'left': state.player.x--; break;
        case 'right': state.player.x++; break;
    }
}

function canMoveForward(){
    let {x,y} = state.player;
    const stage = stages[state.stageIndex];
    switch(state.player.dir){
        case 'up': y--; break;
        case 'down': y++; break;
        case 'left': x--; break;
        case 'right': x++; break;
    }
    if(x<0 || x>=stage.gridSize || y<0 || y>=stage.gridSize) return false;
    if(stage.obstacles.some(o=>o.x===x && o.y===y)) return false;
    return true;
}

function turnLeft(){ const dirs=['up','left','down','right']; state.player.dir=dirs[(dirs.indexOf(state.player.dir)+1)%4]; }
function turnRight(){ const dirs=['up','right','down','left']; state.player.dir=dirs[(dirs.indexOf(state.player.dir)+1)%4]; }

// ------------------- COINS -------------------
function checkCoins(){
    const stage=stages[state.stageIndex];
    const index=stage.coins.findIndex(c=>c.x===state.player.x && c.y===state.player.y);
    if(index>=0 && !state.collectedCoins.includes(index)) state.collectedCoins.push(index);
}

// ------------------- WIN -------------------
function checkWin(){
    const stage=stages[state.stageIndex];
    if(state.player.x===stage.goal.x && state.player.y===stage.goal.y){
        if(state.collectedCoins.length===stage.coins.length){
            state.hasWon=true;
            alert(`🎉 Stage Complete! You collected all coins!`);
        }
    }
}

// ------------------- UTILS -------------------
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

};
