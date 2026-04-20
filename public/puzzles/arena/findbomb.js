window.Puzzles = window.Puzzles || {};

window.Puzzles.findbomb = function(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const rounds = data.rounds_data || [];
    let roundIdx = 0, foundCount = 0;

    function renderRound() {
      if(roundIdx >= rounds.length) {
        onComplete({result:{found:foundCount,total:rounds.length},timeMs:Date.now()-startTime});
        return;
      }
      const { grid: cells, size, hint } = rounds[roundIdx];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:.6rem">
          <div style="font-family:var(--font-title);font-size:1.6rem;color:var(--red)">💣 FIND THE BOMB!</div>
          <div style="font-size:.8rem;color:var(--muted)">Round ${roundIdx+1}/${rounds.length} · Hint: ${hint}</div>
          <div id="fb-grid" style="display:grid;grid-template-columns:repeat(${size},1fr);gap:.4rem;width:min(320px,90vw)"></div>
          <div id="fb-msg" style="font-family:var(--font-title);font-size:1.1rem;min-height:1.5rem"></div>
        </div>`;
      const gridEl = container.querySelector('#fb-grid');
      cells.forEach(cell => {
        const btn = document.createElement('button');
        btn.style.cssText='padding:.6rem;font-size:1.4rem;border-radius:6px;cursor:pointer;border:none;background:#333';
        btn.textContent='❓';
        btn.addEventListener('click', () => {
          if(btn.disabled) return;
          btn.disabled = true;
          if(cell.isBomb) {
            btn.textContent='💣'; btn.style.background='#c0392b';
            container.querySelector('#fb-msg').textContent='💥 Found it!';
            foundCount++;
            if(onProgress) onProgress(Math.floor((foundCount/rounds.length)*900));
            roundIdx++;
            setTimeout(renderRound, 700);
          } else {
            btn.textContent = cell.emoji; btn.style.background='#2a2a4a';
            container.querySelector('#fb-msg').textContent='❌ Keep looking…';
          }
        });
        gridEl.appendChild(btn);
      });
    }
    renderRound();
};
