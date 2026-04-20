window.Puzzles = window.Puzzles || {};

window.Puzzles.quickmath = function(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let qi = 0, correct = 0;
    const qs = data.questions;
    function render() {
      if (qi >= qs.length) { onComplete({ result: { correct, total: qs.length }, timeMs: Date.now() - startTime }); return; }
      const q = qs[qi];
      container.innerHTML = `
        <div class="qa-container anim-pop-in">
          <div class="qa-progress">QUESTION ${qi+1} / ${qs.length}</div>
          <div class="qa-question">${q.q} = ?</div>
          <div class="qa-choices">${q.choices.map(c=>`<button class="qa-choice" data-val="${c}">${c}</button>`).join('')}</div>
        </div>`;
      container.querySelectorAll('.qa-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const isRight = Number(btn.dataset.val) === q.a;
          if (isRight) { correct++; btn.classList.add('correct'); }
          else { btn.classList.add('wrong'); container.querySelectorAll('.qa-choice').forEach(b=>{ if(Number(b.dataset.val)===q.a) b.classList.add('correct'); }); }
          container.querySelectorAll('.qa-choice').forEach(b=>b.disabled=true);
          if (onProgress) onProgress(Math.floor((correct/(qs.length))*700));
          setTimeout(() => { qi++; render(); }, isRight ? 400 : 900);
        });
      });
    }
    render();
};
