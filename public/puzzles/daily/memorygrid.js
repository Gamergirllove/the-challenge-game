window.Puzzles = window.Puzzles || {};

window.Puzzles.memorygrid = function(container, data, onComplete, onProgress) {
  const SIZE     = data.size    || 4;
  const SHOW_MS  = data.showMs  || 6000;
  const COLORS   = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6'];
  const TOTAL    = SIZE * SIZE;

  // Build a random solution grid
  const solution = Array.from({ length: TOTAL }, () =>
    Math.floor(Math.random() * COLORS.length)
  );
  const playerGrid = Array(TOTAL).fill(-1);

  let phase = 'memorize'; // memorize | recall | done
  let selectedColor = 0;
  let startTime;
  let countInterval;

  const style = document.createElement('style');
  style.textContent = `
    .mg-wrap{display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:1rem;
      font-family:var(--font-title);}
    .mg-title{font-size:1.1rem;letter-spacing:.2em;color:var(--gold);}
    .mg-timer{font-size:2.2rem;letter-spacing:.1em;color:var(--text);}
    .mg-sub{font-size:.75rem;letter-spacing:.2em;color:var(--muted);}
    .mg-grid{display:grid;grid-template-columns:repeat(${SIZE},1fr);gap:4px;
      width:min(280px,85vw);aspect-ratio:1;}
    .mg-cell{border-radius:6px;cursor:pointer;border:2px solid rgba(255,255,255,.08);
      transition:transform .1s,border-color .15s;aspect-ratio:1;}
    .mg-cell:active{transform:scale(.92);}
    .mg-cell.empty{background:#1a1a2e;}
    .mg-cell.selected-border{border-color:rgba(255,255,255,.7)!important;}
    .mg-cell.correct-flash{animation:mg-ok .35s ease-out;}
    .mg-cell.wrong-flash{animation:mg-err .35s ease-out;}
    @keyframes mg-ok{0%,100%{box-shadow:none}50%{box-shadow:0 0 14px 4px #2ecc71}}
    @keyframes mg-err{0%,100%{box-shadow:none}50%{box-shadow:0 0 14px 4px #e74c3c}}
    .mg-palette{display:flex;gap:.5rem;}
    .mg-swatch{width:38px;height:38px;border-radius:8px;cursor:pointer;border:3px solid transparent;
      transition:border-color .15s,transform .1s;}
    .mg-swatch:active{transform:scale(.9);}
    .mg-swatch.active{border-color:#fff;}
    .mg-action{font-size:.75rem;letter-spacing:.15em;color:var(--muted);}
    .mg-submit{margin-top:.25rem;}
  `;
  function render() {
    if (phase === 'memorize') {
      container.innerHTML = `
        <div class="mg-wrap">
          <div class="mg-title">MEMORIZE THE GRID</div>
          <div class="mg-timer" id="mg-timer">${Math.ceil(SHOW_MS/1000)}</div>
          <div class="mg-sub">IT DISAPPEARS IN A MOMENT</div>
          <div class="mg-grid" id="mg-grid"></div>
        </div>`;
      container.insertBefore(style, container.firstChild);
      renderGrid(true);
      startMemorize();
    } else {
      container.innerHTML = `
        <div class="mg-wrap">
          <div class="mg-title" id="mg-title">RECREATE THE GRID</div>
          <div class="mg-sub" id="mg-sub">TAP A COLOR · TAP A CELL</div>
          <div class="mg-grid" id="mg-grid"></div>
          <div class="mg-palette" id="mg-palette"></div>
          <button class="btn btn-primary mg-submit" id="mg-submit">SUBMIT ✓</button>
        </div>`;
      container.insertBefore(style, container.firstChild);
      renderGrid(false);
      renderPalette();
      container.querySelector('#mg-submit').addEventListener('click', submitAnswer);
    }
  }

  function renderGrid(showColors) {
    const grid = container.querySelector('#mg-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
      const cell = document.createElement('div');
      cell.className = 'mg-cell';
      if (showColors) {
        cell.style.background = COLORS[solution[i]];
        cell.style.borderColor = 'rgba(255,255,255,.15)';
      } else {
        cell.style.background = playerGrid[i] >= 0 ? COLORS[playerGrid[i]] : '#1a1a2e';
        cell.style.borderColor = playerGrid[i] >= 0 ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)';
      }
      if (!showColors) {
        cell.addEventListener('pointerdown', e => { e.preventDefault(); paintCell(i); });
      }
      grid.appendChild(cell);
    }
  }

  function renderPalette() {
    const pal = container.querySelector('#mg-palette');
    if (!pal) return;
    pal.innerHTML = '';
    COLORS.forEach((c, i) => {
      const sw = document.createElement('div');
      sw.className = 'mg-swatch' + (i === selectedColor ? ' active' : '');
      sw.style.background = c;
      sw.addEventListener('pointerdown', e => {
        e.preventDefault();
        selectedColor = i;
        renderPalette();
      });
      pal.appendChild(sw);
    });
  }

  function paintCell(idx) {
    playerGrid[idx] = selectedColor;
    const cells = container.querySelectorAll('.mg-cell');
    if (cells[idx]) {
      cells[idx].style.background = COLORS[selectedColor];
      cells[idx].style.borderColor = 'rgba(255,255,255,.15)';
    }
    const filled = playerGrid.filter(v => v >= 0).length;
    if (onProgress) onProgress(Math.floor((filled / TOTAL) * 600));
  }

  function startMemorize() {
    let remaining = Math.ceil(SHOW_MS / 1000);
    countInterval = setInterval(() => {
      remaining--;
      const el = container.querySelector('#mg-timer');
      if (el) el.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(countInterval);
        phase = 'recall';
        startTime = Date.now();
        render();
      }
    }, 1000);
  }

  function submitAnswer() {
    const timeMs = Date.now() - startTime;
    let correct = 0;
    const cells  = container.querySelectorAll('.mg-cell');

    for (let i = 0; i < TOTAL; i++) {
      const ok = playerGrid[i] === solution[i];
      if (ok) correct++;
      if (cells[i]) {
        cells[i].classList.add(ok ? 'correct-flash' : 'wrong-flash');
        cells[i].style.background = COLORS[solution[i]]; // reveal truth
      }
    }

    const pct = Math.round((correct / TOTAL) * 100);
    const titleEl = container.querySelector('#mg-title');
    const subEl   = container.querySelector('#mg-sub');
    if (titleEl) titleEl.textContent = `${pct}% CORRECT`;
    if (subEl)   subEl.textContent   = `${correct} / ${TOTAL} CELLS`;
    const btn = container.querySelector('#mg-submit');
    if (btn) btn.style.display = 'none';

    setTimeout(() => onComplete({ result: { correct, total: TOTAL }, timeMs }), 1800);
  