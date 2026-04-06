// ============================================================
//  PUZZLES.JS — All puzzle renderers
//  Each puzzle calls window.onPuzzleComplete({ result, timeMs })
// ============================================================

window.Puzzles = {

  // ──────────────────────────────────────────────────────────
  // MEMORY MATCH
  // ──────────────────────────────────────────────────────────
  memory(container, data, onComplete) {
    const startTime = Date.now();
    let flipped = [], matched = 0, locked = false;
    const cards = data.cards.map(c => ({ ...c, isFlipped: false, isMatched: false }));

    container.innerHTML = `
      <div class="memory-grid" id="mem-grid"></div>
      <div style="margin-top:1rem;font-size:.9rem;color:var(--muted);letter-spacing:.15em">
        MATCHED: <span id="mem-matched">0</span> / ${data.pairs}
      </div>`;

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
      card.isFlipped = true;
      el.classList.add('flipped');
      flipped.push({ i, el });
      if (flipped.length === 2) {
        locked = true;
        const [a, b] = flipped;
        if (cards[a.i].emoji === cards[b.i].emoji) {
          cards[a.i].isMatched = cards[b.i].isMatched = true;
          a.el.classList.add('matched'); b.el.classList.add('matched');
          matched++;
          container.querySelector('#mem-matched').textContent = matched;
          flipped = []; locked = false;
          if (matched === data.pairs) {
            onComplete({ result: {}, timeMs: Date.now() - startTime });
          }
        } else {
          setTimeout(() => {
            cards[a.i].isFlipped = cards[b.i].isFlipped = false;
            a.el.classList.remove('flipped'); b.el.classList.remove('flipped');
            flipped = []; locked = false;
          }, 900);
        }
      }
    }
  },

  // ──────────────────────────────────────────────────────────
  // QUICK MATH
  // ──────────────────────────────────────────────────────────
  quickmath(container, data, onComplete) {
    const startTime = Date.now();
    let qi = 0, correct = 0;
    const qs = data.questions;

    function render() {
      if (qi >= qs.length) {
        onComplete({ result: { correct, total: qs.length }, timeMs: Date.now() - startTime });
        return;
      }
      const q = qs[qi];
      container.innerHTML = `
        <div class="qa-container anim-pop-in">
          <div class="qa-progress">QUESTION ${qi+1} / ${qs.length}</div>
          <div class="qa-question">${q.q} = ?</div>
          <div class="qa-choices">
            ${q.choices.map(c => `<button class="qa-choice" data-val="${c}">${c}</button>`).join('')}
          </div>
        </div>`;
      container.querySelectorAll('.qa-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = Number(btn.dataset.val);
          const isRight = chosen === q.a;
          if (isRight) { correct++; btn.classList.add('correct'); }
          else {
            btn.classList.add('wrong');
            container.querySelectorAll('.qa-choice').forEach(b => {
              if (Number(b.dataset.val) === q.a) b.classList.add('correct');
            });
          }
          container.querySelectorAll('.qa-choice').forEach(b => b.disabled = true);
          setTimeout(() => { qi++; render(); }, isRight ? 400 : 900);
        });
      });
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // REACTION TEST
  // ──────────────────────────────────────────────────────────
  reaction(container, data, onComplete) {
    const times = [];
    let round = 0, waiting = false, waitTimer = null, showTime = null;

    function render() {
      container.innerHTML = `
        <div class="reaction-container">
          <div class="reaction-info">ROUND ${round+1} OF ${data.rounds} — CLICK WHEN IT TURNS RED!</div>
          <div class="reaction-zone waiting" id="rzone">
            <span>GET READY…</span>
          </div>
          <div class="reaction-times" id="rtimes"></div>
        </div>`;
      startRound();
    }

    function startRound() {
      const zone = container.querySelector('#rzone');
      if (!zone) return;
      zone.className = 'reaction-zone waiting';
      zone.innerHTML = '<span>⏳ WAIT…</span>';
      waiting = true;
      const delay = data.delays[round] || (Math.random()*3000+1500);
      waitTimer = setTimeout(() => {
        if (!container.querySelector('#rzone')) return;
        const z = container.querySelector('#rzone');
        z.className = 'reaction-zone ready';
        z.innerHTML = '<span>⚡ CLICK NOW!</span>';
        waiting = false;
        showTime = Date.now();
      }, delay);

      zone.addEventListener('click', handleClick, { once: true });
    }

    function handleClick() {
      if (waiting) {
        // Early click
        clearTimeout(waitTimer);
        const zone = container.querySelector('#rzone');
        if (zone) { zone.className = 'reaction-zone clicked-early'; zone.innerHTML = '<span>TOO EARLY! −200ms penalty</span>'; }
        times.push(999);
        updateTimes();
        setTimeout(() => { round++; if (round < data.rounds) render(); else finish(); }, 1000);
        return;
      }
      const ms = Date.now() - showTime;
      times.push(ms);
      const zone = container.querySelector('#rzone');
      if (zone) {
        zone.className = 'reaction-zone result';
        zone.innerHTML = `<span>⚡ ${ms}ms</span><span style="font-size:1rem;color:var(--muted)">${ratingLabel(ms)}</span>`;
      }
      updateTimes();
      round++;
      setTimeout(() => { if (round < data.rounds) render(); else finish(); }, 800);
    }

    function updateTimes() {
      const el = container.querySelector('#rtimes');
      if (!el) return;
      el.innerHTML = times.map((t,i) => `<span class="reaction-chip">R${i+1}: ${t===999?'TOO EARLY':t+'ms'}</span>`).join('');
    }

    function ratingLabel(ms) {
      if (ms < 200) return '🔥 LIGHTNING!';
      if (ms < 300) return '⚡ FAST';
      if (ms < 450) return '👍 GOOD';
      if (ms < 600) return '😐 OK';
      return '🐢 SLOW';
    }

    function finish() {
      const valid = times.filter(t => t !== 999);
      const avg = valid.length ? Math.round(valid.reduce((a,b)=>a+b,0)/valid.length) : 999;
      onComplete({ result: { avgMs: avg }, timeMs: avg });
    }

    render();
  },

  // ──────────────────────────────────────────────────────────
  // WORD SCRAMBLE
  // ──────────────────────────────────────────────────────────
  wordscramble(container, data, onComplete) {
    const startTime = Date.now();
    let wi = 0, correct = 0;
    const words = data.words;

    function render() {
      if (wi >= words.length) {
        onComplete({ result: { correct, total: words.length }, timeMs: Date.now() - startTime });
        return;
      }
      const w = words[wi];
      container.innerHTML = `
        <div class="word-container anim-pop-in">
          <div class="word-progress">WORD ${wi+1} / ${words.length} — GOT ${correct} RIGHT</div>
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
        if (isRight) {
          correct++;
          input.classList.add('correct');
          container.querySelector('#wfeedback').textContent = '✅ CORRECT!';
          container.querySelector('#wfeedback').style.color = 'var(--green)';
        } else {
          input.classList.add('wrong');
          container.querySelector('#wfeedback').innerHTML = `❌ It was <strong>${w.word}</strong>`;
          container.querySelector('#wfeedback').style.color = 'var(--red)';
        }
        input.disabled = true; submit.disabled = true;
        setTimeout(() => { wi++; render(); }, isRight ? 500 : 1200);
      };
      submit.addEventListener('click', check);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // COLOR SEQUENCE (Simon Says)
  // ──────────────────────────────────────────────────────────
  colorseq(container, data, onComplete) {
    const colors = data.colors;
    const colorHex = data.colorHex;
    const sequence = data.sequence;
    let level = 1, playerTurn = false, playerIdx = 0, bestLevel = 0;

    function render() {
      container.innerHTML = `
        <div class="color-container">
          <div class="color-level">LEVEL <span id="clevel">${level}</span></div>
          <div class="color-info" id="cinfo">WATCH THE SEQUENCE…</div>
          <div class="color-sequence-display" id="cseq-dots"></div>
          <div class="color-buttons" id="cbtns">
            ${colors.map(c => `
              <button class="color-btn" data-color="${c}" style="background:${colorHex[c]}" disabled>${c}</button>
            `).join('')}
          </div>
        </div>`;
      playSequence();
    }

    function playSequence() {
      playerTurn = false;
      setInfo('👁 WATCH THE SEQUENCE…');
      disableBtns(true);
      updateDots();
      const seq = sequence.slice(0, level);
      let i = 0;
      const interval = setInterval(() => {
        if (i > 0) unflashAll();
        if (i < seq.length) {
          flashColor(seq[i]);
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => { unflashAll(); enablePlayerTurn(); }, 400);
        }
      }, 700);
    }

    function enablePlayerTurn() {
      playerTurn = true; playerIdx = 0;
      setInfo('🎯 YOUR TURN — REPEAT THE SEQUENCE!');
      disableBtns(false);
    }

    function handlePlayerClick(color) {
      if (!playerTurn) return;
      const expected = sequence[playerIdx];
      flashColor(color);
      setTimeout(() => unflashAll(), 200);
      if (color !== expected) {
        setInfo(`❌ WRONG! It was ${expected}. Best: Level ${bestLevel}`);
        disableBtns(true);
        setTimeout(() => onComplete({ result: { level: bestLevel }, timeMs: 0 }), 1500);
        return;
      }
      playerIdx++;
      if (playerIdx === level) {
        bestLevel = level;
        level++;
        if (level > sequence.length) {
          setInfo('🔥 PERFECT! You beat the whole sequence!');
          setTimeout(() => onComplete({ result: { level: bestLevel }, timeMs: 0 }), 1200);
          return;
        }
        setInfo('✅ CORRECT! Next level…');
        disableBtns(true);
        setTimeout(() => render(), 1000);
      }
    }

    function flashColor(color) {
      const btn = container.querySelector(`[data-color="${color}"]`);
      if (btn) btn.classList.add('flash');
    }
    function unflashAll() {
      container.querySelectorAll('.color-btn').forEach(b => b.classList.remove('flash'));
    }
    function disableBtns(dis) {
      container.querySelectorAll('.color-btn').forEach(b => {
        b.disabled = dis; b.classList.toggle('disabled', dis);
      });
    }
    function setInfo(txt) {
      const el = container.querySelector('#cinfo'); if (el) el.textContent = txt;
    }
    function updateDots() {
      const el = container.querySelector('#cseq-dots'); if (!el) return;
      el.innerHTML = sequence.slice(0, level).map((c,i) => `
        <div class="color-seq-dot" style="background:${colorHex[c]}" data-dot="${i}"></div>
      `).join('');
    }

    container.addEventListener('click', e => {
      const btn = e.target.closest('.color-btn');
      if (btn && !btn.disabled) handlePlayerClick(btn.dataset.color);
    });

    render();
  },

  // ──────────────────────────────────────────────────────────
  // TRIVIA
  // ──────────────────────────────────────────────────────────
  trivia(container, data, onComplete) {
    const startTime = Date.now();
    let qi = 0, correct = 0;
    const qs = data.questions;

    function render() {
      if (qi >= qs.length) {
        onComplete({ result: { correct, total: qs.length }, timeMs: Date.now() - startTime });
        return;
      }
      const q = qs[qi];
      container.innerHTML = `
        <div class="qa-container anim-pop-in">
          <div class="qa-progress">❓ QUESTION ${qi+1} / ${qs.length}</div>
          <div class="qa-question" style="font-size:clamp(1.2rem,3vw,2rem)">${q.q}</div>
          <div class="qa-choices">
            ${q.choices.map(c => `<button class="qa-choice" data-val="${c}">${c}</button>`).join('')}
          </div>
        </div>`;
      container.querySelectorAll('.qa-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = btn.dataset.val;
          const isRight = chosen === q.a;
          if (isRight) { correct++; btn.classList.add('correct'); }
          else {
            btn.classList.add('wrong');
            container.querySelectorAll('.qa-choice').forEach(b => { if (b.dataset.val === q.a) b.classList.add('correct'); });
          }
          container.querySelectorAll('.qa-choice').forEach(b => b.disabled = true);
          setTimeout(() => { qi++; render(); }, isRight ? 400 : 900);
        });
      });
    }
    render();
  },

};
