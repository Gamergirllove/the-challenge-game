window.Puzzles = window.Puzzles || {};

window.Puzzles.numberhunt = function(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let nextNum = 1;
    const total = 16;
    container.innerHTML = `
      <div class="hunt-container anim-fade-in">
        <div class="hunt-header">
          <div class="hunt-title">🎯 NUMBER HUNT</div>
          <div class="hunt-sub">Click 1 → 16 in order as fast as possible!</div>
          <div class="hunt-next">FIND: <span id="hunt-next">${nextNum}</span></div>
        </div>
        <div class="hunt-grid" id="hunt-grid">
          ${data.nums.map(n=>`<button class="hunt-btn" data-num="${n}">${n}</button>`).join('')}
        </div>
        <div class="hunt-progress" id="hunt-prog">0 / ${total} found</div>
      </div>`;
    container.querySelector('#hunt-grid').addEventListener('click', e => {
      const btn = e.target.closest('.hunt-btn');
      if (!btn || btn.disabled) return;
      const num = Number(btn.dataset.num);
      if (num === nextNum) {
        btn.classList.add('found'); btn.disabled = true;
        nextNum++;
        const el = container.querySelector('#hunt-next');
        if (el) el.textContent = nextNum <= total ? nextNum : 'DONE!';
        container.querySelector('#hunt-prog').textContent = `${nextNum-1} / ${total} found`;
        if (onProgress) onProgress(Math.floor(((nextNum-1)/total)*900));
        if (nextNum > total) onComplete({ result:{}, timeMs: Date.now()-startTime });
      } else {
        btn.classList.add('wrong-flash');
        setTimeout(()=>btn.classList.remove('wrong-flash'), 300);
      }
    });
};
