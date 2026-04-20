window.Puzzles = window.Puzzles || {};

window.Puzzles.reaction = function(container, data, onComplete, onProgress) {
    const times = [];
    let round = 0, waiting = false, waitTimer = null, showTime = null;
    function render() {
      container.innerHTML = `
        <div class="reaction-container">
          <div class="reaction-info">ROUND ${round+1} OF ${data.rounds} — CLICK WHEN RED!</div>
          <div class="reaction-zone waiting" id="rzone"><span>GET READY…</span></div>
          <div class="reaction-times" id="rtimes"></div>
        </div>`;
      startRound();
    }
    function startRound() {
      const zone = container.querySelector('#rzone'); if (!zone) return;
      zone.className = 'reaction-zone waiting'; zone.innerHTML = '<span>⏳ WAIT…</span>';
      waiting = true;
      const delay = data.delays[round] || (Math.random()*3000+1500);
      waitTimer = setTimeout(() => {
        if (!container.querySelector('#rzone')) return;
        const z = container.querySelector('#rzone');
        z.className = 'reaction-zone ready'; z.innerHTML = '<span>⚡ CLICK NOW!</span>';
        waiting = false; showTime = Date.now();
      }, delay);
      zone.addEventListener('click', handleClick, { once: true });
    }
    function handleClick() {
      if (waiting) {
        clearTimeout(waitTimer);
        const zone = container.querySelector('#rzone');
        if (zone) { zone.className = 'reaction-zone clicked-early'; zone.innerHTML = '<span>TOO EARLY! Penalty</span>'; }
        times.push(999); updateTimes();
        setTimeout(() => { round++; if (round < data.rounds) render(); else finish(); }, 1000);
        return;
      }
      const ms = Date.now() - showTime;
      times.push(ms);
      const zone = container.querySelector('#rzone');
      if (zone) { zone.className = 'reaction-zone result'; zone.innerHTML = `<span>⚡ ${ms}ms</span><span style="font-size:1rem;color:var(--muted)">${ratingLabel(ms)}</span>`; }
      updateTimes();
      const valid = times.filter(t=>t!==999);
      const avg = valid.length ? Math.round(valid.reduce((a,b)=>a+b,0)/valid.length) : 999;
      if (onProgress) onProgress(Math.max(0, Math.min(1000, 1000 - Math.floor(avg/3))));
      round++;
      setTimeout(() => { if (round < data.rounds) render(); else finish(); }, 800);
    }
    function updateTimes() {
      const el = container.querySelector('#rtimes'); if (!el) return;
      el.innerHTML = times.map((t,i)=>`<span class="reaction-chip">R${i+1}: ${t===999?'EARLY':t+'ms'}</span>`).join('');
    }
    function ratingLabel(ms) {
      if (ms < 200) return '🔥 LIGHTNING!'; if (ms < 300) return '⚡ FAST'; if (ms < 450) return '👍 GOOD'; if (ms < 600) return '😐 OK'; return '🐢 SLOW';
    }
    function finish() {
      const valid = times.filter(t=>t!==999);
      const avg = valid.length ? Math.round(valid.reduce((a,b)=>a+b,0)/valid.length) : 999;
      onComplete({ result: { avgMs: avg }, timeMs: avg });
    }
    render();
};
