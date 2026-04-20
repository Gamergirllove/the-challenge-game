window.Puzzles = window.Puzzles || {};

window.Puzzles.fastfingers = function(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let wi = 0, errors = 0;
    const words = data.words;

    function render() {
      if (wi >= words.length) {
        const ms = Date.now() - startTime;
        onComplete({ result: { words: words.length, errors }, timeMs: ms }); return;
      }
      const w = words[wi];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;max-width:500px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">⌨ FAST FINGERS</div>
          <div style="font-size:.85rem;color:var(--muted)">WORD ${wi+1} / ${words.length}</div>
          <div style="font-family:var(--font-title);font-size:clamp(2rem,8vw,4rem);letter-spacing:.25em;color:var(--text);text-align:center">${w}</div>
          <input id="ff-input" class="word-answer-input" type="text" placeholder="Type it here…" autocomplete="off" autocorrect="off" spellcheck="false" style="text-align:center;font-size:1.5rem"/>
          <div id="ff-feedback" style="font-family:var(--font-title);font-size:1.3rem;min-height:1.5rem"></div>
        </div>`;
      const input = container.querySelector('#ff-input');
      input.focus();
      input.addEventListener('input', () => {
        const val = input.value.trim().toUpperCase();
        if (val === w) {
          input.classList.add('correct');
          const fb = container.querySelector('#ff-feedback');
          if (fb) fb.textContent='✅';
          if (onProgress) onProgress(Math.floor(((wi+1)/words.length)*700));
          wi++;
          setTimeout(render, 300);
        } else if (val.length >= w.length) {
          errors++;
          input.classList.add('wrong');
          setTimeout(()=>{ input.classList.remove('wrong'); input.value=''; }, 400);
        }
      });
    }
    render();
};
