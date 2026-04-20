window.Puzzles = window.Puzzles || {};

window.Puzzles.gridlock = function(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const GRID = data.gridSize || 6;
    const EXIT_ROW = data.exitRow !== undefined ? data.exitRow : 2;
    let moves = 0;
    let selected = null;
    let cars = JSON.parse(JSON.stringify(data.cars));

    const CAR_COLORS = ['#e8192c','#3498db','#2ecc71','#9b59b6','#e67e22','#1abc9c','#e74c3c','#f39c12'];
    function carColor(car) { return car.target ? '#e8192c' : CAR_COLORS[1 + (car.id % (CAR_COLORS.length-1))]; }

    function occupied() {
      const o = {};
      cars.forEach(c => {
        for (let i = 0; i < c.len; i++) {
          const r = c.h ? c.row : c.row + i;
          const col = c.h ? c.col + i : c.col;
          o[r + '_' + col] = c.id;
        }
      });
      return o;
    }

    function maxMove(car, dir) {
      const occ = occupied();
      let steps = 0;
      for (let s = 1; s <= GRID; s++) {
        let r, col;
        if (car.h) { r = car.row; col = dir > 0 ? car.col + car.len - 1 + s : car.col - s; }
        else       { col = car.col; r = dir > 0 ? car.row + car.len - 1 + s : car.row - s; }
        if (r < 0 || r >= GRID || col < 0 || col >= GRID) break;
        if (occ[r + '_' + col] !== undefined) break;
        steps = s;
      }
      return steps;
    }

    function doMove(car, dir, steps) {
      if (car.h) car.col += dir * steps;
      else       car.row += dir * steps;
      moves += steps;
      if (onProgress) onProgress(Math.min(900, moves * 20));
      checkWin();
      render();
    }

    function checkWin() {
      const t = cars.find(c => c.target);
      if (t && t.h && t.row === EXIT_ROW && t.col + t.len - 1 >= GRID - 1) {
        setTimeout(() => onComplete({ result:{ solved:true, moves }, timeMs:Date.now()-startTime }), 350);
      }
    }

    function render() {
      const maxW = Math.min(container.clientWidth || 360, 380) - 16;
      const CELL = Math.floor((maxW - 8) / GRID);
      const GAP  = 3;
      const BOARD = CELL * GRID + GAP * (GRID - 1);

      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:.6rem;width:100%;padding:.4rem 0">
          <div style="font-family:var(--font-title);font-size:1.6rem;color:var(--gold);letter-spacing:.1em">🚗 RUSH HOUR</div>
          <div style="font-size:.78rem;color:var(--muted);text-align:center;max-width:340px">Slide cars to free the <span style="color:#e8192c;font-weight:700">🔴 red car</span> — get it to the right exit →</div>
          <div style="font-size:.85rem">Moves: <span id="rh-moves" style="color:var(--gold);font-family:var(--font-title)">${moves}</span></div>
          <div style="position:relative" id="rh-wrap">
            <div id="rh-board" style="
              position:relative;
              width:${BOARD}px;height:${BOARD}px;
              background:#1a1a2e;
              border:2px solid #2a2a4a;
              border-radius:8px;
              overflow:visible;
              flex-shrink:0;
            "></div>
            <div style="
              position:absolute;
              right:-22px;
              top:${EXIT_ROW*(CELL+GAP) + Math.floor(CELL/2) - 10}px;
              font-size:1.2rem;color:var(--gold);line-height:1
            ">→</div>
          </div>
          <div id="rh-ctrl" style="display:flex;gap:.5rem;align-items:center;min-height:2.2rem;flex-wrap:wrap;justify-content:center"></div>
          <div id="rh-hint" style="font-size:.75rem;color:var(--muted)">Tap a car to select it</div>
        </div>`;

      const board = container.querySelector('#rh-board');

      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const cell = document.createElement('div');
          cell.style.cssText = `position:absolute;
            left:${c*(CELL+GAP)}px;top:${r*(CELL+GAP)}px;
            width:${CELL}px;height:${CELL}px;
            background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);
            border-radius:3px;`;
          board.appendChild(cell);
        }
      }

      cars.forEach(car => {
        const w = car.h ? car.len * CELL + (car.len-1) * GAP : CELL;
        const h = car.h ? CELL : car.len * CELL + (car.len-1) * GAP;
        const x = car.col * (CELL + GAP);
        const y = car.row * (CELL + GAP);
        const isSel = selected === car.id;
        const bg = carColor(car);

        const div = document.createElement('div');
        div.style.cssText = `
          position:absolute;left:${x}px;top:${y}px;
          width:${w}px;height:${h}px;
          background:${bg};
          border:2.5px solid ${isSel ? '#fff' : 'rgba(0,0,0,.35)'};
          border-radius:7px;
          cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          font-size:${CELL > 44 ? '1.2rem' : '1rem'};
          box-shadow:${isSel ? `0 0 0 3px white, 0 0 18px ${bg}99` : `inset 0 2px 0 rgba(255,255,255,.2),0 3px 6px rgba(0,0,0,.5)`};
          transition:box-shadow .12s;
          user-select:none;z-index:2;
        `;
        div.textContent = car.target ? '🔴' : (car.h ? '🚙' : '🚌');
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          selected = (selected === car.id) ? null : car.id;
          render();
        });
        board.appendChild(div);
      });

      board.addEventListener('click', () => { selected = null; render(); });

      renderControls(CELL);
    }

    function renderControls(CELL) {
      const ctrl = container.querySelector('#rh-ctrl');
      const hint = container.querySelector('#rh-hint');
      if (!ctrl) return;
      ctrl.innerHTML = '';
      if (selected === null) { if(hint) hint.textContent = 'Tap a car to select it'; return; }
      const car = cars.find(c => c.id === selected);
      if (!car) return;
      if (hint) hint.textContent = `Moving: ${car.target ? '🔴 RED CAR' : (car.h ? '→ horizontal' : '↕ vertical')}`;

      const dirs = car.h
        ? [{ dir:-1, icon:'◀', label:'LEFT'  }, { dir:+1, icon:'▶', label:'RIGHT' }]
        : [{ dir:-1, icon:'▲', label:'UP'    }, { dir:+1, icon:'▼', label:'DOWN'  }];

      dirs.forEach(({ dir, icon, label }) => {
        const steps = maxMove(car, dir);
        if (steps === 0) {
          const btn = document.createElement('button');
          btn.className = 'btn btn-secondary';
          btn.style.cssText = 'font-size:.8rem;padding:.3rem .7rem;opacity:.25;cursor:default';
          btn.textContent = `${icon} ${label}`;
          btn.disabled = true;
          ctrl.appendChild(btn);
        } else {
          for (let s = 1; s <= steps; s++) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.style.cssText = `font-size:.8rem;padding:.3rem .7rem`;
            btn.textContent = s === 1 ? `${icon}` : `${icon}${s}`;
            btn.title = `Move ${label} ${s} step${s>1?'s':''}`;
            const _s = s, _dir = dir, _car = car;
            btn.addEventListener('click', () => { doMove(_car, _dir, _s); });
            ctrl.appendChild(btn);
          }
        }
      });
    }

    render();
};
