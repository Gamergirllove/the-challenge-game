window.Puzzles = window.Puzzles || {};

window.Puzzles.tapfrenzy = function(container, data, onComplete, onProgress) {
    const SECS = 10;
    let taps = 0, timeLeft = SECS, interval = null, started = false, done = false;

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;width:100%;padding:1rem">
        <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">👆 TAP FRENZY</div>
        <div style="font-family:var(--font-title);font-size:1.2rem;color:var(--muted);letter-spacing:.15em">TAP AS FAST AS YOU CAN!</div>
        <div style="font-family:var(--font-title);font-size:1.4rem">TIME: <span id="tf-time" style="color:var(--red)">${SECS}s</span></div>
        <div id="tf-count" style="font-family:var(--font-title);font-size:6rem;color:var(--gold);line-height:1">0</div>
        <button id="tf-btn" style="
          width:220px;height:220px;border-radius:50%;
          background:radial-gradient(circle,var(--red),#800010);
          border:4px solid rgba(255,255,255,.2);
          font-family:var(--font-title);font-size:2.2rem;letter-spacing:.1em;
          color:#fff;cursor:pointer;user-select:none;touch-action:manipulation;
          box-shadow:0 0 30px rgba(232,25,44,.5);
          -webkit-tap-highlight-color:transparent;
        ">TAP!</button>
        <div id="tf-result" style="font-size:.9rem;color:var(--muted);letter-spacing:.1em;min-height:1.2em"></div>
      </div>`;

    const btn = container.querySelector('#tf-btn');
    const countEl = container.querySelector('#tf-count');
    const timeEl = container.querySelector('#tf-time');
    const resultEl = container.querySelector('#tf-result');

    function finish() {
        done = true;
        clearInterval(interval);
        btn.disabled = true;
        btn.style.opacity = '.45';
        const tps = (taps / SECS).toFixed(1);
        resultEl.textContent = `${taps} TAPS · ${tps}/sec`;
        onComplete({ result: { taps }, timeMs: SECS * 1000 });
    }

    function startTimer() {
        started = true;
        btn.style.background = 'radial-gradient(circle,#ff4444,#cc0000)';
        interval = setInterval(() => {
            timeLeft--;
            timeEl.textContent = `${timeLeft}s`;
            if (timeLeft <= 3) timeEl.style.color = 'var(--gold)';
            if (timeLeft <= 0) finish();
        }, 1000);
    }

    btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (done) return;
        if (!started) startTimer();
        taps++;
        countEl.textContent = taps;
        btn.style.transform = 'scale(.93)';
        btn.style.filter = 'brightness(1.35)';
        if (onProgress) onProgress(Math.min(1000, taps * 8));
        setTimeout(() => { btn.style.transform = 'scale(1)'; btn.style.filter = 'brightness(1)'; }, 70);
    });
};
