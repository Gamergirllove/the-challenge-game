window.Puzzles = window.Puzzles || {};

window.Puzzles.memory = function(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let flipped = [], matched = 0, locked = false;
    const cards = data.cards.map(c => ({ ...c, isFlipped: false, isMatched: false }));
    container.innerHTML = `
      <div class="memory-grid" id="mem-grid"></div>
      <div style="margin-top:1rem;font-size:.9rem;color:var(--muted);letter-spacing:.15em">MATCHED: <span id="mem-matched">0</span> / ${data.pairs}</div>`;
    const grid = container.querySelector('#mem-grid');
    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'mem-card';
      el.dataset.idx = i;
      el.innerHTML = `<span class="mem-card-back">❓</span><span class="mem-card-face">${card.emoji}</span>`;
      el.addEventListener('click', () => flip(i, el));
      grid.appendChild(el);
    });
    function flip(i, el) {
      const card = cards[i];
      if (locked || card.isFlipped || card.isMatched) return;
      card.isFlipped = true; el.classList.add('flipped');
      flipped.push({ i, el });
      if (flipped.length === 2) {
        locked = true;
        const [a, b] = flipped;
        if (cards[a.i].emoji === cards[b.i].emoji) {
          cards[a.i].isMatched = cards[b.i].isMatched = true;
          a.el.classList.add('matched'); b.el.classList.add('matched');
          matched++;
          container.querySelector('#mem-matched').textContent = matched;
          if (onProgress) onProgress(Math.floor((matched / data.pairs) * 900));
          flipped = []; locked = false;
          if (matched === data.pairs) onComplete({ result: {}, timeMs: Date.now() - startTime });
        } else {
          setTimeout(() => {
            cards[a.i].isFlipped = cards[b.i].isFlipped = false;
            a.el.classList.remove('flipped'); b.el.classList.remove('flipped');
            flipped = []; locked = false;
          }, 900);
        }
      }
    }
};
