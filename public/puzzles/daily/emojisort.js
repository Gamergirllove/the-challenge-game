window.Puzzles = window.Puzzles || {};

window.Puzzles.emojisort = function(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let correct = 0, total = data.items.length;
    const remaining = [...data.items];
    let current = 0;

    function render() {
      if (current >= total) { onComplete({ result:{correct,total}, timeMs:Date.now()-startTime }); return; }
      const item = remaining[current];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;max-width:480px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">🗂 EMOJI SORT</div>
          <div style="font-size:.85rem;color:var(--muted)">ITEM ${current+1} / ${total} — ${correct} CORRECT</div>
          <div style="font-size:5rem;margin:.5rem 0">${item.emoji}</div>
          <div style="font-family:var(--font-title);font-size:1.3rem;color:var(--silver);letter-spacing:.1em">Which category?</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:.6rem;width:100%">
            ${data.categories.map(cat=>`<button class="qa-choice" data-cat="${cat.name}" style="font-size:1.2rem;padding:.8rem">${cat.emoji} ${cat.name}</button>`).join('')}
          </div>
        </div>`;
      container.querySelectorAll('.qa-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = btn.dataset.cat;
          const isRight = chosen === item.category;
          if (isRight) { correct++; btn.classList.add('correct'); }
          else { btn.classList.add('wrong'); container.querySelectorAll('.qa-choice').forEach(b=>{ if(b.dataset.cat===item.category) b.classList.add('correct'); }); }
          container.querySelectorAll('.qa-choice').forEach(b=>b.disabled=true);
          if (onProgress) onProgress(Math.floor((correct/total)*700));
          current++;
          setTimeout(render, isRight?400:900);
        });
      });
    }
    render();
};
