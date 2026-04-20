window.Puzzles = window.Puzzles || {};

window.Puzzles.patternmatch = function(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let round = 0, score = 0;
    const rounds = data.rounds;

    function showPattern() {
      if (round >= rounds.length) {
        onComplete({ result: { score, total: rounds.length }, timeMs: Date.now() - startTime }); return;
      }
      const r = rounds[round];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:420px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">🧩 PATTERN MATCH</div>
          <div style="font-size:.85rem;color:var(--muted);letter-spacing:.15em">ROUND ${round+1}/${rounds.length} — MEMORIZE THIS PATTERN</div>
          <div id="pm-grid" class="pm-grid" style="grid-template-columns:repeat(${r.size},1fr);display:grid;gap:5px"></div>
          <div id="pm-msg" style="font-family:var(--font-title);font-size:1.5rem;color:var(--gold);letter-spacing:.1em"></div>
        </div>`;
      const grid = container.querySelector('#pm-grid');
      r.pattern.forEach(v => {
        const c = document.createElement('div');
        c.style.cssText=`width:60px;height:60px;border-radius:8px;background:${v?r.color:'var(--dark3)'};border:2px solid rgba(255,255,255,.1)`;
        grid.appendChild(c);
      });
      let countdown = 3;
      const msg = container.querySelector('#pm-msg');
      msg.textContent = `Memorize! ${countdown}s`;
      const t = setInterval(() => {
        countdown--;
        if (countdown > 0) { msg.textContent = `Memorize! ${countdown}s`; }
        else { clearInterval(t); askRecreate(r); }
      }, 1000);
    }

    function askRecreate(r) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:420px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">🧩 PATTERN MATCH</div>
          <div style="font-size:.85rem;color:var(--muted);letter-spacing:.15em">CLICK THE CELLS TO RECREATE THE PATTERN</div>
          <div id="pm-input" style="display:grid;grid-template-columns:repeat(${r.size},1fr);gap:5px"></div>
          <button class="btn btn-primary" id="pm-submit" style="width:200px">SUBMIT</button>
          <div id="pm-feedback" style="font-family:var(--font-title);font-size:1.2rem;min-height:1.5rem"></div>
        </div>`;
      const state = new Array(r.size*r.size).fill(false);
      const grid = container.querySelector('#pm-input');
      state.forEach((v,i) => {
        const c = document.createElement('div');
        c.style.cssText=`width:60px;height:60px;border-radius:8px;background:var(--dark3);border:2px solid rgba(255,255,255,.1);cursor:pointer;transition:background .15s`;
        c.dataset.i = i;
        c.addEventListener('click', () => {
          state[i] = !state[i];
          c.style.background = state[i] ? r.color : 'var(--dark3)';
        });
        grid.appendChild(c);
      });
      container.querySelector('#pm-submit').addEventListener('click', () => {
        let correct = 0;
        state.forEach((v,i) => { if(v === r.pattern[i]) correct++; });
        const pct = correct / (r.size*r.size);
        const pts = pct === 1 ? 10 : pct >= 0.8 ? 7 : pct >= 0.6 ? 4 : 0;
        score += pts;
        if (onProgress) onProgress(Math.min(1000, score * 15));
        const fb = container.querySelector('#pm-feedback');
        if (fb) { fb.textContent = pts===10?'🔥 PERFECT!':pts>0?`✅ ${Math.round(pct*100)}% correct (+${pts}pts)`:`❌ Wrong pattern (${Math.round(pct*100)}%)`; fb.style.color=pts>=7?'var(--green)':pts>0?'var(--gold)':'var(--red)'; }
        round++;
        setTimeout(showPattern, 1200);
      });
    }

    showPattern();
};
