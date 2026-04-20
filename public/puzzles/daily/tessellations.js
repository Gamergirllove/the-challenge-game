window.Puzzles = window.Puzzles || {};

window.Puzzles.tessellations = function(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let correct = 0;
    const total = data.hidden.length;
    const hiddenSet = new Set(data.hidden.map(([r,c])=>`${r},${c}`));
    const userGrid = {};
    let selectedColor = null;

    function render() {
      container.innerHTML = `
        <div class="tess-container anim-fade-in">
          <div class="tess-header">
            <div class="tess-title">🔷 TESSELLATIONS</div>
            <div class="tess-sub">Spot the pattern — fill in the missing tiles!</div>
            <div class="tess-progress" id="tess-prog">${correct} / ${total} filled</div>
          </div>
          <div class="tess-grid" id="tess-grid" style="grid-template-columns:repeat(${data.size},1fr)"></div>
          <div class="tess-palette" id="tess-palette">
            ${data.colors.map((c,i)=>`<button class="tess-color-btn" data-idx="${i}" style="background:${c}"></button>`).join('')}
          </div>
          <div class="tess-hint">1️⃣ SELECT A COLOR &nbsp; 2️⃣ CLICK A ? TILE</div>
        </div>`;

      const grid = container.querySelector('#tess-grid');
      for (let r=0; r<data.size; r++) {
        for (let c=0; c<data.size; c++) {
          const cell = document.createElement('div');
          cell.className = 'tess-cell';
          cell.dataset.r = r; cell.dataset.c = c;
          const key = `${r},${c}`;
          if (hiddenSet.has(key) && userGrid[key] === undefined) {
            cell.classList.add('hidden'); cell.textContent = '?';
          } else {
            const idx = userGrid[key] !== undefined ? userGrid[key] : data.grid[r][c];
            cell.style.background = data.colors[idx];
          }
          grid.appendChild(cell);
        }
      }

      container.querySelectorAll('.tess-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedColor = Number(btn.dataset.idx);
          container.querySelectorAll('.tess-color-btn').forEach(b=>b.classList.remove('selected'));
          btn.classList.add('selected');
        });
      });

      grid.addEventListener('click', e => {
        const cell = e.target.closest('.tess-cell');
        if (!cell || !cell.classList.contains('hidden')) return;
        if (selectedColor === null) { cell.classList.add('wrong-flash'); return; }
        const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
        const key = `${r},${c}`;
        const answer = data.grid[r][c];
        if (selectedColor === answer) {
          userGrid[key] = selectedColor;
          cell.classList.remove('hidden'); cell.classList.add('correct-fill');
          cell.style.background = data.colors[selectedColor]; cell.textContent = '';
          correct++;
          container.querySelector('#tess-prog').textContent = `${correct} / ${total} filled`;
          if (onProgress) onProgress(Math.floor((correct/total)*700));
          if (correct === total) setTimeout(()=>onComplete({result:{correct,total},timeMs:Date.now()-startTime}),400);
        } else {
          cell.classList.add('wrong-flash');
          setTimeout(()=>cell.classList.remove('wrong-flash'),400);
        }
      });
    }
    render();
};
