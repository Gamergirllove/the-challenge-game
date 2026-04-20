window.Puzzles = window.Puzzles || {};

window.Puzzles.wordscramble = function(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let wi = 0, correct = 0;
    const words = data.words;
    function render() {
      if (wi >= words.length) { onComplete({ result: { correct, total: words.length }, timeMs: Date.now() - startTime }); return; }
      const w = words[wi];
      container.innerHTML = `
        <div class="word-container anim-pop-in">
          <div class="word-progress">WORD ${wi+1} / ${words.length} — ${correct} CORRECT</div>
          <div class="word-scrambled">${w.scrambled}</div>
          <div class="word-hint">HINT: ${w.hint}</div>
          <div class="word-input-row">
            <input class="word-answer-input" id="wanswer" type="text" placeholder="TYPE YOUR ANSWER" autocomplete="off" autocorrect="off" spellcheck="false"/>
            <button class="btn btn-primary word-submit" id="wsubmit">GO</button>
          </div>
          <div class="word-feedback" id="wfeedback"></div>
        </div>`;
      const input = container.querySelector('#wanswer');
      const submit = container.querySelector('#wsubmit');
      input.focus();
      const check = () => {
        const ans = input.value.trim().toUpperCase();
        if (!ans) return;
        const isRight = ans === w.word;
        if (isRight) { correct++; input.classList.add('correct'); container.querySelector('#wfeedback').textContent='✅ CORRECT!'; container.querySelector('#wfeedback').style.color='var(--green)'; }
        else { input.classList.add('wrong'); container.querySelector('#wfeedback').innerHTML=`❌ It was <strong>${w.word}</strong>`; container.querySelector('#wfeedback').style.color='var(--red)'; }
        input.disabled=true; submit.disabled=true;
        if (onProgress) onProgress(Math.floor((correct/words.length)*700));
        setTimeout(() => { wi++; render(); }, isRight ? 500 : 1200);
      };
      submit.addEventListener('click', check);
      input.addEventListener('keydown', e=>{ if(e.key==='Enter') check(); });
    }
    render();
};
