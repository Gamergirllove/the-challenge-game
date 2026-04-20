window.Puzzles = window.Puzzles || {};

window.Puzzles.tapfrenzy = function(container, data, onComplete, onProgress) {
    const gameSecs = data.timeLimit || 30; let taps = 0, running = false, timeLeft = gameSecs, interval = null;
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;width:100%;max-width:420px">
        <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">👆 TAP FRENZY</div>
        <div style="font-size:.9rem;color:var(--muted);letter-spacing:.15em">TAP AS FAST AS YOU CAN!</div>
        <div style="font-family:var(--font-title);font-size:1.4rem;color:var(--text)">TIME: <span id="tf-time" style="color:var(--red)">${timeLeft}s</span></div>
        <div id="tf-count" style="font-family:var(--font-title);font-size:5rem;color:var(--gold);line-height:1">0</div>
        <button id="tf-btn" style="
          width:200px;height:200px;border-radius:50%;
          background:radial-gradient(circle,var(--red),#800010);
          border:4px solid rgba(255,255,255,.2);
          font-family:var(--font-title);font-size:2rem;letter-spacing:.1em;
          color:#fff;cursor:pointer;user-select:none;
          box-shadow:0 0 30px rgba(232,25,44,.5);
          transition:transform .05s,filter .05s;
          -webkit-tap-highlight-color:transparent;
        ">TAP!</button>
        <div id="tf-result" style="font-size:.9rem;color:var(--muted);letter-spacing:.1em;min-height:1.2em"></div>
      </div>`;

    const btn = container.querySelector('#tf-btn');
    const countEl = container.querySelector('#tf-count');
    const timeEl = container.querySelector('#tf-time');
    const resultEl = container.querySelector('#tf-result');

    function startGame() {
      running = true;
      btn.style.background = 'radial-gradient(circle,#ff4444,#cc0000)';
      interval = setInterval(() => {
        timeLeft--;
        if (timeEl) timeEl.textContent = `${timeLeft}s`;
        if (timeLeft <= 5 && timeEl) timeEl.style.color = 'var(--gold)';
        if (timeLeft <= 0) {
          clearInterval(interval);
          running = false;
          btn.disabled = true;
          btn.style.opacity = '.5';
          const tps = (taps / gameSecs).toFixed(1);
          if (resultEl) resultEl.textContent = `${taps} taps · ${tps} per second`;
          onComplete({ result: { taps }, timeMs: gameSecs * 1000 });
        }
      }, 1000);
    }

    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!running) { startGame(); }
      if (!running) return;
      taps++;
      countEl.textContent = taps;
      btn.style.transform = 'scale(.94)';
      btn.style.filter = 'brightness(1.3)';
      if (onProgress) onProgress(Math.min(1000, taps * 8));
      setTimeout(() => { btn.style.transform='scale(1)'; btn.style.filter='brightness(1)'; }, 80);
    });
};
