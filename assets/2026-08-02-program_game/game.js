window.initProgrammingGame = function() {
    // ------------------- CONFIG -------------------
    const stages = [
        {name:"Stage 1"},
        {name:"Stage 2"},
        {name:"Stage 3"}
    ];

    // ------------------- STATE -------------------
    let state = {
        stageIndex: null
    };

    // ------------------- DOM -------------------
    const stageSelectEl = document.getElementById('stageSelect');
    if(!stageSelectEl){
        console.error('Stage select container not found.');
        return;
    }

    // ------------------- STAGE SELECT -------------------
    function renderStageSelect() {
        stageSelectEl.innerHTML = '';
        stages.forEach((stage,i)=>{
            const btn = document.createElement('button');
            btn.className = 'pg-code-block';
            btn.textContent = stage.name;
            if(i===state.stageIndex) btn.style.backgroundColor = '#38a169';
            btn.addEventListener('click',()=>{
                state.stageIndex = i;
                renderStageSelect();
                alert(`Selected ${stage.name}`);
            });
            stageSelectEl.appendChild(btn);
        });
    }

    renderStageSelect();
};
