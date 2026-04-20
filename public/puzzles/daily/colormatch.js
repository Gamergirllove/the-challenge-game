window.Puzzles = window.Puzzles || {};

window.Puzzles.colormatch = function(container, data, onComplete, onProgress) {
  const startTime  = Date.now();
  const duration   = data.duration || 60000;
  const TOTAL_PAIRS = 18; // 6 colors × 6 cells = 36 cells = 18 pairs

  // Rich gradient palette — each entry is [gradient, glow color, symbol]
  const COLORS = [
    { bg: 'linear-gradient(135deg,#ff6b6b,#c0392b)', glow: '#ff6b6b', sym: '♦' },
    { bg: 'linear-gradient(135deg,#4fc3f7,#1565c0)', glow: '#4fc3f7', sym: '★' },
    { bg: 'linear-gradient(135deg,#69f0ae,#1b5e20)', glow: '#69f0ae', sym: '●' },
    { bg: 'linear-gradient(135deg,#ffd54f,#e65100)', glow: '#ffd54f', sym: '▲' },
    { bg: 'linear-gradient(135deg,#ce93d8,#6a1b9a)', glow: '#ce93d8', sym: '■' },
    { bg: 'linear-gradient(135deg,#ff9a3c,#bf360c)', glow: '#ff9a3c', sym: '✦' },
  ];

  // Build grid: 6 copies of each color index, shuffled
  let grid = [...(data.grid || [])];
  if (!grid.length) {
    for (let c = 0; c < COLORS.length; c++)
      for (let i = 0; i < 6; i++) grid.push(c);
    grid = grid.sort(() => Math.random() - 0.5);
  }

  let pairs    = 0;
  let selected = -1;
  let locked   = false;
  let done     = false;
  let combo    = 0;
  let lastMatchTime = 0;
  let wrongA   = -1, wrongB = -1, wrongTimer = null;

  // ── Inject CSS once ─────────────────────────────────────
  if (!document.getElementById('cm-styles')) {
    const s = document.createElement('style');
    s.id = 'cm-styles';
    s.textContent = `
      @keyframes cm-pulse {
        0%,100% { transform:scale(1.1);  box-shadow:0 0 14px 4px var(--cg,#fff); }
        50%      { transform:scale(1.18); box-shadow:0 0 28px 8px var(--cg,#fff); }
      }
      @keyframes cm-pop {
        0%   { transform:scale(1);   opacity:1; }
        40%  { transform:scale(1.35);opacity:.9; }
        100% { transform:scale(0);   opacity:0; }
      }
      @keyframes cm-shake {
        0%,100% { transform:translateX(0) scale(1); }
        25%     { transform:translateX(-7px) scale(1.05); }
        75%     { transform:translateX(7px)  scale(1.05); }
      }
      @keyframes cm-cleared {
        0%   { opacity:1; transform:scale(1); }
        100% { opacity:0; transform:scale(.6); }
      }
      @keyframes cm-combo-rise {
        0%   { opacity:1; transform:translate(-50%,-50%) scale(.8); }
        100% { opacity:0; transform:translate(-50%,-80%) scale(1.2); }
      }
      @keyframes cm-bar-pulse {
        0%,100% { opacity:1; }
        50%     { opacity:.5; }
      }
      .cm-cell {
        height: 48px;
        border-radius: 11px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.15rem;
        font-weight: 700;
        color: rgba(255,255,255,.7);
        text-shadow: 0 1px 3px rgba(0,0,0,.5);
        transition: transform .1s, box-shadow .1s;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      .cm-cell::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,.28) 0%, transparent 55%);
        border-radius: 11px;
        pointer-events: none;
      }
      .cm-cell:not(.cm-cleared):not(.cm-matched):hover { transform: scale(1.07); }
      .cm-cell.cm-selected { animation: cm-pulse .55s ease-in-out infinite; }
      .cm-cell.cm-matched  { animation: cm-pop   .38s ease-out   forwards; pointer-events:none; }
      .cm-cell.cm-wrong    { animation: cm-shake .38s ease-in-out; }
      .cm-cell.cm-cleared  { background: rgba(255,255,255,.04) !important;
                              cursor: default; pointer-events: none;
                              box-shadow: none !important; color: transparent; }
      .cm-combo {
        position: absolute;
        top: 50%; left: 50%;
        font-family: var(--font-title);
        font-size: 1.5rem;
        color: var(--gold);
        text-shadow: 0 0 12px rgba(241,196,15,.8);
        pointer-events: none;
        white-space: nowrap;
        z-index: 30;
        animation: cm-combo-rise .75s ease-out forwards;
      }
      .cm-timer-bar { transition: width 1s linear, background .6s ease; }
      .cm-timer-bar.cm-urgent { animation: cm-bar-pulse .45s ease-in-out infinite; }
    `;
    document.head.appendChild(s);
  }

  // ── Build skeleton HTML ──────────────────────────────────
  container.innerHTML = `
    <div style="
      display:flex;flex-direction:column;align-items:center;gap:.55rem;
      width:100%;max-width:360px;
      padding:.5rem;border-radius:16px;
      background:rgba(10,10,20,.6);
      backdrop-filter:blur(6px);
      border:1px solid rgba(255,255,255,.07);
    ">
      <div style="font-family:var(--font-title);font-size:1.75rem;color:var(--gold);
                  letter-spacing:.15em;text-shadow:0 0 18px rgba(241,196,15,.35)">
        🎨 COLOR MATCH
      </div>

      <!-- HUD row -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;width:100%;padding:0 2px">
        <div style="line-height:1.1">
          <div style="font-size:.65rem;color:var(--muted);letter-spacing:.15em">TIME</div>
          <div id="cm-timer-val" style="font-family:var(--font-title);font-size:1.5rem;color:#69f0ae"></div>
        </div>
        <div style="text-align:center;line-height:1.1">
          <div style="font-size:.65rem;color:var(--muted);letter-spacing:.15em">PAIRS</div>
          <div style="font-family:var(--font-title);font-size:1.5rem">
            <span id="cm-pairs-val" style="color:#69f0ae">0</span>
            <span style="color:var(--muted);font-size:.9rem"> / ${TOTAL_PAIRS}</span>
          </div>
        </div>
        <div style="text-align:right;line-height:1.1">
          <div style="font-size:.65rem;color:var(--muted);letter-spacing:.15em">COMBO</div>
          <div id="cm-combo-val" style="font-family:var(--font-title);font-size:1.5rem;color:var(--gold)">—</div>
        </div>
      </div>

      <!-- Timer bar -->
      <div style="width:100%;height:5px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden">
        <div id="cm-timer-bar" class="cm-timer-bar"
             style="height:100%;width:100%;background:#69f0ae;border-radius:3px"></div>
      </div>

      <!-- Grid -->
      <div id="cm-grid"
           style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;width:100%;position:relative">
      </div>

      <div style="font-size:.7rem;color:var(--muted);letter-spacing:.1em">TAP TWO MATCHING COLORS</div>
    </div>`;

  // ── Render grid cells ────────────────────────────────────
  function renderGrid() {
    const gridEl = container.querySelector('#cm-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';
    grid.forEach((colorIdx, i) => {
      const cell = document.createElement('div');
      if (colorIdx === -1) {
        cell.className = 'cm-cell cm-cleared';
      } else {
        const c = COLORS[colorIdx];
        cell.className = 'cm-cell' +
          (i === selected          ? ' cm-selected' : '') +
          (i === wrongA || i === wrongB ? ' cm-wrong'    : '');
        cell.style.cssText = `background:${c.bg};--cg:${c.glow};` +
          `box-shadow:${i === selected
            ? `0 0 18px 5px ${c.glow}`
            : `0 3px 10px rgba(0,0,0,.45)`};`;
        cell.textContent = c.sym;
        cell.addEventListener('click', () => handleClick(i));
      }
      gridEl.appendChild(cell);
    });
  }

  // ── Update HUD only (no grid recreate) ──────────────────
  function updateHUD() {
    const elapsed   = Date.now() - startTime;
    const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
    const pct       = Math.max(0, (duration - elapsed) / duration);
    const color     = pct > 0.5 ? '#69f0ae' : pct > 0.25 ? '#ffd54f' : '#ff6b6b';

    const timerVal = container.querySelector('#cm-timer-val');
    const timerBar = container.querySelector('#cm-timer-bar');
    const pairsVal = container.querySelector('#cm-pairs-val');
    const comboVal = container.querySelector('#cm-combo-val');

    if (timerVal) { timerVal.textContent = remaining + 's'; timerVal.style.color = color; }
    if (timerBar) {
      timerBar.style.width      = (pct * 100) + '%';
      timerBar.style.background = color;
      timerBar.classList.toggle('cm-urgent', pct < 0.25);
    }
    if (pairsVal) { pairsVal.textContent = pairs; pairsVal.style.color = color; }
    if (comboVal) {
      comboVal.textContent = combo >= 2 ? combo + 'x' : '—';
      comboVal.style.color = combo >= 3 ? '#ff6b6b' : combo >= 2 ? 'var(--gold)' : 'var(--muted)';
    }
  }

  // ── Click handler ────────────────────────────────────────
  function handleClick(i) {
    if (locked || done || grid[i] === -1) return;

    if (selected === -1) {
      selected = i;
      renderGrid();
      return;
    }
    if (selected === i) {
      selected = -1;
      renderGrid();
      return;
    }

    if (grid[i] === grid[selected]) {
      // ✅ Match
      const a = selected, b = i;
      selected = -1;
      locked   = true;

      const cells = container.querySelector('#cm-grid')?.children;
      if (cells) {
        cells[a]?.classList.add('cm-matched');
        cells[b]?.classList.add('cm-matched');
      }

      grid[a] = -1;
      grid[b] = -1;
      pairs++;

      const now = Date.now();
      combo = (now - lastMatchTime < 2000) ? combo + 1 : 1;
      lastMatchTime = now;

      if (onProgress) onProgress(Math.min(900, Math.round(pairs / TOTAL_PAIRS * 900)));

      // Combo popup
      if (combo >= 2) {
        const gridEl = container.querySelector('#cm-grid');
        if (gridEl) {
          const pop = document.createElement('div');
          pop.className = 'cm-combo';
          pop.textContent = combo >= 4 ? `🔥 ${combo}x INSANE!` :
                            combo >= 3 ? `⚡ ${combo}x HOT!`    : `✨ ${combo}x COMBO!`;
          gridEl.appendChild(pop);
          setTimeout(() => pop.remove(), 750);
        }
      }

      setTimeout(() => {
        locked = false;
        renderGrid();
        updateHUD();
        if (grid.every(c => c === -1)) {
          done = true;
          onComplete({ result: { pairs }, timeMs: Date.now() - startTime });
        }
      }, 380);

    } else {
      // ❌ Wrong
      const prev = selected;
      selected = -1;
      combo    = 0;
      wrongA   = prev;
      wrongB   = i;
      renderGrid();
      if (wrongTimer) clearTimeout(wrongTimer);
      wrongTimer = setTimeout(() => {
        wrongA = -1; wrongB = -1;
        renderGrid();
      }, 420);
    }

    updateHUD();
  }

  // ── Boot ─────────────────────────────────────────────────
  renderGrid();
  updateHUD();

  const tick = setInterval(() => { if (!done) updateHUD(); }, 250);

  setTimeout(() => {
    clearInterval(tick);
    if (!done) { done = true; onComplete({ result: { pairs }, timeMs: Date.now() - startTime }); }
  }, duration);
};
