document.addEventListener('DOMContentLoaded', () => {

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('next');
  const nextCtx = nextCanvas.getContext('2d');

  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 30;

  const COLORS = [
    null,
    '#00f0ff', // I
    '#0000ff', // J
    '#ff8c00', // L
    '#ffff00', // O
    '#00ff00', // S
    '#a000ff', // T
    '#ff0000'  // Z
  ];

  const SHAPES = [
    [],
    [[1,1,1,1]],                       // I
    [[2,0,0],[2,2,2]],                 // J
    [[0,0,3],[3,3,3]],                 // L
    [[4,4],[4,4]],                     // O
    [[0,5,5],[5,5,0]],                 // S
    [[0,6,0],[6,6,6]],                 // T
    [[7,7,0],[0,7,7]]                  // Z
  ];

  let board = createMatrix(COLS, ROWS);
  let score = 0;
  let level = 1;
  let lines = 0;
  let dropCounter = 0;
  let dropInterval = 1000;
  let lastTime = 0;
  let gameOver = false;
  let paused = true;
  let animationId = null;

  const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    next: null
  };

  function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
  }

  function createPiece() {
    const id = Math.floor(Math.random() * 7) + 1;
    return SHAPES[id].map(row => row.slice());
  }

  function drawMatrix(matrix, offset, context, size) {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          context.fillStyle = COLORS[value];
          context.fillRect((x + offset.x) * size, (y + offset.y) * size, size, size);
          context.strokeStyle = '#000';
          context.lineWidth = 1;
          context.strokeRect((x + offset.x) * size, (y + offset.y) * size, size, size);
        }
      });
    });
  }

  function draw() {
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(board, {x:0, y:0}, ctx, BLOCK);
    if (player.matrix) drawMatrix(player.matrix, player.pos, ctx, BLOCK);

    nextCtx.fillStyle = '#0f0f1e';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (player.next) {
      const offset = {
        x: (4 - player.next[0].length) / 2,
        y: (4 - player.next.length) / 2
      };
      drawMatrix(player.next, offset, nextCtx, 30);
    }
  }

  function collide(board, player) {
    const m = player.matrix;
    const o = player.pos;
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < m[y].length; x++) {
        if (m[y][x] !== 0 &&
            (board[y + o.y] === undefined ||
             board[y + o.y][x + o.x] === undefined ||
             board[y + o.y][x + o.x] !== 0)) {
          return true;
        }
      }
    }
    return false;
  }

  function merge(board, player) {
    player.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          board[y + player.pos.y][x + player.pos.x] = value;
        }
      });
    });
  }

  function rotate(matrix, dir) {
    const N = matrix.length;
    const M = matrix[0].length;
    const result = [];
    for (let x = 0; x < M; x++) {
      result.push(new Array(N).fill(0));
    }
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < M; x++) {
        if (dir > 0) {
          result[x][N - 1 - y] = matrix[y][x];
        } else {
          result[M - 1 - x][y] = matrix[y][x];
        }
      }
    }
    return result;
  }

  function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    const original = player.matrix;
    player.matrix = rotate(player.matrix, dir);
    while (collide(board, player)) {
      player.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (Math.abs(offset) > player.matrix[0].length + 1) {
        player.matrix = original;
        player.pos.x = pos;
        return;
      }
    }
  }

  function playerMove(dir) {
    player.pos.x += dir;
    if (collide(board, player)) {
      player.pos.x -= dir;
    }
  }

  function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
      player.pos.y--;
      merge(board, player);
      playerReset();
      sweep();
      updateScore();
    }
    dropCounter = 0;
  }

  function hardDrop() {
    while (!collide(board, player)) {
      player.pos.y++;
    }
    player.pos.y--;
    merge(board, player);
    playerReset();
    sweep();
    updateScore();
    dropCounter = 0;
  }

  function playerReset() {
    player.matrix = player.next || createPiece();
    player.next = createPiece();
    player.pos.y = 0;
    player.pos.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);
    if (collide(board, player)) {
      gameOver = true;
      paused = true;
      document.getElementById('gameOverMsg').classList.remove('hidden');
    }
  }

  function sweep() {
    let rowCount = 0;
    outer: for (let y = board.length - 1; y >= 0; y--) {
      for (let x = 0; x < board[y].length; x++) {
        if (board[y][x] === 0) continue outer;
      }
      const row = board.splice(y, 1)[0].fill(0);
      board.unshift(row);
      y++;
      rowCount++;
    }
    if (rowCount > 0) {
      const points = [0, 40, 100, 300, 1200];
      score += (points[rowCount] || 0) * level;
      lines += rowCount;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 80);
    }
  }

  function updateScore() {
    document.getElementById('score').innerText = score;
    document.getElementById('level').innerText = level;
    document.getElementById('lines').innerText = lines;
  }

  function update(time = 0) {
    if (!paused && !gameOver) {
      const deltaTime = time - lastTime;
      dropCounter += deltaTime;
      if (dropCounter > dropInterval) {
        playerDrop();
      }
    }
    lastTime = time;
    draw();
    animationId = requestAnimationFrame(update);
  }

  document.addEventListener('keydown', event => {
    if (gameOver || paused) return;
    if (event.key === 'ArrowLeft') playerMove(-1);
    else if (event.key === 'ArrowRight') playerMove(1);
    else if (event.key === 'ArrowDown') playerDrop();
    else if (event.key === 'ArrowUp') playerRotate(1);
    else if (event.code === 'Space') {
      event.preventDefault();
      hardDrop();
    }
  });

  document.getElementById('startBtn').addEventListener('click', () => {
    if (gameOver) {
      board = createMatrix(COLS, ROWS);
      score = 0;
      level = 1;
      lines = 0;
      dropInterval = 1000;
      gameOver = false;
      document.getElementById('gameOverMsg').classList.add('hidden');
      playerReset();
      updateScore();
    }
    paused = !paused;
  });

  document.getElementById('creditsBtn').addEventListener('click', () => {
    document.getElementById('creditsModal').classList.remove('hidden');
  });

  document.getElementById('closeCredits').addEventListener('click', () => {
    document.getElementById('creditsModal').classList.add('hidden');
  });

  // --- Controlli touch (per telefono) ---
  const toggleTouchBtn = document.getElementById('toggleTouch');
  const touchControls = document.getElementById('touchControls');
  let touchEnabled = false;

  toggleTouchBtn.addEventListener('click', () => {
    touchEnabled = !touchEnabled;
    touchControls.classList.toggle('hidden', !touchEnabled);
    updateTouchButtonText();
  });

  function bindTouchButton(id, action) {
    const btn = document.getElementById(id);
    btn.addEventListener('click', () => {
      if (!gameOver && !paused) action();
    });
  }

  bindTouchButton('btnLeft', () => playerMove(-1));
  bindTouchButton('btnRight', () => playerMove(1));
  bindTouchButton('btnDown', () => playerDrop());
  bindTouchButton('btnRotate', () => playerRotate(1));
  bindTouchButton('btnDrop', () => hardDrop());

  // --- Multilingua (IT / EN / DE) ---
  const translations = {
    it: {
      title: 'TETRIS',
      backHub: 'Torna alla Game Hub',
      next: 'Prossimo',
      score: 'Punteggio',
      level: 'Livello',
      lines: 'Righe',
      start: 'Avvia / Pausa',
      touchLabel: 'Controlli Touch',
      on: 'ON',
      off: 'OFF',
      moveKeys: '⬅️ ➡️ : Muovi',
      downKey: '⬇️ : Scendi veloce',
      rotateKey: '⬆️ : Ruota',
      dropKey: 'Spazio : Fallo cadere',
      gameOver: 'GAME OVER',
      credits: 'Credits',
      programmedBy: 'Programmato da',
      ideaBy: 'Idea di',
      close: 'Chiudi',
      dropBtn: '⏬ Fallo Cadere'
    },
    en: {
      title: 'TETRIS',
      backHub: 'Back to Game Hub',
      next: 'Next',
      score: 'Score',
      level: 'Level',
      lines: 'Lines',
      start: 'Start / Pause',
      touchLabel: 'Touch Controls',
      on: 'ON',
      off: 'OFF',
      moveKeys: '⬅️ ➡️ : Move',
      downKey: '⬇️ : Soft drop',
      rotateKey: '⬆️ : Rotate',
      dropKey: 'Space : Hard drop',
      gameOver: 'GAME OVER',
      credits: 'Credits',
      programmedBy: 'Programmed by',
      ideaBy: 'Idea by',
      close: 'Close',
      dropBtn: '⏬ Hard Drop'
    },
    de: {
      title: 'TETRIS',
      backHub: 'Zurück zum Game Hub',
      next: 'Nächstes',
      score: 'Punkte',
      level: 'Level',
      lines: 'Reihen',
      start: 'Start / Pause',
      touchLabel: 'Touch-Steuerung',
      on: 'AN',
      off: 'AUS',
      moveKeys: '⬅️ ➡️ : Bewegen',
      downKey: '⬇️ : Schneller fallen',
      rotateKey: '⬆️ : Drehen',
      dropKey: 'Leertaste : Sofort fallen lassen',
      gameOver: 'GAME OVER',
      credits: 'Credits',
      programmedBy: 'Programmiert von',
      ideaBy: 'Idee von',
      close: 'Schließen',
      dropBtn: '⏬ Sofort fallen lassen'
    }
  };

  let currentLang = localStorage.getItem('tetrisLang') || 'it';

  function updateTouchButtonText() {
    const t = translations[currentLang];
    toggleTouchBtn.textContent = `📱 ${t.touchLabel}: ${touchEnabled ? t.on : t.off}`;
  }

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('tetrisLang', lang);
    const t = translations[lang];

    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (t[el.dataset.i18n]) el.textContent = t[el.dataset.i18n];
    });

    document.getElementById('btnDrop').textContent = t.dropBtn;
    updateTouchButtonText();

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
  });

  applyLanguage(currentLang);

  playerReset();
  updateScore();
  update();

});
