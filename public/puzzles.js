// ============================================================
//  PUZZLES.JS — All puzzle renderers
//  Each puzzle calls onComplete({ result, timeMs })
//  Each puzzle calls onProgress(score) for live updates
// ============================================================

window.Puzzles = {

  // ──────────────────────────────────────────────────────────
  // DAILY: MEMORY MATCH
  // ──────────────────────────────────────────────────────────
  memory(container, data, onComplete, onProgress) {
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
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: QUICK MATH
  // ──────────────────────────────────────────────────────────
  quickmath(container, data, onComplete, onProgress) {
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
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: REACTION TEST
  // ──────────────────────────────────────────────────────────
  reaction(container, data, onComplete, onProgress) {
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
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: WORD SCRAMBLE
  // ──────────────────────────────────────────────────────────
  wordscramble(container, data, onComplete, onProgress) {
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
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: COLOR SEQUENCE (Simon Says)
  // ──────────────────────────────────────────────────────────
  colorseq(container, data, onComplete, onProgress) {
    const colors = data.colors, colorHex = data.colorHex, sequence = data.sequence;
    let level = 1, playerTurn = false, playerIdx = 0, bestLevel = 0;
    function render() {
      container.innerHTML = `
        <div class="color-container">
          <div class="color-level">LEVEL <span id="clevel">${level}</span></div>
          <div class="color-info" id="cinfo">WATCH THE SEQUENCE…</div>
          <div class="color-sequence-display" id="cseq-dots"></div>
          <div class="color-buttons" id="cbtns">${colors.map(c=>`<button class="color-btn" data-color="${c}" style="background:${colorHex[c]}" disabled>${c}</button>`).join('')}</div>
        </div>`;
      container.addEventListener('click', e=>{
        const btn = e.target.closest('.color-btn');
        if (btn && !btn.disabled) handlePlayerClick(btn.dataset.color);
      });
      playSequence();
    }
    function playSequence() {
      playerTurn=false; setInfo('👁 WATCH THE SEQUENCE…'); disableBtns(true); updateDots();
      const seq = sequence.slice(0, level); let i = 0;
      const interval = setInterval(() => {
        if (i>0) unflashAll();
        if (i<seq.length) { flashColor(seq[i]); i++; }
        else { clearInterval(interval); setTimeout(()=>{ unflashAll(); enablePlayerTurn(); }, 400); }
      }, 700);
    }
    function enablePlayerTurn() { playerTurn=true; playerIdx=0; setInfo('🎯 REPEAT THE SEQUENCE!'); disableBtns(false); }
    function handlePlayerClick(color) {
      if (!playerTurn) return;
      const expected = sequence[playerIdx];
      flashColor(color); setTimeout(()=>unflashAll(),200);
      if (color !== expected) { setInfo(`❌ Wrong! Best: Level ${bestLevel}`); disableBtns(true); setTimeout(()=>onComplete({result:{level:bestLevel},timeMs:0}),1500); return; }
      playerIdx++;
      if (playerIdx===level) {
        bestLevel=level; level++;
        if (level>sequence.length) { setInfo('🔥 PERFECT!'); setTimeout(()=>onComplete({result:{level:bestLevel},timeMs:0}),1200); return; }
        if (onProgress) onProgress(Math.min(1000, bestLevel*100));
        setInfo('✅ CORRECT! Next level…'); disableBtns(true); setTimeout(()=>render(),1000);
      }
    }
    function flashColor(color) { const btn=container.querySelector(`[data-color="${color}"]`); if(btn) btn.classList.add('flash'); }
    function unflashAll() { container.querySelectorAll('.color-btn').forEach(b=>b.classList.remove('flash')); }
    function disableBtns(dis) { container.querySelectorAll('.color-btn').forEach(b=>{ b.disabled=dis; b.classList.toggle('disabled',dis); }); }
    function setInfo(txt) { const el=container.querySelector('#cinfo'); if(el) el.textContent=txt; }
    function updateDots() { const el=container.querySelector('#cseq-dots'); if(!el) return; el.innerHTML=sequence.slice(0,level).map((c,i)=>`<div class="color-seq-dot" style="background:${colorHex[c]}"></div>`).join(''); }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: TRIVIA
  // ──────────────────────────────────────────────────────────
  trivia(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let qi = 0, correct = 0;
    const qs = data.questions;
    function render() {
      if (qi >= qs.length) { onComplete({ result: { correct, total: qs.length }, timeMs: Date.now() - startTime }); return; }
      const q = qs[qi];
      container.innerHTML = `
        <div class="qa-container anim-pop-in">
          <div class="qa-progress">❓ QUESTION ${qi+1} / ${qs.length}</div>
          <div class="qa-question" style="font-size:clamp(1.2rem,3vw,2rem)">${q.q}</div>
          <div class="qa-choices">${q.choices.map(c=>`<button class="qa-choice" data-val="${c}">${c}</button>`).join('')}</div>
        </div>`;
      container.querySelectorAll('.qa-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const isRight = btn.dataset.val === q.a;
          if (isRight) { correct++; btn.classList.add('correct'); }
          else { btn.classList.add('wrong'); container.querySelectorAll('.qa-choice').forEach(b=>{ if(b.dataset.val===q.a) b.classList.add('correct'); }); }
          container.querySelectorAll('.qa-choice').forEach(b=>b.disabled=true);
          if (onProgress) onProgress(Math.floor((correct/qs.length)*700));
          setTimeout(() => { qi++; render(); }, isRight ? 400 : 900);
        });
      });
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: TESSELLATIONS
  // ──────────────────────────────────────────────────────────
  tessellations(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let correct = 0;
    const total = data.hidden.length;
    const hiddenSet = new Set(data.hidden.map(([r,c])=>`${r},${c}`));
    const userGrid = {};
    let selectedColor = null;

    function render() {
      container.innerHTML = `
        <div class="tess-container anim-fade-in">
          <div class="tess-header">
            <div class="tess-title">🔷 TESSELLATIONS</div>
            <div class="tess-sub">Spot the pattern — fill in the missing tiles!</div>
            <div class="tess-progress" id="tess-prog">${correct} / ${total} filled</div>
          </div>
          <div class="tess-grid" id="tess-grid" style="grid-template-columns:repeat(${data.size},1fr)"></div>
          <div class="tess-palette" id="tess-palette">
            ${data.colors.map((c,i)=>`<button class="tess-color-btn" data-idx="${i}" style="background:${c}"></button>`).join('')}
          </div>
          <div class="tess-hint">1️⃣ SELECT A COLOR &nbsp; 2️⃣ CLICK A ? TILE</div>
        </div>`;

      const grid = container.querySelector('#tess-grid');
      for (let r=0; r<data.size; r++) {
        for (let c=0; c<data.size; c++) {
          const cell = document.createElement('div');
          cell.className = 'tess-cell';
          cell.dataset.r = r; cell.dataset.c = c;
          const key = `${r},${c}`;
          if (hiddenSet.has(key) && userGrid[key] === undefined) {
            cell.classList.add('hidden'); cell.textContent = '?';
          } else {
            const idx = userGrid[key] !== undefined ? userGrid[key] : data.grid[r][c];
            cell.style.background = data.colors[idx];
          }
          grid.appendChild(cell);
        }
      }

      container.querySelectorAll('.tess-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedColor = Number(btn.dataset.idx);
          container.querySelectorAll('.tess-color-btn').forEach(b=>b.classList.remove('selected'));
          btn.classList.add('selected');
        });
      });

      grid.addEventListener('click', e => {
        const cell = e.target.closest('.tess-cell');
        if (!cell || !cell.classList.contains('hidden')) return;
        if (selectedColor === null) { cell.classList.add('wrong-flash'); return; }
        const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
        const key = `${r},${c}`;
        const answer = data.grid[r][c];
        if (selectedColor === answer) {
          userGrid[key] = selectedColor;
          cell.classList.remove('hidden'); cell.classList.add('correct-fill');
          cell.style.background = data.colors[selectedColor]; cell.textContent = '';
          correct++;
          container.querySelector('#tess-prog').textContent = `${correct} / ${total} filled`;
          if (onProgress) onProgress(Math.floor((correct/total)*700));
          if (correct === total) setTimeout(()=>onComplete({result:{correct,total},timeMs:Date.now()-startTime}),400);
        } else {
          cell.classList.add('wrong-flash');
          setTimeout(()=>cell.classList.remove('wrong-flash'),400);
        }
      });
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: NUMBER HUNT
  // ──────────────────────────────────────────────────────────
  numberhunt(container, data, onComplete, onProgress) {
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
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: TAP FRENZY — tap the most times in 30 seconds
  // ──────────────────────────────────────────────────────────
  tapfrenzy(container, data, onComplete, onProgress) {
    let taps = 0, running = false, timeLeft = 30, interval = null;
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
          const tps = (taps / 30).toFixed(1);
          if (resultEl) resultEl.textContent = `${taps} taps · ${tps} per second`;
          onComplete({ result: { taps }, timeMs: 30000 });
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
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: CURLING — swipe to steer an orb to a target
  // ──────────────────────────────────────────────────────────
  curling(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let score = 0, shot = 0, totalShots = data.shots || 5;
    let orb = null, orbVx = 0, orbVy = 0, animId = null;
    let brushing = false, brushX = 0, brushY = 0;
    let launched = false, settled = false;

    function render() {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem;width:100%;max-width:480px">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">🥌 CURLING</div>
          <div style="display:flex;justify-content:space-between;width:100%;max-width:420px">
            <div style="font-size:.85rem;color:var(--muted)">SHOT <span id="curl-shot">${shot+1}</span> / ${totalShots}</div>
            <div style="font-family:var(--font-title);font-size:1.1rem;color:var(--gold)">SCORE: <span id="curl-score">${score}</span></div>
          </div>
          <canvas id="curl-canvas" width="380" height="480" style="border-radius:12px;background:#1a2a1a;border:2px solid rgba(255,255,255,.1);touch-action:none;cursor:crosshair;max-width:100%"></canvas>
          <div id="curl-hint" style="font-size:.8rem;color:var(--muted);letter-spacing:.15em;text-align:center">CLICK &amp; DRAG to launch the orb · SWIPE in front of it to steer</div>
        </div>`;

      setupShot();
    }

    function setupShot() {
      settled = false; launched = false; brushing = false;
      const canvas = container.querySelector('#curl-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;

      // Orb start position (bottom center)
      orb = { x: W/2, y: H - 60, r: 18 };
      orbVx = 0; orbVy = 0;

      // Target (bullseye) at top
      const target = { x: W/2 + (Math.random()-.5)*80, y: 80, rings: [50,35,22,12] };

      let dragStart = null;

      drawFrame(ctx, W, H, target, [], true);

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width, scaleY = H / rect.height;
        const src = e.touches ? e.touches[0] : e;
        return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
      }

      canvas.addEventListener('pointerdown', e => {
        e.preventDefault();
        const pos = getPos(e);
        if (!launched) {
          // Near orb = start drag to launch
          const dx = pos.x - orb.x, dy = pos.y - orb.y;
          if (Math.sqrt(dx*dx+dy*dy) < 40) { dragStart = pos; }
        } else {
          // Launched = brush in front of orb
          brushing = true; brushX = pos.x; brushY = pos.y;
        }
      });

      canvas.addEventListener('pointermove', e => {
        e.preventDefault();
        const pos = getPos(e);
        if (!launched && dragStart) {
          drawFrame(ctx, W, H, target, [], false);
          drawOrb(ctx, orb);
          // Draw aim arrow
          ctx.save();
          ctx.strokeStyle = 'rgba(255,200,50,.6)';
          ctx.lineWidth = 3; ctx.setLineDash([8,4]);
          ctx.beginPath(); ctx.moveTo(orb.x, orb.y);
          ctx.lineTo(orb.x + (orb.x - pos.x)*0.8, orb.y + (orb.y - pos.y)*0.8);
          ctx.stroke(); ctx.restore();
        } else if (launched && brushing) {
          brushX = pos.x; brushY = pos.y;
          // Brush effect: push orb slightly toward brush position relative to its path
          const bx = pos.x - orb.x;
          orbVx += bx * 0.003;
          // dampen over-steering
          orbVx = Math.max(-3, Math.min(3, orbVx));
        }
      });

      canvas.addEventListener('pointerup', e => {
        e.preventDefault();
        const pos = getPos(e);
        if (!launched && dragStart) {
          const dx = dragStart.x - pos.x;
          const dy = dragStart.y - pos.y;
          const power = Math.min(Math.sqrt(dx*dx+dy*dy), 120) / 120;
          orbVx = dx * 0.06 * power;
          orbVy = dy * 0.1 * power - 1;
          if (Math.abs(orbVy) > 0.5) {
            launched = true;
            container.querySelector('#curl-hint').textContent = 'Swipe LEFT/RIGHT in front of the orb to steer!';
            animate(ctx, W, H, target);
          }
          dragStart = null;
        }
        brushing = false;
      });
    }

    function animate(ctx, W, H, target) {
      if (animId) cancelAnimationFrame(animId);
      const trail = [];
      function step() {
        if (!container.querySelector('#curl-canvas')) return;
        orbVy *= 0.997; orbVx *= 0.99;
        orb.x += orbVx; orb.y += orbVy;
        // Wall bounce
        if (orb.x < orb.r) { orb.x = orb.r; orbVx *= -0.7; }
        if (orb.x > W-orb.r) { orb.x = W-orb.r; orbVx *= -0.7; }
        trail.push({x:orb.x,y:orb.y});
        if (trail.length > 30) trail.shift();
        drawFrame(ctx, W, H, target, trail, false);
        // Check if stopped or out of bounds
        const speed = Math.sqrt(orbVx*orbVx+orbVy*orbVy);
        const offScreen = orb.y < -orb.r || orb.y > H+orb.r;
        if (speed < 0.15 || offScreen) {
          settled = true;
          if (!offScreen) drawOrb(ctx, orb);
          const dist = Math.sqrt((orb.x-target.x)**2+(orb.y-target.y)**2);
          let pts = 0;
          if (dist < target.rings[3]) pts = 10;
          else if (dist < target.rings[2]) pts = 7;
          else if (dist < target.rings[1]) pts = 4;
          else if (dist < target.rings[0]) pts = 1;
          score += pts;
          shot++;
          if (onProgress) onProgress(Math.min(1000, score * 20));
          const scoreEl = container.querySelector('#curl-score');
          if (scoreEl) scoreEl.textContent = score;
          // Flash score
          ctx.save(); ctx.fillStyle = pts>=7?'#f1c40f':pts>=4?'#2ecc71':pts>0?'#3498db':'#e74c3c';
          ctx.font = 'bold 32px Bebas Neue,sans-serif'; ctx.textAlign='center';
          ctx.fillText(pts>0?`+${pts} pts`:'MISS', orb.x, Math.max(40, orb.y-30));
          ctx.restore();
          setTimeout(() => {
            if (shot >= totalShots) {
              onComplete({ result: { score, shots: totalShots }, timeMs: Date.now() - startTime });
            } else {
              const shotEl = container.querySelector('#curl-shot');
              if (shotEl) shotEl.textContent = shot+1;
              setupShot();
            }
          }, 1200);
          return;
        }
        animId = requestAnimationFrame(step);
      }
      step();
    }

    function drawFrame(ctx, W, H, target, trail, showHint) {
      ctx.clearRect(0,0,W,H);
      // Ice surface
      ctx.fillStyle = '#1a2a1a'; ctx.fillRect(0,0,W,H);
      // Lane lines
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
      for (let x=0; x<W; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      // Target rings
      const ringColors = ['rgba(232,25,44,.5)','rgba(255,255,255,.3)','rgba(232,25,44,.5)','rgba(245,197,24,.7)'];
      target.rings.forEach((r,i) => {
        ctx.beginPath(); ctx.arc(target.x, target.y, r, 0, Math.PI*2);
        ctx.fillStyle = ringColors[i]; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=1; ctx.stroke();
      });
      // Trail
      trail.forEach((pt, i) => {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 4*(i/trail.length), 0, Math.PI*2);
        ctx.fillStyle = `rgba(100,200,255,${i/trail.length*0.4})`; ctx.fill();
      });
      // Orb
      if (!settled || trail.length) drawOrb(ctx, orb);
      // Hint arrow if not launched
      if (showHint) {
        ctx.save(); ctx.fillStyle='rgba(255,255,255,.2)'; ctx.font='14px Barlow Condensed,sans-serif';
        ctx.textAlign='center'; ctx.fillText('DRAG to aim & launch',W/2,H-20); ctx.restore();
      }
    }

    function drawOrb(ctx, o) {
      const grad = ctx.createRadialGradient(o.x-5, o.y-5, 2, o.x, o.y, o.r);
      grad.addColorStop(0,'#99ccff'); grad.addColorStop(1,'#2255aa');
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI*2);
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.stroke();
    }

    render();
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: PATTERN MATCH — memorize and recreate a grid pattern
  // ──────────────────────────────────────────────────────────
  patternmatch(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let round = 0, score = 0;
    const rounds = data.rounds;

    function showPattern() {
      if (round >= rounds.length) {
        onComplete({ result: { score, total: rounds.length }, timeMs: Date.now() - startTime }); return;
      }
      const r = rounds[round];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:420px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">🧩 PATTERN MATCH</div>
          <div style="font-size:.85rem;color:var(--muted);letter-spacing:.15em">ROUND ${round+1}/${rounds.length} — MEMORIZE THIS PATTERN</div>
          <div id="pm-grid" class="pm-grid" style="grid-template-columns:repeat(${r.size},1fr);display:grid;gap:5px"></div>
          <div id="pm-msg" style="font-family:var(--font-title);font-size:1.5rem;color:var(--gold);letter-spacing:.1em"></div>
        </div>`;
      const grid = container.querySelector('#pm-grid');
      r.pattern.forEach(v => {
        const c = document.createElement('div');
        c.style.cssText=`width:60px;height:60px;border-radius:8px;background:${v?r.color:'var(--dark3)'};border:2px solid rgba(255,255,255,.1)`;
        grid.appendChild(c);
      });
      // Show for 3 seconds then hide and ask to recreate
      let countdown = 3;
      const msg = container.querySelector('#pm-msg');
      msg.textContent = `Memorize! ${countdown}s`;
      const t = setInterval(() => {
        countdown--;
        if (countdown > 0) { msg.textContent = `Memorize! ${countdown}s`; }
        else { clearInterval(t); askRecreate(r); }
      }, 1000);
    }

    function askRecreate(r) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:420px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">🧩 PATTERN MATCH</div>
          <div style="font-size:.85rem;color:var(--muted);letter-spacing:.15em">CLICK THE CELLS TO RECREATE THE PATTERN</div>
          <div id="pm-input" style="display:grid;grid-template-columns:repeat(${r.size},1fr);gap:5px"></div>
          <button class="btn btn-primary" id="pm-submit" style="width:200px">SUBMIT</button>
          <div id="pm-feedback" style="font-family:var(--font-title);font-size:1.2rem;min-height:1.5rem"></div>
        </div>`;
      const state = new Array(r.size*r.size).fill(false);
      const grid = container.querySelector('#pm-input');
      state.forEach((v,i) => {
        const c = document.createElement('div');
        c.style.cssText=`width:60px;height:60px;border-radius:8px;background:var(--dark3);border:2px solid rgba(255,255,255,.1);cursor:pointer;transition:background .15s`;
        c.dataset.i = i;
        c.addEventListener('click', () => {
          state[i] = !state[i];
          c.style.background = state[i] ? r.color : 'var(--dark3)';
        });
        grid.appendChild(c);
      });
      container.querySelector('#pm-submit').addEventListener('click', () => {
        let correct = 0;
        state.forEach((v,i) => { if(v === r.pattern[i]) correct++; });
        const pct = correct / (r.size*r.size);
        const pts = pct === 1 ? 10 : pct >= 0.8 ? 7 : pct >= 0.6 ? 4 : 0;
        score += pts;
        if (onProgress) onProgress(Math.min(1000, score * 15));
        const fb = container.querySelector('#pm-feedback');
        if (fb) { fb.textContent = pts===10?'🔥 PERFECT!':pts>0?`✅ ${Math.round(pct*100)}% correct (+${pts}pts)`:`❌ Wrong pattern (${Math.round(pct*100)}%)`; fb.style.color=pts>=7?'var(--green)':pts>0?'var(--gold)':'var(--red)'; }
        round++;
        setTimeout(showPattern, 1200);
      });
    }

    showPattern();
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: EMOJI SORT — drag emojis into the correct category
  // ──────────────────────────────────────────────────────────
  emojisort(container, data, onComplete, onProgress) {
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
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: FAST FINGERS — type a given phrase as fast as possible
  // ──────────────────────────────────────────────────────────
  fastfingers(container, data, onComplete, onProgress) {
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
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: GRID LOCK — find the matching pair in a grid
  // ──────────────────────────────────────────────────────────
  gridlock(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let found = 0, total = data.rounds;
    let round = 0;

    function renderRound() {
      if (round >= total) { onComplete({ result:{found,total}, timeMs:Date.now()-startTime }); return; }
      const r = data.rounds_data[round];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:460px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">🔍 GRID LOCK</div>
          <div style="font-size:.85rem;color:var(--muted)">Find the pair that matches: <strong style="color:var(--text)">${r.target}</strong></div>
          <div style="font-size:.85rem;color:var(--muted)">Round ${round+1}/${total} · ${found} found</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;width:100%">
            ${r.grid.map((cell,i)=>`<button class="qa-choice" data-i="${i}" style="font-size:1.3rem;padding:.6rem">${cell}</button>`).join('')}
          </div>
          <div id="gl-feedback" style="font-family:var(--font-title);font-size:1.2rem;min-height:1.5rem"></div>
        </div>`;
      container.querySelectorAll('.qa-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = r.grid[Number(btn.dataset.i)];
          const isRight = r.answers.includes(chosen);
          if (isRight) {
            found++; btn.classList.add('correct');
            if (onProgress) onProgress(Math.floor((found/total)*700));
            round++;
            setTimeout(renderRound, 500);
          } else {
            btn.classList.add('wrong');
            const fb = container.querySelector('#gl-feedback');
            if(fb) fb.textContent='❌ Wrong pair!';
            setTimeout(()=>btn.classList.remove('wrong'),400);
          }
        });
      });
    }
    renderRound();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: SPEED SORT — click items in ascending/descending order
  // ──────────────────────────────────────────────────────────
  speedsort(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    let nextIdx = 0;
    const sorted = [...data.items].sort((a,b)=>a-b);

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:420px;width:100%">
        <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold);letter-spacing:.15em">⬆ SPEED SORT</div>
        <div style="font-size:.85rem;color:var(--muted)">Click ALL numbers SMALLEST → LARGEST!</div>
        <div style="font-family:var(--font-title);font-size:1.2rem">NEXT: <span id="ss-next" style="color:var(--red)">${sorted[0]}</span></div>
        <div id="ss-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;width:100%">
          ${data.items.map(n=>`<button class="hunt-btn" data-num="${n}">${n}</button>`).join('')}
        </div>
        <div id="ss-prog" style="font-size:.85rem;color:var(--muted)">${nextIdx} / ${data.items.length}</div>
      </div>`;

    container.querySelector('#ss-grid').addEventListener('click', e=>{
      const btn = e.target.closest('.hunt-btn');
      if(!btn||btn.disabled) return;
      const num = Number(btn.dataset.num);
      if(num===sorted[nextIdx]) {
        btn.classList.add('found'); btn.disabled=true;
        nextIdx++;
        const nextEl=container.querySelector('#ss-next');
        if(nextEl) nextEl.textContent=sorted[nextIdx]||'DONE!';
        container.querySelector('#ss-prog').textContent=`${nextIdx} / ${data.items.length}`;
        if(onProgress) onProgress(Math.floor((nextIdx/data.items.length)*900));
        if(nextIdx>=data.items.length) onComplete({result:{},timeMs:Date.now()-startTime});
      } else {
        btn.classList.add('wrong-flash');
        setTimeout(()=>btn.classList.remove('wrong-flash'),300);
      }
    });
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: JUMP ROPE — press button in rhythm to jump
  // ──────────────────────────────────────────────────────────
  jumprope(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const duration = data.duration || 30000;
    const bpm = data.bpm || 80;
    const beatMs = (60000 / bpm);
    const windowMs = beatMs * 0.45;
    let jumps = 0, misses = 0, ropeAngle = 0, lastBeat = 0, animId;
    let jumped = false, canJump = true;

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem;width:100%">
        <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--gold)">🪢 JUMP ROPE</div>
        <div style="font-size:.85rem;color:var(--muted)">Press JUMP in rhythm — don't trip!</div>
        <canvas id="jr-canvas" width="320" height="160" style="border-radius:8px;background:#1a1a2e"></canvas>
        <div style="display:flex;gap:2rem;font-family:var(--font-title);font-size:1.1rem">
          <span>✅ <span id="jr-jumps">0</span></span>
          <span style="color:var(--red)">❌ <span id="jr-misses">0</span></span>
        </div>
        <button id="jr-btn" class="btn btn-primary" style="font-size:1.4rem;padding:.8rem 3rem;letter-spacing:.2em">⬆ JUMP</button>
        <div style="font-size:.8rem;color:var(--muted)" id="jr-msg">Get ready…</div>
      </div>`;

    const canvas = container.querySelector('#jr-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    function drawStickman(x, y, jumping) {
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y - (jumping?14:0), 8, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y-(jumping?6:0)); ctx.lineTo(x, y+16-(jumping?6:0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-10, y+6-(jumping?6:0)); ctx.lineTo(x+10, y+6-(jumping?6:0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y+16-(jumping?6:0)); ctx.lineTo(x-8, y+30-(jumping?6:0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y+16-(jumping?6:0)); ctx.lineTo(x+8, y+30-(jumping?6:0)); ctx.stroke();
      ctx.restore();
    }

    let playerY = H - 45;
    let isJumping = false;
    let jumpVel = 0;

    function animate(ts) {
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0,0,W,H);
      // ground
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(20,H-20); ctx.lineTo(W-20,H-20); ctx.stroke();
      // rope holders
      drawStickman(40, H-45, false);
      drawStickman(W-40, H-45, false);
      // rope
      ropeAngle += (Math.PI*2 / beatMs) * 16.67;
      const cx = W/2, cy = H-35;
      const rx = 110, ry = 30;
      ctx.strokeStyle = '#f90';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for(let t=0;t<=1;t+=0.05) {
        const angle = ropeAngle + t * Math.PI;
        const px = cx - rx + rx*2*t;
        const py = cy + Math.sin(angle) * ry;
        t===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
      }
      ctx.stroke();
      // rope bottom check
      const ropeBottom = cy + Math.sin(ropeAngle + Math.PI/2) * ry;
      // player jump physics
      if(isJumping) {
        playerY += jumpVel;
        jumpVel += 1.2;
        if(playerY >= H-45) { playerY = H-45; isJumping = false; jumpVel = 0; }
      }
      drawStickman(W/2, playerY, isJumping);
      // collision: rope near ground and player not jumping
      if(!isJumping && Math.sin(ropeAngle + Math.PI/2) > 0.7) {
        // rope is at bottom — player should be up
        // we just use beat timing for the game mechanic
      }
      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);

    let beatCount = 0;
    const beatInterval = setInterval(() => {
      beatCount++;
      const msg = container.querySelector('#jr-msg');
      if(msg) msg.textContent = beatCount % 2 === 0 ? '🎵 Jump!' : '⏸';
      lastBeat = Date.now();
      canJump = true;
      jumped = false;
    }, beatMs);

    container.querySelector('#jr-btn').addEventListener('click', () => {
      if(!canJump) return;
      const timeSinceBeat = Date.now() - lastBeat;
      const inWindow = timeSinceBeat < windowMs || timeSinceBeat > beatMs - windowMs;
      isJumping = true; jumpVel = -12;
      if(inWindow) {
        jumps++;
        container.querySelector('#jr-jumps').textContent = jumps;
        if(onProgress) onProgress(Math.floor((jumps / (duration/beatMs)) * 900));
      } else {
        misses++;
        container.querySelector('#jr-misses').textContent = misses;
      }
      canJump = false;
    });

    setTimeout(() => {
      clearInterval(beatInterval);
      cancelAnimationFrame(animId);
      onComplete({ result: { hits: jumps, misses }, timeMs: Date.now() - startTime });
    }, duration);
  },

  // ──────────────────────────────────────────────────────────
  // DAILY: MINESWEEPER — flag all mines without hitting one
  // ──────────────────────────────────────────────────────────
  minesweeper(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const { rows, cols, mines: mineList } = data;
    const mineSet = new Set(mineList.map(([r,c])=>`${r},${c}`));
    const revealed = new Set();
    const flagged = new Set();
    let done = false;

    function countAdj(r,c) {
      let n=0;
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) {
        if(dr===0&&dc===0) continue;
        if(mineSet.has(`${r+dr},${c+dc}`)) n++;
      }
      return n;
    }

    function reveal(r,c) {
      const key=`${r},${c}`;
      if(r<0||r>=rows||c<0||c>=cols||revealed.has(key)||flagged.has(key)) return;
      revealed.add(key);
      if(mineSet.has(key)) {
        done=true;
        render();
        onComplete({result:{won:false,safe:revealed.size},timeMs:Date.now()-startTime});
        return;
      }
      if(countAdj(r,c)===0) {
        for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) {
          if(dr!==0||dc!==0) reveal(r+dr,c+dc);
        }
      }
    }

    function render() {
      const safeCells = rows*cols - mineList.length;
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem">
          <div style="font-family:var(--font-title);font-size:1.6rem;color:var(--gold)">💣 MINESWEEPER</div>
          <div style="font-size:.8rem;color:var(--muted)">Left-click reveal · Right-click flag mines</div>
          <div id="ms-grid" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px;user-select:none"></div>
          <div style="font-size:.85rem;color:var(--muted)">Revealed: <span id="ms-rev">0</span>/${safeCells}</div>
        </div>`;
      const grid = container.querySelector('#ms-grid');
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
        const key=`${r},${c}`;
        const btn=document.createElement('button');
        btn.style.cssText='width:28px;height:28px;font-size:.75rem;border-radius:4px;cursor:pointer;border:none;font-weight:700';
        if(done && mineSet.has(key)) { btn.textContent='💣'; btn.style.background='#c0392b'; }
        else if(revealed.has(key)) {
          const n=countAdj(r,c);
          btn.textContent=n>0?n:'';
          btn.style.background='#2a2a4a';
          btn.style.color=['','#3498db','#2ecc71','#e74c3c','#9b59b6','#e67e22','#1abc9c','#fff','#888'][n]||'#fff';
          btn.disabled=true;
        } else if(flagged.has(key)) {
          btn.textContent='🚩'; btn.style.background='#444';
        } else {
          btn.style.background='#555';
        }
        btn.addEventListener('click',()=>{
          if(done||revealed.has(key)||flagged.has(key)) return;
          reveal(r,c);
          if(!done) {
            const safeCells2=rows*cols-mineList.length;
            container.querySelector('#ms-rev').textContent=revealed.size;
            if(onProgress) onProgress(Math.floor((revealed.size/safeCells2)*900));
            if(revealed.size>=safeCells2) {
              done=true;
              onComplete({result:{won:true,safe:revealed.size},timeMs:Date.now()-startTime});
            }
          }
          render();
        });
        btn.addEventListener('contextmenu',e=>{
          e.preventDefault();
          if(done||revealed.has(key)) return;
          if(flagged.has(key)) flagged.delete(key); else flagged.add(key);
          render();
        });
        grid.appendChild(btn);
      }
    }
    render();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: FIND THE BOMB — click the hidden bomb before time runs out
  // ──────────────────────────────────────────────────────────
  findbomb(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const { size, bomb, decoys } = data;
    let clicks = 0, found = false;
    const emojis = ['📦','🎁','🗃️','📫','🧰','🪣','🧲','🔮','🎲','🃏'];

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem">
        <div style="font-family:var(--font-title);font-size:1.8rem;color:var(--red)">💣 FIND THE BOMB!</div>
        <div style="font-size:.85rem;color:var(--muted)">Click boxes to find the hidden bomb — it could be anywhere!</div>
        <div id="fb-grid" style="display:grid;grid-template-columns:repeat(${size},1fr);gap:.4rem;width:min(360px,90vw)"></div>
        <div id="fb-msg" style="font-family:var(--font-title);font-size:1.1rem"></div>
      </div>`;

    const cells = Array.from({length: size*size}, (_,i)=>i);
    const shuffled = cells.sort(()=>Math.random()-.5);
    const bombIdx = shuffled[0];
    const decoyIdxs = new Set(shuffled.slice(1, decoys+1));

    const grid = container.querySelector('#fb-grid');
    cells.forEach(i => {
      const btn = document.createElement('button');
      btn.style.cssText='padding:.6rem;font-size:1.4rem;border-radius:6px;cursor:pointer;border:none;background:#333;transition:all .15s';
      btn.textContent='❓';
      btn.addEventListener('click', ()=>{
        if(found||btn.disabled) return;
        btn.disabled=true; clicks++;
        if(i===bombIdx) {
          found=true;
          btn.textContent='💣'; btn.style.background='#c0392b';
          container.querySelector('#fb-msg').textContent='💥 BOOM! Found it!';
          if(onProgress) onProgress(Math.max(900 - clicks*30, 100));
          onComplete({result:{found:1,total:1,clicks},timeMs:Date.now()-startTime});
        } else {
          btn.textContent=emojis[i%emojis.length]; btn.style.background='#2a2a4a';
          container.querySelector('#fb-msg').textContent=`❌ Not here... (${clicks} clicks)`;
        }
      });
      grid.appendChild(btn);
    });
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: MATH RACE — solve math problems as fast as possible
  // ──────────────────────────────────────────────────────────
  mathrace(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const { problems } = data;
    let idx = 0, score = 0;

    function renderProblem() {
      if(idx >= problems.length) {
        onComplete({result:{correct:score,total:problems.length},timeMs:Date.now()-startTime});
        return;
      }
      const p = problems[idx];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:380px;width:100%">
          <div style="font-family:var(--font-title);font-size:1.6rem;color:var(--gold)">⚡ MATH RACE</div>
          <div style="font-size:.85rem;color:var(--muted)">${idx+1} / ${problems.length}</div>
          <div style="font-family:var(--font-title);font-size:3rem;color:#fff;letter-spacing:.1em">${p.question}</div>
          <div id="mr-choices" style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;width:100%"></div>
          <div id="mr-feedback" style="font-family:var(--font-title);font-size:1.2rem;min-height:1.5rem"></div>
        </div>`;
      const choicesEl = container.querySelector('#mr-choices');
      p.choices.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.textContent = ch;
        btn.style.fontSize='1.4rem';
        btn.addEventListener('click', ()=>{
          if(ch === p.answer) {
            score++;
            btn.style.background='#2ecc71';
            container.querySelector('#mr-feedback').textContent='✅ Correct!';
          } else {
            btn.style.background='#c0392b';
            container.querySelector('#mr-feedback').textContent=`❌ It was ${p.answer}`;
          }
          if(onProgress) onProgress(Math.floor((score/problems.length)*900));
          idx++;
          setTimeout(renderProblem, 600);
        });
        choicesEl.appendChild(btn);
      });
    }
    renderProblem();
  },

  // ──────────────────────────────────────────────────────────
  // ARENA: SIMON EXTREME — extended Simon says with more colors
  // ──────────────────────────────────────────────────────────
  simonextreme(container, data, onComplete, onProgress) {
    const startTime = Date.now();
    const { sequence } = data;
    const COLORS = [
      {id:'R',label:'🔴',bg:'#e74c3c',lit:'#ff6b6b'},
      {id:'G',label:'🟢',bg:'#2ecc71',lit:'#55ff99'},
      {id:'B',label:'🔵',bg:'#3498db',lit:'#5dade2'},
      {id:'Y',label:'🟡',bg:'#f1c40f',lit:'#ffee55'},
      {id:'P',label:'🟣',bg:'#9b59b6',lit:'#c39bd3'},
      {id:'O',label:'🟠',bg:'#e67e22',lit:'#ff9f4a'},
    ];
    let step = 0, playerIdx = 0, showing = false;

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem">
        <div style="font-family:var(--font-title);font-size:1.6rem;color:var(--gold)">🎮 SIMON EXTREME</div>
        <div id="se-msg" style="font-size:.85rem;color:var(--muted)">Watch the sequence…</div>
        <div id="se-step" style="font-family:var(--font-title);font-size:1rem;color:var(--gold)">ROUND 1 / ${sequence.length}</div>
        <div id="se-btns" style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;width:min(300px,90vw)"></div>
      </div>`;

    const btnsEl = container.querySelector('#se-btns');
    COLORS.forEach(color => {
      const btn = document.createElement('button');
      btn.id = `se-${color.id}`;
      btn.textContent = color.label;
      btn.style.cssText=`font-size:2rem;padding:1rem;border-radius:8px;border:none;cursor:pointer;background:${color.bg};transition:background .1s`;
      btn.addEventListener('click', ()=>{
        if(showing) return;
        if(color.id === sequence[playerIdx]) {
          flash(color.id, true);
          playerIdx++;
          if(playerIdx > step) {
            step++;
            playerIdx = 0;
            if(onProgress) onProgress(Math.floor((step/sequence.length)*900));
            if(step >= sequence.length) {
              onComplete({result:{level:sequence.length},timeMs:Date.now()-startTime});
              return;
            }
            container.querySelector('#se-msg').textContent='✅ Correct! Watch again…';
            container.querySelector('#se-step').textContent=`ROUND ${step+1} / ${sequence.length}`;
            setTimeout(()=>playSequence(), 800);
          }
        } else {
          flash(color.id, false);
          container.querySelector('#se-msg').textContent='❌ Wrong! Watch again…';
          playerIdx = 0;
          setTimeout(()=>playSequence(), 1000);
        }
      });
      btnsEl.appendChild(btn);
    });

    function flash(id, correct) {
      const btn = container.querySelector(`#se-${id}`);
      if(!btn) return;
      const color = COLORS.find(c=>c.id===id);
      btn.style.background = correct ? '#fff' : '#ff0000';
      setTimeout(()=>{ if(btn) btn.style.background = color.bg; }, 200);
    }

    function playSequence() {
      showing = true;
      container.querySelector('#se-msg').textContent='Watch carefully…';
      let i = 0;
      const interval = setInterval(()=>{
        if(i > step) { clearInterval(interval); showing=false; container.querySelector('#se-msg').textContent='Your turn!'; return; }
        const color = COLORS.find(c=>c.id===sequence[i]);
        const btn = container.querySelector(`#se-${sequence[i]}`);
        if(btn) { btn.style.background=color.lit; setTimeout(()=>{ if(btn) btn.style.background=color.bg; }, 350); }
        i++;
      }, 600);
    }

    setTimeout(()=>playSequence(), 500);
  },

};
