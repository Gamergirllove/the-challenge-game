window.Puzzles = window.Puzzles || {};

window.Puzzles.simonextreme = function(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const { sequence } = data;
    const colorHex = data.colorHex || {RED:'#e74c3c',BLUE:'#3498db',GREEN:'#2ecc71',YELLOW:'#f1c40f',PURPLE:'#9b59b6'};
    const colorEmoji = {RED:'🔴',BLUE:'🔵',GREEN:'🟢',YELLOW:'🟡',PURPLE:'🟣',
                        R:'🔴',G:'🟢',B:'🔵',Y:'🟡',P:'🟣',O:'🟠'};
    const colorLit = {RED:'#ff8888',BLUE:'#88aaff',GREEN:'#88ff88',YELLOW:'#ffff88',PURPLE:'#dd88ff',
                      R:'#ff6b6b',G:'#55ff99',B:'#5dade2',Y:'#ffee55',P:'#c39bd3',O:'#ff9f4a'};
    const colorNames = data.colors || Object.keys(colorHex);
    const COLORS = colorNames.map(name => ({
      id: name,
      label: colorEmoji[name] || name,
      bg: colorHex[name] || '#666',
      lit: colorLit[name] || '#fff',
    }));
    let step = 0, playerIdx = 0, showing = false;

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem">
        <div style="font-family:var(--font-title);font-size:1.6rem;color:var(--gold)">🎮 SIMON EXTREME</div>
        <div id="se-msg" style="font-size:.85rem;color:var(--muted)">Watch the sequence…</div>
        <div id="se-step" style="font-family:var(--font-title);font-size:1rem;color:var(--gold)">ROUND 1 / ${sequence.length}</div>
        <div id="se-btns" style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;width:min(300px,90vw)"></div>
      </div>`;

    const btnsEl = container.querySelector('#se-btns');
    COLORS.forEach(color => {
      const btn = document.createElement('button');
      btn.id = `se-${color.id}`;
      btn.textContent = color.label;
      btn.style.cssText=`font-size:2rem;padding:1rem;border-radius:8px;border:none;cursor:pointer;background:${color.bg};transition:background .1s`;
      btn.addEventListener('click', ()=>{
        if(showing) return;
        if(color.id === sequence[playerIdx]) {
          flash(color.id, true);
          playerIdx++;
          if(playerIdx > step) {
            step++;
            playerIdx = 0;
            if(onProgress) onProgress(Math.floor((step/sequence.length)*900));
            if(step >= sequence.length) {
              onComplete({result:{level:sequence.length},timeMs:Date.now()-startTime});
              return;
            }
            container.querySelector('#se-msg').textContent='✅ Correct! Watch again…';
            container.querySelector('#se-step').textContent=`ROUND ${step+1} / ${sequence.length}`;
            setTimeout(()=>playSequence(), 800);
          }
        } else {
          flash(color.id, false);
          container.querySelector('#se-msg').textContent='❌ Wrong! Watch again…';
          playerIdx = 0;
          setTimeout(()=>playSequence(), 1000);
        }
      });
      btnsEl.appendChild(btn);
    });

    function flash(id, correct) {
      const btn = container.querySelector(`#se-${id}`);
      if(!btn) return;
      const color = COLORS.find(c=>c.id===id);
      btn.style.background = correct ? '#fff' : '#ff0000';
      setTimeout(()=>{ if(btn) btn.style.background = color.bg; }, 200);
    }

    function playSequence() {
      showing = true;
      container.querySelector('#se-msg').textContent='Watch carefully…';
      let i = 0;
      const interval = setInterval(()=>{
        if(i > step) { clearInterval(interval); showing=false; container.querySelector('#se-msg').textContent='Your turn!'; return; }
        const color = COLORS.find(c=>c.id===sequence[i]);
        const btn = container.querySelector(`#se-${sequence[i]}`);
        if(btn) { btn.style.background=color.lit; setTimeout(()=>{ if(btn) btn.style.background=color.bg; }, 350); }
        i++;
      }, 600);
    }

    setTimeout(()=>playSequence(), 500);
};
