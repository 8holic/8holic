// ======================= GAME CONFIG =======================
const ROWS = 6,
  COLS = 6;
const MAZE = [
  [0, 0, 0, 1, 0, 0],
  [1, 0, 0, 1, 0, 0],
  [1, 0, 0, 1, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0],
];
const START_ROW = 0,
  START_COL = 0,
  START_DIR = 0; // 0:right
const GOAL_ROW = 5,
  GOAL_COL = 5;

// ======================= PLAYER STATE =======================
let player = { row: START_ROW, col: START_COL, dir: START_DIR };
let isRunning = false;
let cancelExecution = false;

const dirDeltas = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: -1, dc: 0 },
];
const arrows = ["▶", "▼", "◀", "▲"];

// ======================= HELPERS =======================
function canGoForward() {
  const delta = dirDeltas[player.dir];
  const nr = player.row + delta.dr,
    nc = player.col + delta.dc;
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
  return MAZE[nr][nc] !== 1;
}

function moveForward() {
  if (!canGoForward()) return false;
  const delta = dirDeltas[player.dir];
  player.row += delta.dr;
  player.col += delta.dc;
  return true;
}

function turnRight() {
  player.dir = (player.dir + 1) % 4;
}

function reachedGoal() {
  return player.row === GOAL_ROW && player.col === GOAL_COL;
}

function resetPlayer() {
  player.row = START_ROW;
  player.col = START_COL;
  player.dir = START_DIR;
}

// ======================= RENDERING =======================
function renderGrid() {
  const table = document.getElementById("ctGrid");
  table.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < COLS; c++) {
      const td = document.createElement("td");
      if (MAZE[r][c] === 1) td.classList.add("wall");
      if (r === GOAL_ROW && c === GOAL_COL) td.classList.add("goal");

      if (r === player.row && c === player.col) {
        const arrowSpan = document.createElement("span");
        arrowSpan.classList.add("player-arrow");
        arrowSpan.textContent = arrows[player.dir];
        td.appendChild(arrowSpan);
      } else if (MAZE[r][c] === 1) {
        td.textContent = "🧱";
      } else if (r === GOAL_ROW && c === GOAL_COL) {
        td.textContent = "G";
      }
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

// ======================= PROGRAM PARSER =======================
function parseProgram(code) {
  const lines = code
    .split("\n")
    .map((line, idx) => ({ text: line, lineNo: idx + 1 }));
  const filtered = lines.filter(
    (l) => l.text.trim() !== "" && !l.text.trim().startsWith("#")
  );
  const result = parseBlock(filtered, 0, 0);
  return result.block;
}

function parseBlock(lines, startIdx, baseIndent) {
  const commands = [];
  let i = startIdx;
  while (i < lines.length) {
    const { text, lineNo } = lines[i];
    const indent = text.search(/\S/);
    if (indent < baseIndent) break;
    if (indent > baseIndent)
      throw new Error(`Line ${lineNo}: Unexpected indentation.`);

    const trimmed = text.trim();
    if (trimmed === "fwd" || trimmed === "forward") {
      commands.push({ type: "fwd" });
      i++;
    } else if (trimmed === "turn") {
      commands.push({ type: "turn" });
      i++;
    } else if (trimmed.startsWith("if can_go_forward:")) {
      const thenResult = parseBlock(lines, i + 1, baseIndent + 4);
      i = thenResult.nextIdx;
      let elseBlock = [];
      if (i < lines.length && lines[i].text.trim() === "else:") {
        if (lines[i].text.search(/\S/) !== baseIndent)
          throw new Error(
            `Line ${lines[i].lineNo}: 'else:' must match indent of 'if'`
          );
        const elseResult = parseBlock(lines, i + 1, baseIndent + 4);
        elseBlock = elseResult.block;
        i = elseResult.nextIdx;
      }
      commands.push({
        type: "if",
        condition: "can_go_forward",
        thenBlock: thenResult.block,
        elseBlock,
      });
    } else if (trimmed.startsWith("while can_go_forward:")) {
      const bodyResult = parseBlock(lines, i + 1, baseIndent + 4);
      i = bodyResult.nextIdx;
      commands.push({
        type: "while",
        condition: "can_go_forward",
        body: bodyResult.block,
      });
    } else {
      throw new Error(`Line ${lineNo}: Unknown command "${trimmed}"`);
    }
  }
  return { block: commands, nextIdx: i };
}

// ======================= EXECUTION =======================
async function execute(commands) {
  for (const cmd of commands) {
    if (cancelExecution) return;
    await delay(500);

    switch (cmd.type) {
      case "fwd":
        if (!canGoForward()) {
          showError("Cannot move forward (wall or boundary)");
          return;
        }
        moveForward();
        renderGrid();
        if (reachedGoal()) {
          setStatus("🎉 Goal reached!");
          return;
        }
        break;
      case "turn":
        turnRight();
        renderGrid();
        break;
      case "if":
        if (canGoForward()) {
          await execute(cmd.thenBlock);
        } else {
          await execute(cmd.elseBlock);
        }
        break;
      case "while":
        while (canGoForward() && !cancelExecution) {
          await execute(cmd.body);
          await delay(100);
        }
        break;
    }
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ======================= UI FEEDBACK =======================
function showError(msg) {
  document.getElementById("ctError").textContent = msg;
}
function clearError() {
  document.getElementById("ctError").textContent = "";
}
function setStatus(msg) {
  document.getElementById("ctStatus").textContent = msg;
}

// ======================= SETUP =======================
document.addEventListener("DOMContentLoaded", () => {
  const runBtn = document.getElementById("ctRunBtn");
  const resetBtn = document.getElementById("ctResetBtn");
  const codeArea = document.getElementById("ctCode");

  runBtn.addEventListener("click", async () => {
    if (isRunning) return;
    clearError();
    setStatus("Executing...");
    cancelExecution = false;
    isRunning = true;
    runBtn.disabled = true;

    let commands;
    try {
      commands = parseProgram(codeArea.value);
    } catch (e) {
      showError("Syntax error: " + e.message);
      isRunning = false;
      runBtn.disabled = false;
      return;
    }

    resetPlayer();
    renderGrid();

    await execute(commands);

    if (!cancelExecution && !reachedGoal()) {
      setStatus("Execution finished. Goal not reached.");
    }
    isRunning = false;
    runBtn.disabled = false;
  });

  resetBtn.addEventListener("click", () => {
    cancelExecution = true;
    isRunning = false;
    runBtn.disabled = false;
    resetPlayer();
    renderGrid();
    setStatus("Reset to start.");
    clearError();
  });

  // Initial draw
  resetPlayer();
  renderGrid();
});